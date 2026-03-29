import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

type RouteContext = { params: Promise<{ slug: string }> }

// POST /api/v1/deployments/[slug]/reactivate — clear archived_at, optionally set new expires_at
export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find the deployment (including archived ones)
  const { data: deployment, error: findError } = await admin
    .from('deployments')
    .select('id, workspace_id, archived_at')
    .eq('slug', slug)
    .single()

  if (findError || !deployment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Only owners can reactivate
  const role = await getUserRole(user.id, deployment.workspace_id)
  if (role !== 'owner') {
    return NextResponse.json(
      { error: 'Forbidden: only workspace owners can reactivate deployments' },
      { status: 403 },
    )
  }

  if (!deployment.archived_at) {
    return NextResponse.json({ error: 'Deployment is not archived' }, { status: 400 })
  }

  // Parse optional new expires_at
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // No body is fine — just reactivate without new expiry
  }

  const updates: Record<string, unknown> = { archived_at: null }

  if (body.expires_at !== undefined) {
    if (body.expires_at === null) {
      updates.expires_at = null
    } else if (typeof body.expires_at === 'string') {
      const expiryDate = new Date(body.expires_at)
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json({ error: 'Invalid expires_at date' }, { status: 400 })
      }
      if (expiryDate <= new Date()) {
        return NextResponse.json(
          { error: 'expires_at must be a future date' },
          { status: 400 },
        )
      }
      updates.expires_at = expiryDate.toISOString()
    } else {
      return NextResponse.json(
        { error: 'expires_at must be an ISO date string or null' },
        { status: 400 },
      )
    }
  } else {
    // Clear expiry by default when reactivating
    updates.expires_at = null
  }

  const { error: updateError } = await admin
    .from('deployments')
    .update(updates)
    .eq('id', deployment.id)

  if (updateError) {
    console.error('Reactivate deployment error:', updateError)
    return NextResponse.json({ error: 'Failed to reactivate deployment' }, { status: 500 })
  }

  // Audit log
  await admin.from('audit_log').insert({
    action: 'deployment.reactivate',
    actor_id: user.id,
    target_id: deployment.id,
    target_type: 'deployment',
    details: {
      slug,
      new_expires_at: updates.expires_at ?? null,
    },
  })

  return NextResponse.json({ success: true, slug })
}
