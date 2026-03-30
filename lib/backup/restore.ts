import { createAdminClient } from '@/lib/supabase/admin'
import { storage } from '@/lib/storage'
import { computeHash } from './daily-backup'

const PRIMARY_BUCKET = process.env.R2_BUCKET_NAME ?? 'dropsites-deployments'
const BACKUP_BUCKET = process.env.R2_BACKUP_BUCKET_NAME ?? 'dropsites-backups'

export interface RestoreResult {
  success: boolean
  filesRestored: number
  filesFailed: number
  bytesRestored: number
  integrityErrors: string[]
  errors: string[]
  backupDate: string
  startedAt: string
  completedAt: string
}

/**
 * Restores deployment files from a backup date to the primary bucket.
 * Verifies integrity of each file via SHA-256 hash comparison against
 * the deployment_files table.
 *
 * @param backupDate - The backup date to restore from, in YYYY-MM-DD format
 * @param deploymentIds - Optional list of specific deployment IDs to restore.
 *                        If omitted, restores all deployments from that date.
 */
export async function restoreFromBackup(
  backupDate: string,
  deploymentIds?: string[],
): Promise<RestoreResult> {
  const startedAt = new Date().toISOString()
  const errors: string[] = []
  const integrityErrors: string[] = []
  let filesRestored = 0
  let filesFailed = 0
  let bytesRestored = 0

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(backupDate)) {
    return {
      success: false,
      filesRestored: 0,
      filesFailed: 0,
      bytesRestored: 0,
      integrityErrors: [],
      errors: ['Invalid backup date format. Expected YYYY-MM-DD.'],
      backupDate,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }

  const admin = createAdminClient()

  try {
    // List all files from the backup date prefix
    const backupPrefix = `${backupDate}/`
    const backupKeys = await storage.list(BACKUP_BUCKET, backupPrefix)

    if (backupKeys.length === 0) {
      return {
        success: false,
        filesRestored: 0,
        filesFailed: 0,
        bytesRestored: 0,
        integrityErrors: [],
        errors: [`No backup found for date ${backupDate}`],
        backupDate,
        startedAt,
        completedAt: new Date().toISOString(),
      }
    }

    // Filter to specific deployments if provided
    const filteredKeys = deploymentIds
      ? backupKeys.filter((key) => {
          // Key format: YYYY-MM-DD/workspace_id/deployment_id/file_path
          const parts = key.replace(backupPrefix, '').split('/')
          const deploymentId = parts[1] // workspace_id/deployment_id/...
          return deploymentIds.includes(deploymentId)
        })
      : backupKeys

    // Build a hash lookup from the deployment_files table
    const hashLookup = new Map<string, string>()
    const { data: files } = await admin
      .from('deployment_files')
      .select('storage_key, sha256_hash')

    if (files) {
      for (const f of files) {
        hashLookup.set(f.storage_key, f.sha256_hash)
      }
    }

    // Restore each file
    for (const backupKey of filteredKeys) {
      try {
        const obj = await storage.get(BACKUP_BUCKET, backupKey)
        const chunks: Buffer[] = []
        for await (const chunk of obj.body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }
        const body = Buffer.concat(chunks)

        // Remove the date prefix to get the original key
        const originalKey = backupKey.replace(backupPrefix, '')

        // Verify integrity against stored hash
        const expectedHash = hashLookup.get(originalKey)
        if (expectedHash) {
          const actualHash = computeHash(body)
          if (actualHash !== expectedHash) {
            integrityErrors.push(
              `Hash mismatch for ${originalKey}: expected ${expectedHash}, got ${actualHash}`,
            )
            // Still restore but flag the integrity issue
          }
        }

        await storage.upload(PRIMARY_BUCKET, originalKey, body, obj.contentType)

        filesRestored++
        bytesRestored += body.length
      } catch (err) {
        filesFailed++
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`Failed to restore ${backupKey}: ${message}`)
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    errors.push(`Restore process error: ${message}`)
  }

  const completedAt = new Date().toISOString()

  // Write audit log
  try {
    await admin.from('audit_log').insert({
      action: 'backup.restore_completed',
      actor_id: null,
      target_id: null,
      target_type: 'system',
      details: {
        backup_date: backupDate,
        files_restored: filesRestored,
        files_failed: filesFailed,
        bytes_restored: bytesRestored,
        integrity_errors: integrityErrors.length,
        deployment_ids: deploymentIds ?? 'all',
      },
    })
  } catch {
    // Best-effort audit logging
  }

  return {
    success: errors.length === 0 && integrityErrors.length === 0,
    filesRestored,
    filesFailed,
    bytesRestored,
    integrityErrors,
    errors,
    backupDate,
    startedAt,
    completedAt,
  }
}
