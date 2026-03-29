/**
 * Block content hashes associated with a deployment.
 *
 * When an admin confirms an abuse report, all file hashes for that deployment
 * are added to the content_hashes table with blocked = true.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export async function blockDeploymentHashes(
  deploymentId: string,
  reason: string,
): Promise<number> {
  const admin = createAdminClient()

  // Fetch all file hashes for this deployment
  const { data: files } = await admin
    .from('deployment_files')
    .select('sha256_hash')
    .eq('deployment_id', deploymentId)

  if (!files || files.length === 0) return 0

  const now = new Date().toISOString()
  let blocked = 0

  for (const file of files) {
    const { error } = await admin.from('content_hashes').upsert(
      {
        sha256_hash: file.sha256_hash,
        blocked: true,
        blocked_reason: reason,
      },
      { onConflict: 'sha256_hash' },
    )
    if (!error) blocked++
  }

  return blocked
}
