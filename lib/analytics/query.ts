import { createAdminClient } from '@/lib/supabase/admin'

export type DateRange = '7d' | '30d' | '90d'

export interface ViewStats {
  totalViews: number
  uniqueDays: number
  topReferrer: string | null
}

export interface ReferrerEntry {
  domain: string
  count: number
  percentage: number
}

export interface TimeSeriesPoint {
  date: string
  views: number
}

function getRangeStart(range: DateRange): Date {
  const now = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  now.setDate(now.getDate() - days)
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Get aggregate view stats for a deployment.
 */
export async function getViewStats(
  deploymentId: string,
  range: DateRange,
): Promise<ViewStats> {
  const admin = createAdminClient()
  const since = getRangeStart(range).toISOString()

  const { data: events } = await admin
    .from('analytics_events')
    .select('created_at, referrer_domain')
    .eq('deployment_id', deploymentId)
    .gte('created_at', since)

  const rows = events ?? []
  const totalViews = rows.length

  // Count unique days
  const days = new Set(rows.map((e) => e.created_at.split('T')[0]))
  const uniqueDays = days.size

  // Top referrer
  const refCounts = new Map<string, number>()
  for (const e of rows) {
    if (e.referrer_domain) {
      refCounts.set(e.referrer_domain, (refCounts.get(e.referrer_domain) ?? 0) + 1)
    }
  }
  let topReferrer: string | null = null
  let topCount = 0
  for (const [domain, count] of refCounts) {
    if (count > topCount) {
      topReferrer = domain
      topCount = count
    }
  }

  return { totalViews, uniqueDays, topReferrer }
}

/**
 * Get top referrer domains for a deployment.
 */
export async function getTopReferrers(
  deploymentId: string,
  range: DateRange,
  limit = 10,
): Promise<ReferrerEntry[]> {
  const admin = createAdminClient()
  const since = getRangeStart(range).toISOString()

  const { data: events } = await admin
    .from('analytics_events')
    .select('referrer_domain')
    .eq('deployment_id', deploymentId)
    .gte('created_at', since)
    .not('referrer_domain', 'is', null)

  const rows = events ?? []
  const counts = new Map<string, number>()
  for (const e of rows) {
    const d = e.referrer_domain!
    counts.set(d, (counts.get(d) ?? 0) + 1)
  }

  const total = rows.length || 1
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain, count]) => ({
      domain,
      count,
      percentage: Math.round((count / total) * 100),
    }))

  return sorted
}

/**
 * Get time-series view data bucketed by day.
 */
export async function getTimeSeriesViews(
  deploymentId: string,
  range: DateRange,
): Promise<TimeSeriesPoint[]> {
  const admin = createAdminClient()
  const rangeStart = getRangeStart(range)
  const since = rangeStart.toISOString()

  const { data: events } = await admin
    .from('analytics_events')
    .select('created_at')
    .eq('deployment_id', deploymentId)
    .gte('created_at', since)

  // Bucket by day
  const dayCounts = new Map<string, number>()
  for (const e of (events ?? [])) {
    const day = e.created_at.split('T')[0]
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
  }

  // Fill empty days
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const result: TimeSeriesPoint[] = []
  const cursor = new Date(rangeStart)
  for (let i = 0; i < days; i++) {
    const dateStr = cursor.toISOString().split('T')[0]
    result.push({ date: dateStr, views: dayCounts.get(dateStr) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}
