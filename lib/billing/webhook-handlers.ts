import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfileForPriceId } from './products'
import { handlePaymentFailure, handlePaymentRecovery } from './dunning'

/**
 * Handle checkout.session.completed — first-time subscription creation.
 * Links the Stripe subscription to the workspace and assigns the limit profile.
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const workspaceId = session.metadata?.workspace_id
  if (!workspaceId) {
    console.error('checkout.session.completed: missing workspace_id in metadata')
    return
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id

  if (!subscriptionId) {
    console.error('checkout.session.completed: no subscription ID')
    return
  }

  const admin = createAdminClient()

  await admin
    .from('workspaces')
    .update({
      stripe_customer_id:
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null,
      stripe_subscription_id: subscriptionId,
    })
    .eq('id', workspaceId)

  await admin.from('audit_log').insert({
    action: 'subscription.created',
    actor_id: null,
    target_id: workspaceId,
    target_type: 'workspace',
    details: {
      subscription_id: subscriptionId,
      checkout_session_id: session.id,
    },
  })
}

/**
 * Handle customer.subscription.updated — plan changes, renewals, cancellation toggling.
 * Syncs the workspace limit_profile based on the current price.
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const workspaceId = subscription.metadata?.workspace_id
  if (!workspaceId) {
    console.error('subscription.updated: missing workspace_id in metadata')
    return
  }

  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) return

  const profile = getProfileForPriceId(priceId)
  if (!profile) {
    console.error(`subscription.updated: unknown price ${priceId}`)
    return
  }

  const admin = createAdminClient()

  // Determine the correct limit profile name based on subscription status
  const limitProfile =
    subscription.status === 'active' || subscription.status === 'trialing'
      ? profile
      : 'free'

  await admin
    .from('workspaces')
    .update({
      limit_profile: limitProfile,
      stripe_subscription_id: subscription.id,
    })
    .eq('id', workspaceId)

  await admin.from('audit_log').insert({
    action: 'subscription.updated',
    actor_id: null,
    target_id: workspaceId,
    target_type: 'workspace',
    details: {
      subscription_id: subscription.id,
      status: subscription.status,
      price_id: priceId,
      limit_profile: limitProfile,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
  })
}

/**
 * Handle customer.subscription.deleted — subscription fully cancelled.
 * Downgrades the workspace to the free profile.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const workspaceId = subscription.metadata?.workspace_id
  if (!workspaceId) {
    console.error('subscription.deleted: missing workspace_id in metadata')
    return
  }

  const admin = createAdminClient()

  await admin
    .from('workspaces')
    .update({
      limit_profile: 'free',
      stripe_subscription_id: null,
    })
    .eq('id', workspaceId)

  await admin.from('audit_log').insert({
    action: 'subscription.deleted',
    actor_id: null,
    target_id: workspaceId,
    target_type: 'workspace',
    details: {
      subscription_id: subscription.id,
    },
  })
}

/**
 * Handle invoice.payment_succeeded — record successful payment.
 */
export async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id

  if (!subscriptionId) return

  const admin = createAdminClient()

  // Find the workspace by subscription ID
  const { data: workspace } = await admin
    .from('workspaces')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!workspace) return

  await admin.from('audit_log').insert({
    action: 'invoice.payment_succeeded',
    actor_id: null,
    target_id: workspace.id,
    target_type: 'workspace',
    details: {
      invoice_id: invoice.id,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      subscription_id: subscriptionId,
    },
  })
}

/**
 * Handle invoice.payment_failed — record failed payment attempt and start dunning.
 * The subscription status update (to past_due) will be handled by
 * handleSubscriptionUpdated when Stripe fires that event.
 */
export async function handlePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id

  if (!subscriptionId) return

  const admin = createAdminClient()

  const { data: workspace } = await admin
    .from('workspaces')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!workspace) return

  await admin.from('audit_log').insert({
    action: 'invoice.payment_failed',
    actor_id: null,
    target_id: workspace.id,
    target_type: 'workspace',
    details: {
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
      subscription_id: subscriptionId,
    },
  })

  // Start dunning grace period on first failure
  try {
    await handlePaymentFailure(workspace.id)
  } catch (err) {
    console.error(`Dunning grace period failed for workspace ${workspace.id}:`, err)
  }
}

/**
 * Handle invoice.payment_succeeded — record successful payment and clear any dunning.
 * Called on successful renewal — clears grace period if one was active.
 */
export async function handlePaymentSucceededWithRecovery(
  invoice: Stripe.Invoice,
): Promise<void> {
  await handlePaymentSucceeded(invoice)

  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id

  if (!subscriptionId) return

  const admin = createAdminClient()

  const { data: workspace } = await admin
    .from('workspaces')
    .select('id, grace_period_ends_at')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!workspace || !workspace.grace_period_ends_at) return

  // Clear dunning grace period on payment recovery
  try {
    await handlePaymentRecovery(workspace.id)
  } catch (err) {
    console.error(`Payment recovery failed for workspace ${workspace.id}:`, err)
  }
}
