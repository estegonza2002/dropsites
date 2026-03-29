import { createAdminClient } from '@/lib/supabase/admin'

const LOCK_DURATION_MINUTES = 30

export type EditorLock = {
  deployment_id: string
  user_id: string
  opened_at: string
  expires_at: string | null
}

export type LockResult =
  | { acquired: true; lock: EditorLock }
  | { acquired: false; lock: EditorLock; locked_by: string }

export type LockStatus =
  | { locked: false }
  | { locked: true; lock: EditorLock; locked_by: string }

/**
 * Attempt to acquire an editor lock for a deployment.
 * If another user holds a non-expired lock, returns their lock info.
 * Expired locks are overwritten.
 */
export async function acquireLock(
  deploymentId: string,
  userId: string,
): Promise<LockResult> {
  const admin = createAdminClient()

  // Check for existing non-expired lock by another user
  const { data: existing } = await admin
    .from('editor_locks')
    .select('deployment_id, user_id, opened_at, expires_at')
    .eq('deployment_id', deploymentId)
    .single()

  if (existing && existing.user_id !== userId) {
    // Check if it's expired
    const expiresAt = existing.expires_at ? new Date(existing.expires_at) : null
    if (expiresAt && expiresAt > new Date()) {
      // Lock held by another user and not expired
      return { acquired: false, lock: existing, locked_by: existing.user_id }
    }
    // Expired lock — delete it so we can take over
    await admin
      .from('editor_locks')
      .delete()
      .eq('deployment_id', deploymentId)
  }

  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + LOCK_DURATION_MINUTES)

  const { data: lock, error } = await admin
    .from('editor_locks')
    .upsert(
      {
        deployment_id: deploymentId,
        user_id: userId,
        opened_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'deployment_id' },
    )
    .select('deployment_id, user_id, opened_at, expires_at')
    .single()

  if (error || !lock) {
    throw new Error(`Failed to acquire lock: ${error?.message ?? 'unknown'}`)
  }

  return { acquired: true, lock }
}

/**
 * Release an editor lock. Only the lock holder can release it.
 */
export async function releaseLock(
  deploymentId: string,
  userId: string,
): Promise<boolean> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('editor_locks')
    .delete()
    .eq('deployment_id', deploymentId)
    .eq('user_id', userId)

  return !error
}

/**
 * Check the current lock status for a deployment.
 */
export async function checkLock(deploymentId: string): Promise<LockStatus> {
  const admin = createAdminClient()
  const { data: lock } = await admin
    .from('editor_locks')
    .select('deployment_id, user_id, opened_at, expires_at')
    .eq('deployment_id', deploymentId)
    .single()

  if (!lock) return { locked: false }

  // Check expiry
  const expiresAt = lock.expires_at ? new Date(lock.expires_at) : null
  if (expiresAt && expiresAt <= new Date()) {
    // Expired — clean up
    await admin
      .from('editor_locks')
      .delete()
      .eq('deployment_id', deploymentId)
    return { locked: false }
  }

  return { locked: true, lock, locked_by: lock.user_id }
}

/**
 * Extend the lock expiry by 30 more minutes. Only the lock holder can extend.
 */
export async function extendLock(
  deploymentId: string,
  userId: string,
): Promise<EditorLock | null> {
  const admin = createAdminClient()

  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + LOCK_DURATION_MINUTES)

  const { data: lock, error } = await admin
    .from('editor_locks')
    .update({ expires_at: expiresAt.toISOString() })
    .eq('deployment_id', deploymentId)
    .eq('user_id', userId)
    .select('deployment_id, user_id, opened_at, expires_at')
    .single()

  if (error || !lock) return null
  return lock
}

/**
 * Get the current version number of a deployment for conflict detection.
 */
export async function getDeploymentVersion(
  deploymentId: string,
): Promise<number | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('deployment_versions')
    .select('version_number')
    .eq('deployment_id', deploymentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  return data?.version_number ?? null
}

/**
 * Check if the deployment has been updated since the given version.
 * Used for conflict detection before publishing.
 */
export async function hasConflict(
  deploymentId: string,
  knownVersion: number,
): Promise<boolean> {
  const currentVersion = await getDeploymentVersion(deploymentId)
  if (currentVersion === null) return false
  return currentVersion > knownVersion
}
