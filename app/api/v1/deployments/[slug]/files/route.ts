import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

type RouteContext = { params: Promise<{ slug: string }> }

// GET /api/v1/deployments/[slug]/files — list all files in current version
export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: deployment, error } = await admin
    .from('deployments')
    .select('id, slug, workspace_id, current_version_id, entry_path')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (error || !deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const role = await getUserRole(user.id, deployment.workspace_id)
  if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!deployment.current_version_id) {
    return NextResponse.json({ files: [], entryPath: deployment.entry_path })
  }

  const { data: files } = await admin
    .from('deployment_files')
    .select('file_path, mime_type, size_bytes')
    .eq('deployment_id', deployment.id)
    .eq('version_id', deployment.current_version_id)
    .order('file_path')

  return NextResponse.json({
    files: (files ?? []).map((f) => ({
      path: f.file_path,
      mimeType: f.mime_type,
      size: f.size_bytes,
    })),
    entryPath: deployment.entry_path,
  })
}
