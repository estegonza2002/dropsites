import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { blockDeploymentHashes } from '@/lib/abuse/block-hashes'
import { checkAutoSuspend } from '@/lib/abuse/auto-suspend'

// GET /api/v1/admin/abuse-reports — list reports
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = request.nextUrl.searchParams.get('status') ?? 'pending'
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('abuse_reports')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  return NextResponse.json({ reports: data ?? [] })
}

// PATCH /api/v1/admin/abuse-reports — resolve a report
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { reportId?: string; action?: string; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.reportId || !['confirm', 'dismiss'].includes(body.action ?? '')) {
    return NextResponse.json({ error: 'reportId and action (confirm/dismiss) required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const newStatus = body.action === 'confirm' ? 'confirmed' : 'dismissed'

  const { data: report, error } = await admin
    .from('abuse_reports')
    .update({
      status: newStatus,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      resolution_notes: body.notes ?? null,
    })
    .eq('id', body.reportId)
    .select('*')
    .single()

  if (error || !report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  // On confirm: disable deployment and block hashes
  if (body.action === 'confirm' && report.deployment_slug) {
    const { data: deployment } = await admin
      .from('deployments')
      .select('id, owner_id')
      .eq('slug', report.deployment_slug)
      .single()

    if (deployment) {
      await admin.from('deployments').update({ is_admin_disabled: true }).eq('id', deployment.id)
      await blockDeploymentHashes(deployment.id, report.reason)
      await checkAutoSuspend(deployment.owner_id)

      await admin.from('audit_log').insert({
        action: 'abuse.confirmed',
        actor_id: user.id,
        target_id: deployment.id,
        target_type: 'deployment',
        details: { abuse_report_id: report.id, reason: report.reason },
      })
    }
  }

  return NextResponse.json({ report })
}
