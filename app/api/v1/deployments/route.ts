import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processUpload, UploadError } from '@/lib/upload/process'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError, apiPaginated } from '@/lib/api/response'
import { parsePagination, buildPaginatedMeta } from '@/lib/api/pagination'

// POST /api/v1/deployments — upload a new deployment
export const POST = withApiAuth(async (request, _ctx, auth) => {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return apiError('Invalid multipart form data', 'invalid_body', 400)
  }

  const fileEntry = formData.get('file')
  if (!fileEntry || !(fileEntry instanceof File)) {
    return apiError('Missing required field: file', 'missing_field', 400)
  }

  const slugEntry = formData.get('slug')
  const slug =
    typeof slugEntry === 'string' && slugEntry.trim() ? slugEntry.trim() : undefined

  const buffer = Buffer.from(await fileEntry.arrayBuffer())

  // Fetch workspace data_region for regional storage routing
  const adminClient = createAdminClient()
  const { data: ws } = await adminClient
    .from('workspaces')
    .select('data_region')
    .eq('id', auth.workspaceId)
    .single()

  try {
    const result = await processUpload({
      file: buffer,
      filename: fileEntry.name,
      slug,
      workspaceId: auth.workspaceId,
      userId: auth.userId,
      dataRegion: ws?.data_region ?? undefined,
    })

    return apiSuccess(result, 201)
  } catch (err) {
    if (err instanceof UploadError) {
      return apiError(err.message, 'upload_error', err.status)
    }
    console.error('Upload error:', err)
    return apiError('Internal server error', 'internal_error', 500)
  }
})

// GET /api/v1/deployments — list deployments
export const GET = withApiAuth(async (request: NextRequest, _ctx, auth) => {
  const { searchParams } = new URL(request.url)
  const { page, perPage, offset } = parsePagination(searchParams)

  // Query params
  const q = searchParams.get('q')?.trim() || undefined
  const status = searchParams.get('status') // active | archived | disabled
  const sort = searchParams.get('sort') ?? 'created' // created | updated | name

  const admin = createAdminClient()

  // Get all user's accepted workspaces
  const { data: memberships } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', auth.userId)
    .not('accepted_at', 'is', null)

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)

  if (workspaceIds.length === 0) {
    return apiPaginated([], buildPaginatedMeta(page, perPage, 0))
  }

  let query = admin
    .from('deployments')
    .select(
      'id, slug, namespace, entry_path, file_count, storage_bytes, is_disabled, allow_indexing, total_views, created_at, updated_at, expires_at, archived_at',
      { count: 'exact' },
    )
    .in('workspace_id', workspaceIds)

  // Status filter
  if (status === 'archived') {
    query = query.not('archived_at', 'is', null)
  } else if (status === 'disabled') {
    query = query.is('archived_at', null).eq('is_disabled', true)
  } else {
    // Default: active (not archived)
    query = query.is('archived_at', null)
  }

  // Search by slug
  if (q) {
    query = query.ilike('slug', `%${q}%`)
  }

  // Sort
  const sortMap: Record<string, string> = {
    created: 'created_at',
    updated: 'updated_at',
    name: 'slug',
  }
  const sortCol = sortMap[sort] ?? 'created_at'
  query = query.order(sortCol, { ascending: sort === 'name' })

  // Paginate
  query = query.range(offset, offset + perPage - 1)

  const { data: deployments, error, count } = await query

  if (error) {
    console.error('List deployments error:', error)
    return apiError('Internal server error', 'internal_error', 500)
  }

  return apiPaginated(
    deployments ?? [],
    buildPaginatedMeta(page, perPage, count ?? 0),
  )
})
