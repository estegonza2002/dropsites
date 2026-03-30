import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelSubscription } from '@/lib/billing/subscriptions'

// POST /api/v1/billing/cancel — cancel subscription at period end
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
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

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

  try {
    await cancelSubscription(workspaceId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Cancel subscription failed:', err)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 },
    )
  }
}
