/**
 * Monthly Restore Test
 *
 * Selects 10 random active deployments, attempts to restore each from
 * the most recent backup, and verifies file integrity via SHA-256 hash
 * comparison. Intended to run monthly as a cron job or manual verification.
 *
 * Usage: npx tsx scripts/monthly-restore-test.ts
 *
 * Exit codes:
 *   0 — all verifications passed
 *   1 — one or more verifications failed
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { storage } from '@/lib/storage'
import { computeHash } from '@/lib/backup/daily-backup'

const BACKUP_BUCKET = process.env.R2_BACKUP_BUCKET_NAME ?? 'dropsites-backups'
const PRIMARY_BUCKET = process.env.R2_BUCKET_NAME ?? 'dropsites-deployments'
const SAMPLE_SIZE = 10

interface VerificationResult {
  deploymentId: string
  slug: string
  filesChecked: number
  hashMatches: number
  hashMismatches: number
  missingInBackup: number
  errors: string[]
}

async function main(): Promise<void> {
  const admin = createAdminClient()

  console.log('[restore-test] Starting monthly restore verification...')
  console.log(`[restore-test] Sample size: ${SAMPLE_SIZE} deployments`)

  // Determine the most recent backup date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const backupDate = yesterday.toISOString().slice(0, 10)

  console.log(`[restore-test] Using backup date: ${backupDate}`)

  // Fetch all active deployments
  const { data: allDeployments, error } = await admin
    .from('deployments')
    .select('id, slug, workspace_id')
    .is('archived_at', null)

  if (error || !allDeployments) {
    console.error('[restore-test] Failed to query deployments:', error)
    process.exit(1)
  }

  if (allDeployments.length === 0) {
    console.log('[restore-test] No active deployments found. Nothing to verify.')
    process.exit(0)
  }

  // Select random sample
  const shuffled = [...allDeployments].sort(() => Math.random() - 0.5)
  const sample = shuffled.slice(0, Math.min(SAMPLE_SIZE, shuffled.length))

  console.log(`[restore-test] Selected ${sample.length} deployments for verification`)

  const results: VerificationResult[] = []
  let hasFailures = false

  for (const deployment of sample) {
    const result: VerificationResult = {
      deploymentId: deployment.id,
      slug: deployment.slug,
      filesChecked: 0,
      hashMatches: 0,
      hashMismatches: 0,
      missingInBackup: 0,
      errors: [],
    }

    try {
      // List files in primary storage for this deployment
      const prefix = `${deployment.workspace_id}/${deployment.id}/`
      const primaryKeys = await storage.list(PRIMARY_BUCKET, prefix)

      for (const key of primaryKeys) {
        result.filesChecked++
        const backupKey = `${backupDate}/${key}`

        try {
          // Check if backup exists
          const backupExists = await storage.exists(BACKUP_BUCKET, backupKey)
          if (!backupExists) {
            result.missingInBackup++
            result.errors.push(`Missing in backup: ${key}`)
            continue
          }

          // Fetch both and compare hashes
          const [primaryObj, backupObj] = await Promise.all([
            storage.get(PRIMARY_BUCKET, key),
            storage.get(BACKUP_BUCKET, backupKey),
          ])

          const primaryChunks: Buffer[] = []
          for await (const chunk of primaryObj.body) {
            primaryChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const primaryData = Buffer.concat(primaryChunks)

          const backupChunks: Buffer[] = []
          for await (const chunk of backupObj.body) {
            backupChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }
          const backupData = Buffer.concat(backupChunks)

          const primaryHash = computeHash(primaryData)
          const backupHash = computeHash(backupData)

          if (primaryHash === backupHash) {
            result.hashMatches++
          } else {
            result.hashMismatches++
            result.errors.push(`Hash mismatch: ${key}`)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          result.errors.push(`Error checking ${key}: ${message}`)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      result.errors.push(`Deployment error: ${message}`)
    }

    results.push(result)

    if (result.hashMismatches > 0 || result.missingInBackup > 0 || result.errors.length > 0) {
      hasFailures = true
    }
  }

  // Print summary
  console.log('\n[restore-test] === RESULTS ===')
  for (const r of results) {
    const status =
      r.hashMismatches === 0 && r.missingInBackup === 0 && r.errors.length === 0
        ? 'PASS'
        : 'FAIL'

    console.log(
      `  ${status} ${r.slug} (${r.deploymentId}): ${r.filesChecked} files, ${r.hashMatches} OK, ${r.hashMismatches} mismatches, ${r.missingInBackup} missing`,
    )

    for (const err of r.errors) {
      console.log(`    - ${err}`)
    }
  }

  // Write audit log
  try {
    await admin.from('audit_log').insert({
      action: 'backup.monthly_restore_test',
      actor_id: null,
      target_id: null,
      target_type: 'system',
      details: {
        backup_date: backupDate,
        deployments_tested: results.length,
        all_passed: !hasFailures,
        results: results.map((r) => ({
          deployment_id: r.deploymentId,
          files_checked: r.filesChecked,
          hash_matches: r.hashMatches,
          hash_mismatches: r.hashMismatches,
          missing_in_backup: r.missingInBackup,
        })),
      },
    })
  } catch {
    console.error('[restore-test] Failed to write audit log (non-fatal)')
  }

  console.log(`\n[restore-test] ${hasFailures ? 'FAILED' : 'PASSED'}`)
  process.exit(hasFailures ? 1 : 0)
}

main().catch((err) => {
  console.error('[restore-test] Fatal error:', err)
  process.exit(1)
})
