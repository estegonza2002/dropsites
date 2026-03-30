import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { reviewQuarantine } from '@/lib/abuse/quarantine'

// GET /api/v1/admin/quarantine — list quarantined deployments
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Verify admin role
  const { data: userData } = await admin
    .from('users')
    .select('notification_prefs')
    .eq('id', user.id)
    .single()

  const prefs = userData?.notification_prefs as Record<string, unknown>
  if (!prefs?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: quarantined, error } = await admin
    .from('deployments')
    .select(
      'id, slug, workspace_id, owner_id, health_status, health_details, created_at, updated_at',
    )
    .eq('health_status', 'quarantined')
    .eq('is_admin_disabled', true)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Quarantine list error:', error)
    return NextResponse.json({ error: 'Failed to fetch quarantine queue' }, { status: 500 })
  }

  return NextResponse.json({ deployments: quarantined ?? [] })
}

// POST /api/v1/admin/quarantine — approve or reject a quarantined deployment
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: userData } = await admin
    .from('users')
    .select('notification_prefs')
    .eq('id', user.id)
    .single()

  const prefs = userData?.notification_prefs as Record<string, unknown>
  if (!prefs?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { deploymentId?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { deploymentId, action } = body

  if (!deploymentId) {
    return NextResponse.json({ error: 'deploymentId is required' }, { status: 400 })
  }

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json(
      { error: 'action must be "approve" or "reject"' },
      { status: 400 },
    )
  }

  // Verify the deployment is actually quarantined
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, health_status')
    .eq('id', deploymentId)
    .eq('health_status', 'quarantined')
    .single()

  if (!deployment) {
    return NextResponse.json(
      { error: 'Deployment not found or not quarantined' },
      { status: 404 },
    )
  }

  try {
    await reviewQuarantine(deploymentId, action, user.id)
    return NextResponse.json({ ok: true, action })
  } catch (err) {
    console.error('Quarantine review failed:', err)
    return NextResponse.json({ error: 'Failed to process quarantine review' }, { status: 500 })
  }
}
