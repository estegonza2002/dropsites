import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import type { CorsMode } from '@/lib/serving/cors'

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * GET /api/v1/deployments/[slug]/cors
 * Returns the current CORS configuration for the deployment.
 */
export async function GET(
  _req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, workspace_id, dropsites_config')
    .eq('slug', slug)
    .single()

  if (!deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const role = await getUserRole(user.id, deployment.workspace_id)
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const config = (deployment.dropsites_config as Record<string, unknown> | null)?.cors ?? null
  return NextResponse.json({ cors: config })
}

/**
 * PUT /api/v1/deployments/[slug]/cors
 * Updates the CORS configuration. Requires publisher or owner role.
 * Body: { mode: 'none' | 'wildcard' | 'custom', origins?: string[], methods?: string[], headers?: string[] }
 */
export async function PUT(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, workspace_id, dropsites_config')
    .eq('slug', slug)
    .single()

  if (!deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const role = await getUserRole(user.id, deployment.workspace_id)
  if (!role || role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as {
    mode: CorsMode
    origins?: string[]
    methods?: string[]
    headers?: string[]
  }

  const { mode, origins = [], methods = [], headers = [] } = body

  if (!['none', 'wildcard', 'custom'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid CORS mode' }, { status: 400 })
  }

  const corsConfig =
    mode === 'none'
      ? null
      : mode === 'wildcard'
        ? { mode }
        : { mode, origins, methods, headers }

  const existing = (deployment.dropsites_config as Record<string, unknown> | null) ?? {}
  const updated = { ...existing, cors: corsConfig }

  const { error } = await admin
    .from('deployments')
    .update({ dropsites_config: updated })
    .eq('id', deployment.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cors: corsConfig })
}
