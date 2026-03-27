import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceProfile } from './get-profile'
import { isUnlimited } from './profiles'

export type LimitCheckResult = {
  allowed: boolean
  reason?: string
}

export async function checkDeploymentLimits(
  workspaceId: string,
  uploadSizeBytes: number,
  fileCount: number,
): Promise<LimitCheckResult> {
  const [profile, currentStats] = await Promise.all([
    getWorkspaceProfile(workspaceId),
    getWorkspaceStats(workspaceId),
  ])

  // Check deployment count
  if (!isUnlimited(profile.max_deployments)) {
    if (currentStats.deploymentCount >= profile.max_deployments!) {
      return {
        allowed: false,
        reason: `Deployment limit reached. Your plan allows ${profile.max_deployments} deployment${profile.max_deployments === 1 ? '' : 's'}.`,
      }
    }
  }

  // Check upload size against per-deployment limit
  if (!isUnlimited(profile.max_deploy_size_bytes)) {
    if (uploadSizeBytes > profile.max_deploy_size_bytes!) {
      const limitMB = Math.round(profile.max_deploy_size_bytes! / 1024 / 1024)
      return {
        allowed: false,
        reason: `Deployment size exceeds your plan's ${limitMB} MB limit.`,
      }
    }
  }

  // Check total workspace storage
  if (!isUnlimited(profile.max_total_storage_bytes)) {
    const projectedStorage = currentStats.totalStorageBytes + uploadSizeBytes
    if (projectedStorage > profile.max_total_storage_bytes!) {
      const limitMB = Math.round(profile.max_total_storage_bytes! / 1024 / 1024)
      const usedMB = Math.round(currentStats.totalStorageBytes / 1024 / 1024)
      return {
        allowed: false,
        reason: `Storage full. You've used ${usedMB} MB of your ${limitMB} MB storage limit.`,
      }
    }
  }

  void fileCount // fileCount reserved for future per-file checks

  return { allowed: true }
}

async function getWorkspaceStats(
  workspaceId: string,
): Promise<{ deploymentCount: number; totalStorageBytes: number }> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('deployments')
    .select('storage_bytes')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)

  if (error) {
    throw new Error(`Failed to fetch workspace stats: ${error.message}`)
  }

  const deploymentCount = data.length
  const totalStorageBytes = data.reduce((sum, d) => sum + (d.storage_bytes ?? 0), 0)

  return { deploymentCount, totalStorageBytes }
}
