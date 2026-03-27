import { validateFile } from './validate'
import { extractZip } from './zip'
import { detectEntryPoint } from './entry-point'
import { computeHash, checkBlockedHash } from './content-hash'
import { getMimeType } from './mime'
import { generateSlug } from '@/lib/slug/generate'
import { validateSlug, checkSlugAvailability } from '@/lib/slug/validate'
import { storage } from '@/lib/storage'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkDeploymentLimits } from '@/lib/limits/check'

export type DeploymentResult = {
  deploymentId: string
  slug: string
  url: string
  fileCount: number
  storageBytes: number
}

type UploadInput = {
  file: Buffer
  filename: string
  slug?: string
  workspaceId: string
  userId: string
}

type FileToStore = {
  path: string
  content: Buffer
  mimeType: string
  hash: string
  size: number
}

const BUCKET = process.env.R2_BUCKET_NAME ?? 'dropsites'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'UploadError'
  }
}

export async function processUpload(input: UploadInput): Promise<DeploymentResult> {
  const { file, filename, workspaceId, userId } = input

  // --- Step 1: Determine files to process ---
  let filesToStore: FileToStore[]
  let entryPath: string

  const isZip =
    filename.toLowerCase().endsWith('.zip') ||
    file.slice(0, 4).toString('hex') === '504b0304'

  if (isZip) {
    const extracted = await extractZip(file)

    for (const f of extracted) {
      const result = validateFile({ name: f.path, size: f.size, buffer: f.content })
      if (!result.valid) {
        throw new UploadError(`Invalid file in ZIP — ${f.path}: ${result.errors[0]}`)
      }
    }

    const entry = detectEntryPoint(extracted)
    entryPath = entry.entryPath

    filesToStore = extracted.map((f) => ({
      path: f.path,
      content: f.content,
      mimeType: getMimeType(f.path),
      hash: computeHash(f.content),
      size: f.size,
    }))
  } else {
    // Single file upload
    const result = validateFile({ name: filename, size: file.length, buffer: file })
    if (!result.valid) {
      throw new UploadError(result.errors[0])
    }

    const normalizedName = filename.toLowerCase()
    entryPath = normalizedName

    filesToStore = [
      {
        path: normalizedName,
        content: file,
        mimeType: getMimeType(filename),
        hash: computeHash(file),
        size: file.length,
      },
    ]
  }

  // --- Step 2: Check deployment limits ---
  const totalUploadBytes = isZip
    ? filesToStore.reduce((sum, f) => sum + f.size, 0)
    : filesToStore[0]?.size ?? 0

  const limitCheck = await checkDeploymentLimits(workspaceId, totalUploadBytes, filesToStore.length)
  if (!limitCheck.allowed) {
    throw new UploadError(limitCheck.reason ?? 'Upload rejected: plan limit reached', 403)
  }

  // --- Step 3: Check blocked hashes ---
  for (const f of filesToStore) {
    const blocked = await checkBlockedHash(f.hash)
    if (blocked) {
      throw new UploadError('Upload rejected: content matches a blocked file', 422)
    }
  }

  // --- Step 4: Resolve slug ---
  let resolvedSlug: string

  if (input.slug) {
    const validation = validateSlug(input.slug)
    if (!validation.valid) {
      throw new UploadError(`Invalid slug: ${validation.errors[0]}`)
    }
    const available = await checkSlugAvailability(input.slug)
    if (!available) {
      throw new UploadError('Slug is already taken', 409)
    }
    resolvedSlug = input.slug
  } else {
    // Generate a unique slug (retry a few times on collision)
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateSlug()
      const available = await checkSlugAvailability(candidate)
      if (available) {
        resolvedSlug = candidate
        break
      }
    }
    if (!resolvedSlug!) {
      throw new UploadError('Could not generate a unique slug, please try again', 500)
    }
  }

  // --- Step 4: Create deployment record ---
  const supabase = createAdminClient()

  const totalBytes = filesToStore.reduce((sum, f) => sum + f.size, 0)

  const { data: deployment, error: deploymentError } = await supabase
    .from('deployments')
    .insert({
      slug: resolvedSlug,
      workspace_id: workspaceId,
      owner_id: userId,
      entry_path: entryPath,
      storage_bytes: totalBytes,
      file_count: filesToStore.length,
    })
    .select('id')
    .single()

  if (deploymentError || !deployment) {
    throw new UploadError(`Failed to create deployment: ${deploymentError?.message}`, 500)
  }

  const deploymentId = deployment.id
  const storagePath = `${workspaceId}/${deploymentId}/v0001`

  // --- Step 5: Create deployment_version record ---
  const { data: version, error: versionError } = await supabase
    .from('deployment_versions')
    .insert({
      deployment_id: deploymentId,
      version_number: 1,
      storage_path: storagePath,
      storage_bytes: totalBytes,
      file_count: filesToStore.length,
      source: 'upload',
      published_by: userId,
    })
    .select('id')
    .single()

  if (versionError || !version) {
    throw new UploadError(`Failed to create version: ${versionError?.message}`, 500)
  }

  // --- Step 6: Upload files to storage ---
  await Promise.all(
    filesToStore.map((f) =>
      storage.upload(BUCKET, `${storagePath}/${f.path}`, f.content, f.mimeType),
    ),
  )

  // --- Step 7: Create deployment_files records ---
  const fileRecords = filesToStore.map((f) => ({
    deployment_id: deploymentId,
    version_id: version.id,
    file_path: f.path,
    mime_type: f.mimeType,
    size_bytes: f.size,
    sha256_hash: f.hash,
    storage_key: `${storagePath}/${f.path}`,
  }))

  const { error: filesError } = await supabase
    .from('deployment_files')
    .insert(fileRecords)

  if (filesError) {
    throw new UploadError(`Failed to record files: ${filesError.message}`, 500)
  }

  // --- Step 8: Set current_version_id on deployment ---
  await supabase
    .from('deployments')
    .update({ current_version_id: version.id })
    .eq('id', deploymentId)

  return {
    deploymentId,
    slug: resolvedSlug,
    url: `${APP_URL}/s/${resolvedSlug}`,
    fileCount: filesToStore.length,
    storageBytes: totalBytes,
  }
}
