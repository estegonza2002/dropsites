import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { BillingSettingsClient } from './client'

export const metadata: Metadata = {
  title: 'Billing — DropSites',
}

export default async function BillingSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the user's personal workspace (or first owned workspace)
  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1)
    .single()

  let workspacePlan = 'free'
  let workspaceId: string | null = null
  let stripeCustomerId: string | null = null

  if (membership) {
    workspaceId = membership.workspace_id
    const { data: workspace } = await admin
      .from('workspaces')
      .select('limit_profile, stripe_customer_id')
      .eq('id', membership.workspace_id)
      .single()

    if (workspace) {
      workspacePlan = workspace.limit_profile
      stripeCustomerId = workspace.stripe_customer_id
    }
  }

  return (
    <BillingSettingsClient
      currentPlan={workspacePlan as 'free' | 'pro' | 'team'}
      workspaceId={workspaceId}
      hasStripeCustomer={!!stripeCustomerId}
    />
  )
}
