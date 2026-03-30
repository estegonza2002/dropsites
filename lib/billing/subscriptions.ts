import { getStripeClient } from './stripe-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfileForPriceId } from './products'

export interface SubscriptionDetails {
  id: string
  status: string
  priceId: string
  profile: string | null
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

/**
 * Creates a Stripe Checkout session for a workspace upgrade.
 * Returns the Checkout URL the client should redirect to.
 */
export async function createCheckoutSession(
  workspaceId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const stripe = getStripeClient()
  const admin = createAdminClient()

  // Look up the workspace to get or create a Stripe customer
  const { data: workspace, error } = await admin
    .from('workspaces')
    .select('id, stripe_customer_id, owner_id, name')
    .eq('id', workspaceId)
    .single()

  if (error || !workspace) {
    throw new Error('Workspace not found')
  }

  let customerId = workspace.stripe_customer_id

  if (!customerId) {
    // Look up owner email for the customer record
    const { data: owner } = await admin
      .from('users')
      .select('email')
      .eq('id', workspace.owner_id)
      .single()

    const customer = await stripe.customers.create({
      email: owner?.email ?? undefined,
      metadata: {
        workspace_id: workspaceId,
        workspace_name: workspace.name,
      },
    })

    customerId = customer.id

    await admin
      .from('workspaces')
      .update({ stripe_customer_id: customerId })
      .eq('id', workspaceId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      workspace_id: workspaceId,
    },
    subscription_data: {
      metadata: {
        workspace_id: workspaceId,
      },
    },
  })

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL')
  }

  return session.url
}

/**
 * Returns the current subscription details for a workspace, or null if none.
 */
export async function getSubscription(
  workspaceId: string,
): Promise<SubscriptionDetails | null> {
  const admin = createAdminClient()

  const { data: workspace } = await admin
    .from('workspaces')
    .select('stripe_subscription_id')
    .eq('id', workspaceId)
    .single()

  if (!workspace?.stripe_subscription_id) return null

  const stripe = getStripeClient()

  try {
    const sub = await stripe.subscriptions.retrieve(
      workspace.stripe_subscription_id,
    )

    const priceId = sub.items.data[0]?.price?.id ?? ''

    return {
      id: sub.id,
      status: sub.status,
      priceId,
      profile: getProfileForPriceId(priceId),
      currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    }
  } catch {
    return null
  }
}

/**
 * Cancels the workspace subscription at the end of the current period.
 */
export async function cancelSubscription(workspaceId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: workspace } = await admin
    .from('workspaces')
    .select('stripe_subscription_id')
    .eq('id', workspaceId)
    .single()

  if (!workspace?.stripe_subscription_id) {
    throw new Error('Workspace has no active subscription')
  }

  const stripe = getStripeClient()

  await stripe.subscriptions.update(workspace.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  await admin.from('audit_log').insert({
    action: 'subscription.cancel_requested',
    actor_id: null,
    target_id: workspaceId,
    target_type: 'workspace',
    details: { subscription_id: workspace.stripe_subscription_id },
  })
}
