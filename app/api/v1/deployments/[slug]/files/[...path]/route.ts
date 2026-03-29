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

// PATCH /api/v1/deployments/[slug]/files/[...path] — update single file
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

  let body: { content: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.content !== 'string') {
    return NextResponse.json({ error: 'Missing required field: content' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get the file record to find storage key
  const { data: fileRecord } = await admin
    .from('deployment_files')
    .select('id, storage_key, mime_type')
    .eq('deployment_id', deployment.id)
    .eq('version_id', deployment.current_version_id)
    .eq('file_path', filePath)
    .single()

  if (!fileRecord) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const contentBuffer = Buffer.from(body.content, 'utf-8')

  // Upload to storage (overwrite)
  try {
    await storage.upload(BUCKET, fileRecord.storage_key, contentBuffer, fileRecord.mime_type)
  } catch {
    return NextResponse.json({ error: 'Failed to write file to storage' }, { status: 500 })
  }

  // Update file size in DB
  const { createHash } = await import('crypto')
  const hash = createHash('sha256').update(contentBuffer).digest('hex')

  await admin
    .from('deployment_files')
    .update({
      size_bytes: contentBuffer.length,
      sha256_hash: hash,
    })
    .eq('id', fileRecord.id)

  // Update deployment storage_bytes
  const { data: allFiles } = await admin
    .from('deployment_files')
    .select('size_bytes')
    .eq('deployment_id', deployment.id)
    .eq('version_id', deployment.current_version_id)

  const totalBytes = (allFiles ?? []).reduce((sum, f) => sum + f.size_bytes, 0)
  await admin
    .from('deployments')
    .update({ storage_bytes: totalBytes, updated_at: new Date().toISOString() })
    .eq('id', deployment.id)

  return NextResponse.json({
    path: filePath,
    size: contentBuffer.length,
    hash,
  })
}
