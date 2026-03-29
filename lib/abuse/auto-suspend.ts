/**
 * Auto-suspension logic.
 *
 * After 3 confirmed abuse takedowns against deployments owned by the same user,
 * automatically suspend the account.
 */

import { createAdminClient } from '@/lib/supabase/admin'

const TAKEDOWN_THRESHOLD = 3

/**
 * Check how many confirmed takedowns exist for a user's deployments and
 * suspend the account if the threshold is reached.
 *
 * Returns true if the account was suspended.
 */
export async function checkAutoSuspend(ownerId: string): Promise<boolean> {
  const admin = createAdminClient()

  // Count deployments owned by this user that have been admin-disabled
  const { count } = await admin
    .from('deployments')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('is_admin_disabled', true)

  if ((count ?? 0) < TAKEDOWN_THRESHOLD) return false

  // Check if already suspended
  const { data: user } = await admin
    .from('users')
    .select('suspended_at')
    .eq('id', ownerId)
    .single()

  if (user?.suspended_at) return false

  // Suspend the account
  const { error } = await admin
    .from('users')
    .update({ suspended_at: new Date().toISOString() })
    .eq('id', ownerId)

  if (error) {
    console.error('Auto-suspend error:', error)
    return false
  }

  // Audit log
  await admin.from('audit_log').insert({
    action: 'account.auto_suspend',
    actor_id: null,
    target_id: ownerId,
    target_type: 'user',
    details: { reason: 'auto_suspend_abuse_threshold', threshold: TAKEDOWN_THRESHOLD },
  })

  return true
}
