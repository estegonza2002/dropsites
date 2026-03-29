import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { extendLock } from '@/lib/editor/lock'

type RouteContext = { params: Promise<{ slug: string }> }

// POST /api/v1/deployments/[slug]/lock/heartbeat — extend lock by 30 minutes
export async function POST(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, workspace_id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const role = await getUserRole(user.id, deployment.workspace_id)
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const lock = await extendLock(deployment.id, user.id)
  if (!lock) {
    return NextResponse.json(
      { error: 'No active lock found for this user' },
      { status: 404 },
    )
  }

  return NextResponse.json({ ok: true, expires_at: lock.expires_at })
}
