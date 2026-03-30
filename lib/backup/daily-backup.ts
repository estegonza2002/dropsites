import { createAdminClient } from '@/lib/supabase/admin'
import { storage } from '@/lib/storage'
import { createHash } from 'crypto'

const PRIMARY_BUCKET = process.env.R2_BUCKET_NAME ?? 'dropsites-deployments'
const BACKUP_BUCKET = process.env.R2_BACKUP_BUCKET_NAME ?? 'dropsites-backups'
const RETENTION_DAYS = 30

export interface BackupResult {
  success: boolean
  deploymentsProcessed: number
  filesBackedUp: number
  filesFailed: number
  bytesTransferred: number
  oldBackupsCleaned: number
  errors: string[]
  startedAt: string
  completedAt: string
}

/**
 * Runs a daily backup of all deployment files from the primary storage
 * bucket to the backup bucket. Retains backups for 30 days and deletes
 * older backups.
 */
export async function runDailyBackup(): Promise<BackupResult> {
  const startedAt = new Date().toISOString()
  const datePrefix = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const errors: string[] = []
  let deploymentsProcessed = 0
  let filesBackedUp = 0
  let filesFailed = 0
  let bytesTransferred = 0
  let oldBackupsCleaned = 0

  const admin = createAdminClient()

  try {
    // Fetch all active deployments
    const { data: deployments, error: queryError } = await admin
      .from('deployments')
      .select('id, slug, workspace_id, storage_bytes')
      .is('archived_at', null)

    if (queryError) {
      throw new Error(`Failed to query deployments: ${queryError.message}`)
    }

    if (!deployments || deployments.length === 0) {
      const completedAt = new Date().toISOString()
      await writeAuditLog(admin, 'backup.daily_completed', {
        deployments_processed: 0,
        date_prefix: datePrefix,
      })
      return {
        success: true,
        deploymentsProcessed: 0,
        filesBackedUp: 0,
        filesFailed: 0,
        bytesTransferred: 0,
        oldBackupsCleaned: 0,
        errors: [],
        startedAt,
        completedAt,
      }
    }

    // Back up each deployment's files
    for (const deployment of deployments) {
      try {
        const prefix = `${deployment.workspace_id}/${deployment.id}/`
        const keys = await storage.list(PRIMARY_BUCKET, prefix)

        for (const key of keys) {
          try {
            const obj = await storage.get(PRIMARY_BUCKET, key)
            const chunks: Buffer[] = []
            for await (const chunk of obj.body) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            }
            const body = Buffer.concat(chunks)

            const backupKey = `${datePrefix}/${key}`
            await storage.upload(BACKUP_BUCKET, backupKey, body, obj.contentType)

            filesBackedUp++
            bytesTransferred += body.length
          } catch (fileErr) {
            filesFailed++
            const message = fileErr instanceof Error ? fileErr.message : String(fileErr)
            errors.push(`Failed to backup ${key}: ${message}`)
          }
        }

        deploymentsProcessed++
      } catch (deployErr) {
        const message = deployErr instanceof Error ? deployErr.message : String(deployErr)
        errors.push(`Failed to process deployment ${deployment.id}: ${message}`)
      }
    }

    // Clean up old backups (older than RETENTION_DAYS)
    oldBackupsCleaned = await cleanOldBackups()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    errors.push(`Backup process error: ${message}`)
  }

  const completedAt = new Date().toISOString()

  // Write audit log
  await writeAuditLog(admin, 'backup.daily_completed', {
    deployments_processed: deploymentsProcessed,
    files_backed_up: filesBackedUp,
    files_failed: filesFailed,
    bytes_transferred: bytesTransferred,
    old_backups_cleaned: oldBackupsCleaned,
    date_prefix: datePrefix,
    error_count: errors.length,
  })

  return {
    success: errors.length === 0,
    deploymentsProcessed,
    filesBackedUp,
    filesFailed,
    bytesTransferred,
    oldBackupsCleaned,
    errors,
    startedAt,
    completedAt,
  }
}

/**
 * Removes backup date-prefixed folders older than RETENTION_DAYS.
 * Backup keys follow the pattern: YYYY-MM-DD/workspace_id/deployment_id/file
 */
async function cleanOldBackups(): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  let cleaned = 0

  // List all top-level date prefixes by scanning known dates
  // We check each of the last 60 days (covers retention + buffer)
  for (let i = RETENTION_DAYS; i <= RETENTION_DAYS + 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const prefix = d.toISOString().slice(0, 10) + '/'

    if (prefix.slice(0, 10) <= cutoffStr) {
      try {
        const keys = await storage.list(BACKUP_BUCKET, prefix)
        if (keys.length > 0) {
          await storage.deletePrefix(BACKUP_BUCKET, prefix)
          cleaned += keys.length
        }
      } catch {
        // Prefix may not exist — skip
      }
    }
  }

  return cleaned
}

/**
 * Computes SHA-256 hash of a buffer for integrity verification.
 */
export function computeHash(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex')
}

async function writeAuditLog(
  admin: ReturnType<typeof createAdminClient>,
  action: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await admin.from('audit_log').insert({
      action,
      actor_id: null,
      target_id: null,
      target_type: 'system',
      details,
    })
  } catch {
    // Best-effort — don't fail the backup over audit log issues
  }
}
