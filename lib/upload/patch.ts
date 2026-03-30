import { createAdminClient } from '@/lib/supabase/admin'
import { storage } from '@/lib/storage'
import { computeHash, checkBlockedHash } from './content-hash'
import { purgeDeploymentCache } from '@/lib/serving/cdn'

const BUCKET = process.env.R2_BUCKET_NAME ?? 'dropsites'

export type PatchResult = {
  versionId: string
  versionNumber: number
  filePath: string
  size: number
  hash: string
}

export class PatchError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'PatchError'
  }
}

/**
 * Detect path traversal attempts in a file path.
 */
function isPathSafe(filePath: string): boolean {
  let decoded: string
  try {
    decoded = decodeURIComponent(filePath)
  } catch {
    return false
  }

  const segments = decoded.split('/')
  for (const segment of segments) {
    if (segment === '..' || segment === '.' || segment === '') continue
    if (segment.includes('\\..') || segment.includes('..')) return false
  }

  // Reject if normalised path escapes root
  if (decoded.includes('..')) return false
  if (decoded.includes('\\')) return false
  if (decoded.includes('\0')) return false
  if (decoded.startsWith('/')) return false

  return true
}

/**
 * Patch a single file in a deployment, creating a new version.
 * All other files are copied from the previous version to the new version prefix.
 */
export async function patchDeploymentFile(
  deploymentId: string,
  filePath: string,
  newContent: Buffer,
  userId: string,
): Promise<PatchResult> {
  // Path traversal check
  if (!isPathSafe(filePath)) {
    throw new PatchError('Invalid file path: path traversal detected', 400)
  }

  // Check blocked content hash
  const newHash = computeHash(newContent)
  const blocked = await checkBlockedHash(newHash)
  if (blocked) {
    throw new PatchError('Content matches a blocked file', 422)
  }

  const admin = createAdminClient()

  // Get current deployment state
  const { data: deployment, error: depError } = await admin
    .from('deployments')
    .select('id, slug, workspace_id, current_version_id')
    .eq('id', deploymentId)
    .single()

  if (depError || !deployment) {
    throw new PatchError('Deployment not found', 404)
  }

  if (!deployment.current_version_id) {
    throw new PatchError('No version published', 404)
  }

  // Get all files from the current version
  const { data: currentFiles, error: filesError } = await admin
    .from('deployment_files')
    .select('*')
    .eq('deployment_id', deploymentId)
    .eq('version_id', deployment.current_version_id)

  if (filesError || !currentFiles) {
    throw new PatchError('Failed to read current version files', 500)
  }

  // Verify the target file exists in the current version
  const targetFile = currentFiles.find((f) => f.file_path === filePath)
  if (!targetFile) {
    throw new PatchError(`File not found in deployment: ${filePath}`, 404)
  }

  // Get current version number
  const { data: currentVersion } = await admin
    .from('deployment_versions')
    .select('version_number, storage_path')
    .eq('id', deployment.current_version_id)
    .single()

  if (!currentVersion) {
    throw new PatchError('Current version record not found', 500)
  }

  const newVersionNumber = currentVersion.version_number + 1
  const newStoragePath = `${deployment.workspace_id}/${deploymentId}/v${String(newVersionNumber).padStart(4, '0')}`

  // Upload the new file to the new version prefix
  const newMimeType = targetFile.mime_type
  const newStorageKey = `${newStoragePath}/${filePath}`
  await storage.upload(BUCKET, newStorageKey, newContent, newMimeType)

  // Copy all other files from old version to new version prefix
  const otherFiles = currentFiles.filter((f) => f.file_path !== filePath)
  await Promise.all(
    otherFiles.map(async (f) => {
      const { body, contentType } = await storage.get(BUCKET, f.storage_key)
      // Read the stream to a buffer for re-upload
      const chunks: Buffer[] = []
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      const buffer = Buffer.concat(chunks)
      const destKey = `${newStoragePath}/${f.file_path}`
      await storage.upload(BUCKET, destKey, buffer, contentType)
    }),
  )

  // Compute new total storage
  const otherFilesBytes = otherFiles.reduce((sum, f) => sum + f.size_bytes, 0)
  const totalBytes = otherFilesBytes + newContent.length

  // Create new version record
  const { data: newVersion, error: versionError } = await admin
    .from('deployment_versions')
    .insert({
      deployment_id: deploymentId,
      version_number: newVersionNumber,
      storage_path: newStoragePath,
      storage_bytes: totalBytes,
      file_count: currentFiles.length,
      source: 'api' as const,
      published_by: userId,
    })
    .select('id')
    .single()

  if (versionError || !newVersion) {
    throw new PatchError(`Failed to create version: ${versionError?.message}`, 500)
  }

  // Create file records for the new version
  const fileRecords = currentFiles.map((f) => {
    const isTarget = f.file_path === filePath
    return {
      deployment_id: deploymentId,
      version_id: newVersion.id,
      file_path: f.file_path,
      mime_type: isTarget ? newMimeType : f.mime_type,
      size_bytes: isTarget ? newContent.length : f.size_bytes,
      sha256_hash: isTarget ? newHash : f.sha256_hash,
      storage_key: `${newStoragePath}/${f.file_path}`,
    }
  })

  const { error: insertError } = await admin
    .from('deployment_files')
    .insert(fileRecords)

  if (insertError) {
    throw new PatchError(`Failed to record files: ${insertError.message}`, 500)
  }

  // Update deployment to point to new version
  await admin
    .from('deployments')
    .update({
      current_version_id: newVersion.id,
      storage_bytes: totalBytes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', deploymentId)

  // Purge CDN cache (fire-and-forget)
  purgeDeploymentCache(deployment.slug).catch(() => {})

  return {
    versionId: newVersion.id,
    versionNumber: newVersionNumber,
    filePath,
    size: newContent.length,
    hash: newHash,
  }
}
