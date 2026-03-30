import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { getWorkspaceProfile } from '@/lib/limits/get-profile'
import {
  generateAccessToken,
  listAccessTokens,
  TokenError,
} from '@/lib/tokens/access-tokens'

type RouteContext = { params: Promise<{ slug: string }> }

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

// POST /api/v1/deployments/[slug]/tokens — create named access token
export async function POST(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params

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

  // Check plan allows access tokens
  const profile = await getWorkspaceProfile(resolved.deployment.workspace_id)
  if (!profile.access_tokens_allowed) {
    return NextResponse.json(
      { error: 'Access tokens are not available on your current plan' },
      { status: 403 },
    )
  }

  // Check max token count
  const existingTokens = await listAccessTokens(resolved.deployment.id)
  const activeTokens = existingTokens.filter((t) => !t.revoked_at)
  if (profile.max_access_tokens > 0 && activeTokens.length >= profile.max_access_tokens) {
    return NextResponse.json(
      { error: `Maximum of ${profile.max_access_tokens} active tokens per deployment` },
      { status: 403 },
    )
  }

  let body: { name: string; maxViews?: number; expiresAt?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.name) {
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
  }

  try {
    const options: { maxViews?: number; expiresAt?: Date } = {}
    if (body.maxViews != null) options.maxViews = body.maxViews
    if (body.expiresAt) options.expiresAt = new Date(body.expiresAt)

    const result = await generateAccessToken(
      resolved.deployment.id,
      body.name,
      user.id,
      options,
    )

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof TokenError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Token creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/v1/deployments/[slug]/tokens — list all tokens with per-token analytics
export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const tokens = await listAccessTokens(resolved.deployment.id)

    // Map tokens to include status
    const tokensWithStatus = tokens.map((t) => ({
      ...t,
      status: t.revoked_at
        ? 'revoked'
        : t.expires_at && new Date(t.expires_at) < new Date()
          ? 'expired'
          : t.max_views != null && t.view_count >= t.max_views
            ? 'exhausted'
            : 'active',
    }))

    return NextResponse.json(tokensWithStatus)
  } catch (err) {
    if (err instanceof TokenError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('List tokens error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
