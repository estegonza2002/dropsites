import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCheckoutSession } from '@/lib/billing/subscriptions'
import { getStripePriceId, type BillingInterval } from '@/lib/billing/products'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// POST /api/v1/billing/checkout — create a Stripe Checkout session
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { workspaceId?: string; plan?: string; interval?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { workspaceId, plan, interval } = body

  if (!workspaceId || !plan || !interval) {
    return NextResponse.json(
      { error: 'Missing required fields: workspaceId, plan, interval' },
      { status: 400 },
    )
  }

  if (interval !== 'month' && interval !== 'year') {
    return NextResponse.json(
      { error: 'Interval must be "month" or "year"' },
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

  let priceId: string
  try {
    priceId = getStripePriceId(plan, interval as BillingInterval)
  } catch {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  try {
    const url = await createCheckoutSession(
      workspaceId,
      priceId,
      `${APP_URL}/dashboard/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      `${APP_URL}/dashboard/settings/billing?cancelled=true`,
    )

    return NextResponse.json({ url })
  } catch (err) {
    console.error('Checkout session creation failed:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 },
    )
  }
}
