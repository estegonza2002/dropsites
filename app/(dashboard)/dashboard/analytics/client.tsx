'use client'

import { useCallback, useEffect, useState } from 'react'
import { StatsCards } from '@/components/analytics/stats-cards'
import { ViewChart } from '@/components/analytics/view-chart'
import { ReferrerTable } from '@/components/analytics/referrer-table'
import type { ViewStats, ReferrerEntry, TimeSeriesPoint, DateRange } from '@/lib/analytics/query'

interface AnalyticsDashboardProps {
  deployments: Array<{ id: string; slug: string }>
}

type AnalyticsData = {
  stats: ViewStats
  referrers: ReferrerEntry[]
  timeSeries: TimeSeriesPoint[]
}

const RANGE_OPTIONS: Array<{ value: DateRange; label: string }> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
]

export function AnalyticsDashboard({ deployments }: AnalyticsDashboardProps) {
  const [selectedId, setSelectedId] = useState(deployments[0]?.id ?? '')
  const [range, setRange] = useState<DateRange>('7d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    try {
      const granularity = range === '7d' ? 'day' : range === '30d' ? 'day' : 'week'
      const res = await fetch(
        `/api/v1/analytics/${selectedId}?range=${range}&granularity=${granularity}`,
      )
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Silently fail — data stays null
    } finally {
      setLoading(false)
    }
  }, [selectedId, range])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const selectedSlug = deployments.find((d) => d.id === selectedId)?.slug ?? ''

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="deployment-select" className="text-sm font-medium shrink-0">
            Deployment
          </label>
          <select
            id="deployment-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm min-w-0 truncate"
          >
            {deployments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.slug}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRange(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                range === opt.value
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-[var(--color-accent)]" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <StatsCards stats={data.stats} />
          <ViewChart data={data.timeSeries} />
          <ReferrerTable referrers={data.referrers} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No analytics data for <span className="font-medium text-foreground">{selectedSlug}</span> in this period.
          </p>
        </div>
      )}
    </div>
  )
}
