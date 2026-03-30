import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import {
  getAccessToken,
  revokeAccessToken,
  TokenError,
} from '@/lib/tokens/access-tokens'

type RouteContext = { params: Promise<{ slug: string; tokenId: string }> }

async function resolveDeployment(slug: string, userId: string) {
  const admin = createAdminClient()
  const { data: deployment, error } = await admin
    .from('deployments')
    .select('id, slug, workspace_id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (error || !deployment) return null
  const role = await getUserRole(userId, deployment.workspace_id)
  if (!role) return null
  return { deployment, role }
}

// GET /api/v1/deployments/[slug]/tokens/[tokenId] — token detail with view count
export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug, tokenId } = await ctx.params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = await getAccessToken(tokenId)
  if (!token || token.deployment_id !== resolved.deployment.id) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  const status = token.revoked_at
    ? 'revoked'
    : token.expires_at && new Date(token.expires_at) < new Date()
      ? 'expired'
      : token.max_views != null && token.view_count >= token.max_views
        ? 'exhausted'
        : 'active'

  return NextResponse.json({ ...token, status })
}

// DELETE /api/v1/deployments/[slug]/tokens/[tokenId] — revoke token
export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug, tokenId } = await ctx.params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!['owner', 'publisher'].includes(resolved.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify token belongs to this deployment
  const token = await getAccessToken(tokenId)
  if (!token || token.deployment_id !== resolved.deployment.id) {
    return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  }

  if (token.revoked_at) {
    return NextResponse.json({ error: 'Token is already revoked' }, { status: 400 })
  }

  try {
    await revokeAccessToken(tokenId)
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    if (err instanceof TokenError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Revoke token error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
