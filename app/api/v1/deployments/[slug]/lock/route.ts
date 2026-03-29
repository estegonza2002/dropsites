import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { acquireLock, releaseLock, checkLock } from '@/lib/editor/lock'

type RouteContext = { params: Promise<{ slug: string }> }

async function resolveDeployment(slug: string, userId: string) {
  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, workspace_id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!deployment) return null
  const role = await getUserRole(userId, deployment.workspace_id)
  if (!role) return null
  return { deployment, role }
}

// GET /api/v1/deployments/[slug]/lock — check current lock status
export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const status = await checkLock(resolved.deployment.id)

  if (status.locked) {
    // Resolve the lock holder's email for display
    const admin = createAdminClient()
    const { data: lockUser } = await admin
      .from('users')
      .select('email, display_name')
      .eq('id', status.locked_by)
      .single()

    return NextResponse.json({
      locked: true,
      locked_by: status.locked_by,
      locked_by_email: lockUser?.email ?? null,
      locked_by_name: lockUser?.display_name ?? null,
      is_own_lock: status.locked_by === user.id,
      expires_at: status.lock.expires_at,
    })
  }

  return NextResponse.json({ locked: false })
}

// POST /api/v1/deployments/[slug]/lock — acquire lock
export async function POST(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Viewers cannot acquire locks
  if (resolved.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden: viewers cannot edit' }, { status: 403 })
  }

  const result = await acquireLock(resolved.deployment.id, user.id)

  if (!result.acquired) {
    const admin = createAdminClient()
    const { data: lockUser } = await admin
      .from('users')
      .select('email, display_name')
      .eq('id', result.locked_by)
      .single()

    return NextResponse.json({
      acquired: false,
      locked_by: result.locked_by,
      locked_by_email: lockUser?.email ?? null,
      locked_by_name: lockUser?.display_name ?? null,
      expires_at: result.lock.expires_at,
    }, { status: 409 })
  }

  return NextResponse.json({
    acquired: true,
    lock: result.lock,
  })
}

// DELETE /api/v1/deployments/[slug]/lock — release lock
export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const released = await releaseLock(resolved.deployment.id, user.id)
  if (!released) {
    return NextResponse.json({ error: 'Failed to release lock' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
