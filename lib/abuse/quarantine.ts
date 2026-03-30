/**
 * Quarantine management for flagged deployments.
 *
 * When automated scanning detects threats, deployments are quarantined
 * (admin-disabled) pending human review. Admins can then approve
 * (restore) or reject (permanently disable + block hashes).
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { blockDeploymentHashes } from './block-hashes'
import { checkAutoSuspend } from './auto-suspend'

/**
 * Quarantine a deployment by marking it admin-disabled and logging the reason.
 */
export async function quarantineDeployment(
  deploymentId: string,
  reason: string,
): Promise<void> {
  const admin = createAdminClient()

  // Mark deployment as admin-disabled
  const { error: updateError } = await admin
    .from('deployments')
    .update({
      is_admin_disabled: true,
      health_status: 'quarantined',
      health_details: { reason, quarantined_at: new Date().toISOString() },
    })
    .eq('id', deploymentId)

  if (updateError) {
    throw new Error(`Failed to quarantine deployment: ${updateError.message}`)
  }

  // Write audit log
  await admin.from('audit_log').insert({
    action: 'deployment.quarantined',
    actor_id: null,
    target_id: deploymentId,
    target_type: 'deployment',
    details: { reason },
  })
}

/**
 * Review a quarantined deployment — either approve (restore) or reject (confirm threat).
 */
export async function reviewQuarantine(
  deploymentId: string,
  action: 'approve' | 'reject',
  reviewerId?: string,
): Promise<void> {
  const admin = createAdminClient()

  if (action === 'approve') {
    // Restore the deployment
    const { error } = await admin
      .from('deployments')
      .update({
        is_admin_disabled: false,
        health_status: 'healthy',
        health_details: null,
      })
      .eq('id', deploymentId)

    if (error) {
      throw new Error(`Failed to approve deployment: ${error.message}`)
    }

    await admin.from('audit_log').insert({
      action: 'deployment.quarantine_approved',
      actor_id: reviewerId ?? null,
      target_id: deploymentId,
      target_type: 'deployment',
      details: { action: 'approve' },
    })
  } else {
    // Reject — keep disabled, block hashes, check auto-suspend
    await blockDeploymentHashes(deploymentId, 'quarantine_rejected')

    // Fetch the deployment owner for auto-suspend check
    const { data: deployment } = await admin
      .from('deployments')
      .select('owner_id')
      .eq('id', deploymentId)
      .single()

    await admin.from('audit_log').insert({
      action: 'deployment.quarantine_rejected',
      actor_id: reviewerId ?? null,
      target_id: deploymentId,
      target_type: 'deployment',
      details: { action: 'reject' },
    })

    // Check if the owner should be auto-suspended
    if (deployment?.owner_id) {
      await checkAutoSuspend(deployment.owner_id)
    }
  }
}
