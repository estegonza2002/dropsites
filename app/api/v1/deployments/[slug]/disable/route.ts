import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

type RouteContext = { params: Promise<{ slug: string }> }

async function resolveDeploymentForWrite(slug: string, userId: string) {
  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, workspace_id, is_disabled')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!deployment) return null
  const role = await getUserRole(userId, deployment.workspace_id)
  if (!role || role === 'viewer') return null
  return deployment
}

// POST /api/v1/deployments/[slug]/disable — disable a deployment
export async function POST(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deployment = await resolveDeploymentForWrite(slug, user.id)
  if (!deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (deployment.is_disabled) {
    return NextResponse.json({ error: 'Deployment is already disabled' }, { status: 409 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('deployments')
    .update({ is_disabled: true })
    .eq('id', deployment.id)

  if (error) {
    console.error('Disable deployment error:', error)
    return NextResponse.json({ error: 'Failed to disable deployment' }, { status: 500 })
  }

  await admin.from('audit_log').insert({
    action: 'deployment.disable',
    actor_id: user.id,
    target_id: deployment.id,
    target_type: 'deployment',
    details: { slug },
  })

  return NextResponse.json({ ok: true, is_disabled: true })
}

// DELETE /api/v1/deployments/[slug]/disable — reactivate a deployment
export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deployment = await resolveDeploymentForWrite(slug, user.id)
  if (!deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!deployment.is_disabled) {
    return NextResponse.json({ error: 'Deployment is not disabled' }, { status: 409 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('deployments')
    .update({ is_disabled: false })
    .eq('id', deployment.id)

  if (error) {
    console.error('Reactivate deployment error:', error)
    return NextResponse.json({ error: 'Failed to reactivate deployment' }, { status: 500 })
  }

  await admin.from('audit_log').insert({
    action: 'deployment.reactivate',
    actor_id: user.id,
    target_id: deployment.id,
    target_type: 'deployment',
    details: { slug },
  })

  return NextResponse.json({ ok: true, is_disabled: false })
}
