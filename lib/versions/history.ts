import { createAdminClient } from '@/lib/supabase/admin'
import { storage } from '@/lib/storage'
import { purgeDeploymentCache } from '@/lib/serving/cdn'
import type { Database } from '@/lib/supabase/types'

export type VersionRecord =
  Database['public']['Tables']['deployment_versions']['Row']
export type DeploymentFile =
  Database['public']['Tables']['deployment_files']['Row']

const BUCKET = process.env.R2_BUCKET_NAME ?? 'dropsites'

/**
 * Get version history for a deployment (most recent first).
 * Returns the last N versions based on the workspace's limit profile.
 */
export async function getVersionHistory(
  deploymentId: string,
  maxVersions = 3,
): Promise<VersionRecord[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('deployment_versions')
    .select('*')
    .eq('deployment_id', deploymentId)
    .order('version_number', { ascending: false })
    .limit(maxVersions)

  if (error) {
    throw new Error(`Failed to fetch version history: ${error.message}`)
  }

  return data ?? []
}

/**
 * Get the files belonging to a specific version.
 */
export async function getVersionFiles(
  versionId: string,
): Promise<DeploymentFile[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('deployment_files')
    .select('*')
    .eq('version_id', versionId)
    .order('file_path', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch version files: ${error.message}`)
  }

  return data ?? []
}

/**
 * Restore a previous version by copying its files into a new version record
 * and making it the current live version.
 */
export async function restoreVersion(
  deploymentId: string,
  versionId: string,
  userId: string,
): Promise<VersionRecord> {
  const supabase = createAdminClient()

  // Verify the version belongs to this deployment
  const { data: sourceVersion } = await supabase
    .from('deployment_versions')
    .select('*')
    .eq('id', versionId)
    .eq('deployment_id', deploymentId)
    .single()

  if (!sourceVersion) {
    throw new Error('Version not found for this deployment')
  }

  // Get the source version files
  const sourceFiles = await getVersionFiles(versionId)
  if (sourceFiles.length === 0) {
    throw new Error('Source version has no files')
  }

  // Get deployment info
  const { data: deployment } = await supabase
    .from('deployments')
    .select('workspace_id, slug')
    .eq('id', deploymentId)
    .single()

  if (!deployment) {
    throw new Error('Deployment not found')
  }

  // Determine the next version number
  const { data: latestVersion } = await supabase
    .from('deployment_versions')
    .select('version_number')
    .eq('deployment_id', deploymentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const nextVersionNumber = (latestVersion?.version_number ?? 0) + 1
  const storagePath = `${deployment.workspace_id}/${deploymentId}/v${String(nextVersionNumber).padStart(4, '0')}`

  // Copy files to new storage path
  await Promise.all(
    sourceFiles.map(async (file) => {
      const { body } = await storage.get(BUCKET, file.storage_key)
      const newKey = `${storagePath}/${file.file_path}`
      await storage.upload(BUCKET, newKey, body, file.mime_type)
    }),
  )

  // Create new version record
  const totalBytes = sourceFiles.reduce((sum, f) => sum + f.size_bytes, 0)

  const { data: newVersion, error: versionError } = await supabase
    .from('deployment_versions')
    .insert({
      deployment_id: deploymentId,
      version_number: nextVersionNumber,
      storage_path: storagePath,
      storage_bytes: totalBytes,
      file_count: sourceFiles.length,
      source: 'upload' as const,
      published_by: userId,
    })
    .select('*')
    .single()

  if (versionError || !newVersion) {
    throw new Error(
      `Failed to create restored version: ${versionError?.message}`,
    )
  }

  // Create new file records
  const newFileRecords = sourceFiles.map((f) => ({
    deployment_id: deploymentId,
    version_id: newVersion.id,
    file_path: f.file_path,
    mime_type: f.mime_type,
    size_bytes: f.size_bytes,
    sha256_hash: f.sha256_hash,
    storage_key: `${storagePath}/${f.file_path}`,
  }))

  const { error: filesError } = await supabase
    .from('deployment_files')
    .insert(newFileRecords)

  if (filesError) {
    throw new Error(`Failed to record restored files: ${filesError.message}`)
  }

  // Update deployment to point to the new version
  await supabase
    .from('deployments')
    .update({
      current_version_id: newVersion.id,
      storage_bytes: totalBytes,
      file_count: sourceFiles.length,
    })
    .eq('id', deploymentId)

  // Audit log
  await supabase.from('audit_log').insert({
    action: 'deployment.version_restored',
    actor_id: userId,
    target_id: deploymentId,
    target_type: 'deployment',
    details: {
      slug: deployment.slug,
      restored_from_version: sourceVersion.version_number,
      new_version: nextVersionNumber,
    },
  })

  // Purge CDN cache
  purgeDeploymentCache(deployment.slug).catch(() => {
    // Non-fatal
  })

  return newVersion
}

/**
 * Generate a temporary preview URL for a specific version.
 * The preview URL encodes the version ID and is valid for 1 hour.
 */
export function getPreviewUrl(
  deploymentSlug: string,
  versionId: string,
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const expiresAt = Date.now() + 60 * 60 * 1000 // 1 hour
  // Simple preview token: base64(versionId:expiresAt)
  const token = Buffer.from(`${versionId}:${expiresAt}`).toString('base64url')
  return `${appUrl}/_serve/preview/${deploymentSlug}?v=${token}`
}

/**
 * Parse and validate a preview token.
 * Returns the versionId if valid, null if expired or invalid.
 */
export function parsePreviewToken(
  token: string,
): { versionId: string; expiresAt: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const [versionId, expiresAtStr] = decoded.split(':')
    const expiresAt = parseInt(expiresAtStr, 10)

    if (!versionId || isNaN(expiresAt)) return null
    if (Date.now() > expiresAt) return null

    return { versionId, expiresAt }
  } catch {
    return null
  }
}
