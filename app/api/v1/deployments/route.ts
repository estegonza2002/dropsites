import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processUpload, UploadError } from '@/lib/upload/process'

// POST /api/v1/deployments — upload a new deployment
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
  }

  const fileEntry = formData.get('file')
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'Missing required field: file' }, { status: 400 })
  }

  const slugEntry = formData.get('slug')
  const slug = typeof slugEntry === 'string' && slugEntry.trim() ? slugEntry.trim() : undefined

  // Resolve workspace — use first workspace the user owns (accepted memberships only)
  const admin = createAdminClient()
  const { data: membership, error: membershipError } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .not('accepted_at', 'is', null)
    .limit(1)
    .single()

  if (membershipError || !membership) {
    return NextResponse.json({ error: 'No workspace found for user' }, { status: 403 })
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer())

  try {
    const result = await processUpload({
      file: buffer,
      filename: fileEntry.name,
      slug,
      workspaceId: membership.workspace_id,
      userId: user.id,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/v1/deployments — list deployments for the authenticated user's workspace
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const offset = (page - 1) * limit

  const admin = createAdminClient()

  // Get user's workspaces (only accepted memberships)
  const { data: memberships } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .not('accepted_at', 'is', null)

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)

  if (workspaceIds.length === 0) {
    return NextResponse.json({ deployments: [], total: 0, page, limit })
  }

  const { data: deployments, error, count } = await admin
    .from('deployments')
    .select('id, slug, entry_path, file_count, storage_bytes, created_at, updated_at, expires_at, is_disabled', {
      count: 'exact',
    })
    .in('workspace_id', workspaceIds)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('List deployments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({
    deployments: deployments ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}
