import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import {
  getVersionFiles,
  restoreVersion,
  getPreviewUrl,
} from '@/lib/versions/history'

type RouteContext = { params: Promise<{ slug: string; versionId: string }> }

async function resolveDeploymentForVersion(
  slug: string,
  versionId: string,
  userId: string,
) {
  const admin = createAdminClient()

  const { data: deployment } = await admin
    .from('deployments')
    .select('id, workspace_id, slug, current_version_id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!deployment) return null

  const role = await getUserRole(userId, deployment.workspace_id)
  if (!role) return null

  // Verify version belongs to this deployment
  const { data: version } = await admin
    .from('deployment_versions')
    .select('*')
    .eq('id', versionId)
    .eq('deployment_id', deployment.id)
    .single()

  if (!version) return null

  return { deployment, version, role }
}

// GET /api/v1/deployments/[slug]/versions/[versionId] — version detail + file list
export async function GET(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { slug, versionId } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await resolveDeploymentForVersion(slug, versionId, user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const include = req.nextUrl.searchParams.get('include')

  if (include === 'preview') {
    const previewUrl = getPreviewUrl(slug, versionId)
    return NextResponse.json({
      ...resolved.version,
      preview_url: previewUrl,
      is_live: resolved.version.id === resolved.deployment.current_version_id,
    })
  }

  try {
    const files = await getVersionFiles(versionId)
    return NextResponse.json({
      ...resolved.version,
      is_live: resolved.version.id === resolved.deployment.current_version_id,
      files,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch version'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/v1/deployments/[slug]/versions/[versionId] — restore this version as live
export async function POST(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { slug, versionId } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await resolveDeploymentForVersion(slug, versionId, user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!['owner', 'publisher'].includes(resolved.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const action = req.nextUrl.searchParams.get('action')

  if (action === 'restore') {
    try {
      const newVersion = await restoreVersion(
        resolved.deployment.id,
        versionId,
        user.id,
      )
      return NextResponse.json({
        success: true,
        new_version: newVersion,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to restore version'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action. Use ?action=restore' }, { status: 400 })
}
