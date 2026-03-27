import { createAdminClient } from '@/lib/supabase/admin'
import { getWorkspaceProfile } from './get-profile'
import { isUnlimited } from './profiles'

export async function recordBandwidth(deploymentId: string, bytes: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  await upsertBandwidthFallback(deploymentId, today, bytes)
}

async function upsertBandwidthFallback(
  deploymentId: string,
  date: string,
  bytes: number,
): Promise<void> {
  const supabase = createAdminClient()

  // Try insert first, then update on conflict
  const { error: insertError } = await supabase.from('bandwidth_daily').insert({
    deployment_id: deploymentId,
    date,
    bytes_served: bytes,
    request_count: 1,
  })

  if (insertError) {
    // Row exists — fetch and update
    const { data: existing } = await supabase
      .from('bandwidth_daily')
      .select('bytes_served, request_count')
      .eq('deployment_id', deploymentId)
      .eq('date', date)
      .single()

    if (existing) {
      await supabase
        .from('bandwidth_daily')
        .update({
          bytes_served: existing.bytes_served + bytes,
          request_count: existing.request_count + 1,
        })
        .eq('deployment_id', deploymentId)
        .eq('date', date)
    }
  }
}

export async function getMonthlyBandwidth(
  workspaceId: string,
): Promise<{ used: number; limit: number }> {
  const supabase = createAdminClient()
  const profile = await getWorkspaceProfile(workspaceId)

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  // Get all deployment IDs for this workspace
  const { data: deployments, error: depError } = await supabase
    .from('deployments')
    .select('id')
    .eq('workspace_id', workspaceId)

  if (depError) {
    throw new Error(`Failed to fetch deployments: ${depError.message}`)
  }

  if (!deployments.length) {
    return { used: 0, limit: profile.max_monthly_bandwidth_bytes ?? -1 }
  }

  const deploymentIds = deployments.map((d) => d.id)

  const { data: bandwidth, error: bwError } = await supabase
    .from('bandwidth_daily')
    .select('bytes_served')
    .in('deployment_id', deploymentIds)
    .gte('date', monthStart)

  if (bwError) {
    throw new Error(`Failed to fetch bandwidth: ${bwError.message}`)
  }

  const used = (bandwidth ?? []).reduce((sum, row) => sum + (row.bytes_served ?? 0), 0)
  const limit = profile.max_monthly_bandwidth_bytes ?? -1

  return { used, limit }
}

export async function checkBandwidthLimit(
  workspaceId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { used, limit } = await getMonthlyBandwidth(workspaceId)

  if (isUnlimited(limit)) {
    return { allowed: true, used, limit }
  }

  return { allowed: used < limit, used, limit }
}
