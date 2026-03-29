import { createAdminClient } from '@/lib/supabase/admin'

export { recordBandwidth, getMonthlyBandwidth, checkBandwidthLimit } from '@/lib/limits/bandwidth'

export interface BandwidthPoint {
  date: string
  bytesServed: number
  requestCount: number
}

/**
 * Get daily bandwidth usage for a workspace over a date range.
 */
export async function getWorkspaceBandwidthUsage(
  workspaceId: string,
  days: number,
): Promise<BandwidthPoint[]> {
  const admin = createAdminClient()

  const { data: deployments } = await admin
    .from('deployments')
    .select('id')
    .eq('workspace_id', workspaceId)

  const ids = (deployments ?? []).map((d) => d.id)
  if (ids.length === 0) return []

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: rows } = await admin
    .from('bandwidth_daily')
    .select('date, bytes_served, request_count')
    .in('deployment_id', ids)
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  // Aggregate by day (multiple deployments)
  const dayMap = new Map<string, { bytes: number; reqs: number }>()
  for (const r of rows ?? []) {
    const existing = dayMap.get(r.date) ?? { bytes: 0, reqs: 0 }
    dayMap.set(r.date, {
      bytes: existing.bytes + r.bytes_served,
      reqs: existing.reqs + r.request_count,
    })
  }

  // Fill gaps
  const result: BandwidthPoint[] = []
  const cursor = new Date(since)
  for (let i = 0; i < days; i++) {
    const dateStr = cursor.toISOString().split('T')[0]
    const entry = dayMap.get(dateStr)
    result.push({
      date: dateStr,
      bytesServed: entry?.bytes ?? 0,
      requestCount: entry?.reqs ?? 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}

/**
 * Convert bandwidth data to CSV string.
 */
export function bandwidthToCsv(data: BandwidthPoint[]): string {
  const header = 'date,bytes_served,request_count'
  const rows = data.map((d) => `${d.date},${d.bytesServed},${d.requestCount}`)
  return [header, ...rows].join('\n')
}
