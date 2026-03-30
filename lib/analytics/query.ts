import { createAdminClient } from '@/lib/supabase/admin'

export type DateRange = '7d' | '30d' | '90d' | 'custom'

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

export interface CountryEntry {
  countryCode: string
  count: number
  percentage: number
}

export interface DeviceBreakdown {
  mobile: number
  tablet: number
  desktop: number
  total: number
}

export interface BrowserEntry {
  browser: string
  count: number
  percentage: number
}

export interface ComparisonResult {
  currentViews: number
  previousViews: number
  viewsDelta: number
  viewsDeltaPercent: number
  currentBandwidth: number
  previousBandwidth: number
  bandwidthDelta: number
  bandwidthDeltaPercent: number
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

/**
 * Get top countries by view count for a deployment.
 */
export async function getTopCountries(
  deploymentId: string,
  range: DateRange,
  limit = 10,
): Promise<CountryEntry[]> {
  const admin = createAdminClient()
  const since = getRangeStart(range).toISOString()

  const { data: events } = await admin
    .from('analytics_events')
    .select('country_code')
    .eq('deployment_id', deploymentId)
    .gte('created_at', since)
    .not('country_code', 'is', null)

  const rows = events ?? []
  const counts = new Map<string, number>()
  for (const e of rows) {
    const cc = e.country_code!
    counts.set(cc, (counts.get(cc) ?? 0) + 1)
  }

  const total = rows.length || 1
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([countryCode, count]) => ({
      countryCode,
      count,
      percentage: Math.round((count / total) * 100),
    }))
}

/**
 * Get device class breakdown for a deployment.
 */
export async function getDeviceBreakdown(
  deploymentId: string,
  range: DateRange,
): Promise<DeviceBreakdown> {
  const admin = createAdminClient()
  const since = getRangeStart(range).toISOString()

  const { data: events } = await admin
    .from('analytics_events')
    .select('device_class')
    .eq('deployment_id', deploymentId)
    .gte('created_at', since)

  const rows = events ?? []
  let mobile = 0
  let tablet = 0
  let desktop = 0

  for (const e of rows) {
    switch (e.device_class) {
      case 'mobile': mobile++; break
      case 'tablet': tablet++; break
      default: desktop++; break
    }
  }

  return { mobile, tablet, desktop, total: rows.length }
}

/**
 * Get browser breakdown for a deployment.
 */
export async function getTopBrowsers(
  deploymentId: string,
  range: DateRange,
  limit = 5,
): Promise<BrowserEntry[]> {
  const admin = createAdminClient()
  const since = getRangeStart(range).toISOString()

  const { data: events } = await admin
    .from('analytics_events')
    .select('browser_family')
    .eq('deployment_id', deploymentId)
    .gte('created_at', since)

  const rows = events ?? []
  const counts = new Map<string, number>()
  for (const e of rows) {
    const browser = e.browser_family ?? 'Other'
    counts.set(browser, (counts.get(browser) ?? 0) + 1)
  }

  const total = rows.length || 1

  // Group anything outside top N into "Other"
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, limit)
  const otherCount = sorted.slice(limit).reduce((sum, [, c]) => sum + c, 0)

  const result = top.map(([browser, count]) => ({
    browser,
    count,
    percentage: Math.round((count / total) * 100),
  }))

  if (otherCount > 0) {
    result.push({
      browser: 'Other',
      count: otherCount,
      percentage: Math.round((otherCount / total) * 100),
    })
  }

  return result
}

/**
 * Compare two date ranges for a deployment.
 */
export async function compareRanges(
  deploymentId: string,
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string,
): Promise<ComparisonResult> {
  const admin = createAdminClient()

  const [{ data: currentEvents }, { data: prevEvents }, { data: currentBw }, { data: prevBw }] =
    await Promise.all([
      admin
        .from('analytics_events')
        .select('id')
        .eq('deployment_id', deploymentId)
        .gte('created_at', currentStart)
        .lte('created_at', currentEnd),
      admin
        .from('analytics_events')
        .select('id')
        .eq('deployment_id', deploymentId)
        .gte('created_at', previousStart)
        .lte('created_at', previousEnd),
      admin
        .from('bandwidth_daily')
        .select('bytes_served')
        .eq('deployment_id', deploymentId)
        .gte('date', currentStart.split('T')[0])
        .lte('date', currentEnd.split('T')[0]),
      admin
        .from('bandwidth_daily')
        .select('bytes_served')
        .eq('deployment_id', deploymentId)
        .gte('date', previousStart.split('T')[0])
        .lte('date', previousEnd.split('T')[0]),
    ])

  const currentViews = currentEvents?.length ?? 0
  const previousViews = prevEvents?.length ?? 0
  const currentBandwidth = (currentBw ?? []).reduce((sum, r) => sum + r.bytes_served, 0)
  const previousBandwidth = (prevBw ?? []).reduce((sum, r) => sum + r.bytes_served, 0)

  const viewsDelta = currentViews - previousViews
  const viewsDeltaPercent = previousViews > 0 ? Math.round((viewsDelta / previousViews) * 100) : 0
  const bandwidthDelta = currentBandwidth - previousBandwidth
  const bandwidthDeltaPercent = previousBandwidth > 0 ? Math.round((bandwidthDelta / previousBandwidth) * 100) : 0

  return {
    currentViews,
    previousViews,
    viewsDelta,
    viewsDeltaPercent,
    currentBandwidth,
    previousBandwidth,
    bandwidthDelta,
    bandwidthDeltaPercent,
  }
}
