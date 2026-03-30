import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient } from '@/lib/billing/stripe-client'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// POST /api/v1/billing/portal — create a Stripe Customer Portal session
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { workspaceId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { workspaceId } = body

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'Missing required field: workspaceId' },
      { status: 400 },
    )
  }

  // Verify the user is an owner of this workspace
  const admin = createAdminClient()
  const { data: member } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)
    .single()

  if (!member || member.role !== 'owner') {
    return NextResponse.json(
      { error: 'Only workspace owners can manage billing' },
      { status: 403 },
    )
  }

  // Get the workspace's Stripe customer ID
  const { data: workspace } = await admin
    .from('workspaces')
    .select('stripe_customer_id')
    .eq('id', workspaceId)
    .single()

  if (!workspace?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found for this workspace' },
      { status: 404 },
    )
  }

  try {
    const stripe = getStripeClient()
    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Portal session creation failed:', err)
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 },
    )
  }
}
