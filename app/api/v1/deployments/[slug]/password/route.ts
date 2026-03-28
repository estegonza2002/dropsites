import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

type RouteContext = { params: Promise<{ slug: string }> }

const BCRYPT_COST = 12
const MIN_PASSWORD_LENGTH = 8

async function resolveDeploymentForWrite(slug: string, userId: string) {
  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, workspace_id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!deployment) return null
  const role = await getUserRole(userId, deployment.workspace_id)
  if (!role || role === 'viewer') return null
  return deployment
}

// POST /api/v1/deployments/[slug]/password — set password
export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deployment = await resolveDeploymentForWrite(slug, user.id)
  if (!deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: { password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const password = typeof body.password === 'string' ? body.password : ''
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 },
    )
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST)

  const admin = createAdminClient()
  const { error } = await admin
    .from('deployments')
    .update({ password_hash: hash })
    .eq('id', deployment.id)

  if (error) {
    console.error('Set password error:', error)
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 })
  }

  await admin.from('audit_log').insert({
    action: 'deployment.password.set',
    actor_id: user.id,
    target_id: deployment.id,
    target_type: 'deployment',
    details: { slug },
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/v1/deployments/[slug]/password — remove password
export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deployment = await resolveDeploymentForWrite(slug, user.id)
  if (!deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('deployments')
    .update({ password_hash: null })
    .eq('id', deployment.id)

  if (error) {
    console.error('Remove password error:', error)
    return NextResponse.json({ error: 'Failed to remove password' }, { status: 500 })
  }

  await admin.from('audit_log').insert({
    action: 'deployment.password.remove',
    actor_id: user.id,
    target_id: deployment.id,
    target_type: 'deployment',
    details: { slug },
  })

  return new NextResponse(null, { status: 204 })
}
