import { Readable } from 'stream'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { generateSlug } from '@/lib/slug/generate'
import { checkSlugAvailability } from '@/lib/slug/validate'
import { storage } from '@/lib/storage'

async function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array))
  }
  return Buffer.concat(chunks)
}

type RouteContext = { params: Promise<{ slug: string }> }

const BUCKET = process.env.R2_BUCKET_NAME ?? 'dropsites'

// POST /api/v1/deployments/[slug]/duplicate — duplicate a deployment
export async function POST(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { slug } = await ctx.params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: source } = await admin
    .from('deployments')
    .select('id, slug, namespace, workspace_id, entry_path, file_count, storage_bytes, current_version_id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const role = await getUserRole(user.id, source.workspace_id)
  if (!role || role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Generate new slug for the copy
  let newSlug: string | undefined
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${slug}-copy` + (attempt > 0 ? `-${attempt}` : '')
    const available = await checkSlugAvailability(candidate)
    if (available) {
      newSlug = candidate
      break
    }
  }
  if (!newSlug) {
    // Fall back to fully random slug
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateSlug()
      const available = await checkSlugAvailability(candidate)
      if (available) {
        newSlug = candidate
        break
      }
    }
  }
  if (!newSlug) {
    return NextResponse.json({ error: 'Could not generate a unique slug' }, { status: 500 })
  }

  // Get source version files
  const { data: sourceFiles } = await admin
    .from('deployment_files')
    .select('file_path, mime_type, size_bytes, sha256_hash, storage_key')
    .eq('deployment_id', source.id)

  if (!sourceFiles || sourceFiles.length === 0) {
    return NextResponse.json({ error: 'Source deployment has no files' }, { status: 422 })
  }

  // Create new deployment record
  const { data: newDeployment, error: deployError } = await admin
    .from('deployments')
    .insert({
      slug: newSlug,
      namespace: source.namespace,
      workspace_id: source.workspace_id,
      owner_id: user.id,
      entry_path: source.entry_path,
      storage_bytes: source.storage_bytes,
      file_count: source.file_count,
    })
    .select('id')
    .single()

  if (deployError || !newDeployment) {
    console.error('Duplicate deployment error:', deployError)
    return NextResponse.json({ error: 'Failed to create duplicate deployment' }, { status: 500 })
  }

  const newDeploymentId = newDeployment.id
  const newStoragePath = `${source.workspace_id}/${newDeploymentId}/v0001`

  // Create version record
  const { data: newVersion, error: versionError } = await admin
    .from('deployment_versions')
    .insert({
      deployment_id: newDeploymentId,
      version_number: 1,
      storage_path: newStoragePath,
      storage_bytes: source.storage_bytes,
      file_count: source.file_count,
      source: 'upload',
      published_by: user.id,
    })
    .select('id')
    .single()

  if (versionError || !newVersion) {
    // Roll back deployment
    await admin.from('deployments').update({ archived_at: new Date().toISOString() }).eq('id', newDeploymentId)
    return NextResponse.json({ error: 'Failed to create version record' }, { status: 500 })
  }

  // Copy files in storage
  try {
    await Promise.all(
      sourceFiles.map(async (f) => {
        const newKey = `${newStoragePath}/${f.file_path}`
        const { body } = await storage.get(BUCKET, f.storage_key)
        const content = await streamToBuffer(body)
        await storage.upload(BUCKET, newKey, content, f.mime_type)
        return newKey
      }),
    )
  } catch (err) {
    console.error('File copy error:', err)
    await admin.from('deployments').update({ archived_at: new Date().toISOString() }).eq('id', newDeploymentId)
    return NextResponse.json({ error: 'Failed to copy deployment files' }, { status: 500 })
  }

  // Create file records
  const newFileRecords = sourceFiles.map((f) => ({
    deployment_id: newDeploymentId,
    version_id: newVersion.id,
    file_path: f.file_path,
    mime_type: f.mime_type,
    size_bytes: f.size_bytes,
    sha256_hash: f.sha256_hash,
    storage_key: `${newStoragePath}/${f.file_path}`,
  }))

  await admin.from('deployment_files').insert(newFileRecords)

  // Set current version
  await admin.from('deployments').update({ current_version_id: newVersion.id }).eq('id', newDeploymentId)

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json(
    { slug: newSlug, url: `${APP_URL}/s/${newSlug}` },
    { status: 201 },
  )
}
