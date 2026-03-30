import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { getVersionHistory } from '@/lib/versions/history'

type RouteContext = { params: Promise<{ slug: string }> }

// GET /api/v1/deployments/[slug]/versions — list versions with metadata
export async function GET(
  _req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
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

  // Resolve deployment
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, workspace_id, current_version_id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!deployment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const role = await getUserRole(user.id, deployment.workspace_id)
  if (!role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const versions = await getVersionHistory(deployment.id)

    // Annotate which version is currently live
    const annotated = versions.map((v) => ({
      ...v,
      is_live: v.id === deployment.current_version_id,
    }))

    return NextResponse.json(annotated)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch versions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
