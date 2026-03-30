import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { storage } from '@/lib/storage'
import { Readable } from 'stream'

const BUCKET = process.env.R2_BUCKET_NAME ?? 'dropsites'

type RouteContext = { params: Promise<{ slug: string; path: string[] }> }

async function resolveDeployment(slug: string, userId: string) {
  const admin = createAdminClient()
  const { data: deployment, error } = await admin
    .from('deployments')
    .select('id, slug, workspace_id, current_version_id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (error || !deployment) return null
  const role = await getUserRole(userId, deployment.workspace_id)
  if (!role) return null
  return { deployment, role }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

// GET /api/v1/deployments/[slug]/files/[...path] — get file content
export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug, path: pathSegments } = await ctx.params
  const filePath = pathSegments.join('/')

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { deployment } = resolved

  if (!deployment.current_version_id) {
    return NextResponse.json({ error: 'No version published' }, { status: 404 })
  }

  // Find the file record
  const admin = createAdminClient()
  const { data: fileRecord } = await admin
    .from('deployment_files')
    .select('storage_key, mime_type, size_bytes')
    .eq('deployment_id', deployment.id)
    .eq('version_id', deployment.current_version_id)
    .eq('file_path', filePath)
    .single()

  if (!fileRecord) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  try {
    const { body, contentType } = await storage.get(BUCKET, fileRecord.storage_key)
    const buffer = await streamToBuffer(body)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch file from storage' }, { status: 500 })
  }
}

// PATCH /api/v1/deployments/[slug]/files/[...path] — update single file (creates new version)
export async function PATCH(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug, path: pathSegments } = await ctx.params
  const filePath = pathSegments.join('/')

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolved = await resolveDeployment(slug, user.id)
  if (!resolved) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!['owner', 'publisher'].includes(resolved.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { deployment } = resolved

  if (!deployment.current_version_id) {
    return NextResponse.json({ error: 'No version published' }, { status: 404 })
  }

  // Accept either multipart/form-data or JSON body
  let contentBuffer: Buffer

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 })
    }
    const fileEntry = formData.get('file')
    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json({ error: 'Missing required field: file' }, { status: 400 })
    }
    contentBuffer = Buffer.from(await fileEntry.arrayBuffer())
  } else {
    let body: { content: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Missing required field: content' }, { status: 400 })
    }
    contentBuffer = Buffer.from(body.content, 'utf-8')
  }

  try {
    const { patchDeploymentFile } = await import('@/lib/upload/patch')
    const result = await patchDeploymentFile(
      deployment.id,
      filePath,
      contentBuffer,
      user.id,
    )
    return NextResponse.json({
      path: result.filePath,
      size: result.size,
      hash: result.hash,
      version_id: result.versionId,
      version_number: result.versionNumber,
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
      const patchErr = err as { status: number; message: string }
      return NextResponse.json({ error: patchErr.message }, { status: patchErr.status })
    }
    console.error('PATCH file error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
