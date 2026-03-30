import { createAdminClient } from '@/lib/supabase/admin'

export interface UptimeRecord {
  id: string
  checked_at: string
  healthy: boolean
  response_time_ms: number | null
  details: Record<string, unknown> | null
}

export interface UptimeCheckInput {
  healthy: boolean
  responseTimeMs?: number
  details?: Record<string, unknown>
}

/**
 * Records an uptime check result. Called by the uptime-check edge function
 * every 60 seconds.
 */
export async function recordUptimeCheck(input: UptimeCheckInput): Promise<void> {
  const admin = createAdminClient()

  await admin.from('audit_log').insert({
    action: 'system.uptime_check',
    actor_id: null,
    target_id: null,
    target_type: 'system',
    details: {
      healthy: input.healthy,
      response_time_ms: input.responseTimeMs ?? null,
      checked_at: new Date().toISOString(),
      ...(input.details ?? {}),
    },
  })
}

/**
 * Retrieves uptime check history for the specified number of days.
 * Returns records ordered by most recent first.
 *
 * @param days - Number of days of history to retrieve (default: 90)
 */
export async function getUptimeHistory(days: number = 90): Promise<UptimeRecord[]> {
  const admin = createAdminClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await admin
    .from('audit_log')
    .select('id, created_at, details')
    .eq('action', 'system.uptime_check')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((row) => {
    const details = (row.details ?? {}) as Record<string, unknown>
    return {
      id: row.id,
      checked_at: row.created_at,
      healthy: details.healthy === true,
      response_time_ms: typeof details.response_time_ms === 'number' ? details.response_time_ms : null,
      details,
    }
  })
}

/**
 * Calculates the monthly uptime percentage for a given month.
 * Uptime is defined as the percentage of health checks that returned healthy.
 *
 * @param month - The month to calculate, in YYYY-MM format
 * @returns Uptime percentage (0-100)
 */
export async function calculateMonthlyUptime(month: string): Promise<number> {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Invalid month format. Expected YYYY-MM.')
  }

  const admin = createAdminClient()

  // Calculate start and end of month
  const [year, monthNum] = month.split('-').map(Number)
  const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1))
  const endOfMonth = new Date(Date.UTC(year, monthNum, 1)) // first day of next month

  const { data, error } = await admin
    .from('audit_log')
    .select('details')
    .eq('action', 'system.uptime_check')
    .gte('created_at', startOfMonth.toISOString())
    .lt('created_at', endOfMonth.toISOString())

  if (error || !data || data.length === 0) {
    // No data means we can't calculate — return 100% (benefit of doubt)
    return 100
  }

  const totalChecks = data.length
  const healthyChecks = data.filter((row) => {
    const details = (row.details ?? {}) as Record<string, unknown>
    return details.healthy === true
  }).length

  return (healthyChecks / totalChecks) * 100
}

/**
 * Returns a summary of uptime for the last N days, grouped by day.
 * Useful for rendering the 90-day uptime bar on the status page.
 */
export async function getDailyUptimeSummary(
  days: number = 90,
): Promise<Array<{ date: string; uptimePercent: number; totalChecks: number }>> {
  const history = await getUptimeHistory(days)

  // Group by date
  const byDate = new Map<string, { healthy: number; total: number }>()

  for (const record of history) {
    const date = record.checked_at.slice(0, 10)
    const entry = byDate.get(date) ?? { healthy: 0, total: 0 }
    entry.total++
    if (record.healthy) entry.healthy++
    byDate.set(date, entry)
  }

  // Build sorted array
  const result: Array<{ date: string; uptimePercent: number; totalChecks: number }> = []

  for (const [date, counts] of byDate) {
    result.push({
      date,
      uptimePercent: counts.total > 0 ? (counts.healthy / counts.total) * 100 : 100,
      totalChecks: counts.total,
    })
  }

  result.sort((a, b) => a.date.localeCompare(b.date))
  return result
}
