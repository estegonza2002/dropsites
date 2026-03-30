'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { ComparisonResult } from '@/lib/analytics/query'

interface ComparisonModeProps {
  deploymentId: string
  onCompare: (
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
  ) => Promise<ComparisonResult>
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(1)} ${units[i]}`
}

function DeltaIndicator({ value, percent }: { value: number; percent: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus size={14} strokeWidth={1.5} />
        <span>No change</span>
      </span>
    )
  }

  const isPositive = value > 0
  const Icon = isPositive ? ArrowUp : ArrowDown

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}
    >
      <Icon size={14} strokeWidth={1.5} />
      <span>
        {isPositive ? '+' : ''}{percent}%
      </span>
    </span>
  )
}

/**
 * Date range picker for comparing two periods.
 * Displays delta for views and bandwidth with green/red indicators.
 */
export function ComparisonMode({ deploymentId: _deploymentId, onCompare }: ComparisonModeProps) {
  const [currentStart, setCurrentStart] = useState('')
  const [currentEnd, setCurrentEnd] = useState('')
  const [previousStart, setPreviousStart] = useState('')
  const [previousEnd, setPreviousEnd] = useState('')
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)

  const canCompare =
    currentStart && currentEnd && previousStart && previousEnd && !loading

  async function handleCompare() {
    if (!canCompare) return
    setLoading(true)
    try {
      const data = await onCompare(
        currentStart + 'T00:00:00Z',
        currentEnd + 'T23:59:59Z',
        previousStart + 'T00:00:00Z',
        previousEnd + 'T23:59:59Z',
      )
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-medium mb-4">Compare Periods</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Current period */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Current Period
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={currentStart}
              onChange={(e) => setCurrentStart(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              aria-label="Current period start date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={currentEnd}
              onChange={(e) => setCurrentEnd(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              aria-label="Current period end date"
            />
          </div>
        </div>

        {/* Previous period */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Previous Period
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={previousStart}
              onChange={(e) => setPreviousStart(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              aria-label="Previous period start date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={previousEnd}
              onChange={(e) => setPreviousEnd(e.target.value)}
              className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              aria-label="Previous period end date"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={!canCompare}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        {loading ? 'Comparing...' : 'Compare'}
      </button>

      {result && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Views comparison */}
          <div className="rounded-lg border border-border p-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Views
            </span>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-xl font-medium">
                {result.currentViews.toLocaleString()}
              </span>
              <DeltaIndicator value={result.viewsDelta} percent={result.viewsDeltaPercent} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs {result.previousViews.toLocaleString()} previously
            </p>
          </div>

          {/* Bandwidth comparison */}
          <div className="rounded-lg border border-border p-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Bandwidth
            </span>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-xl font-medium">
                {formatBytes(result.currentBandwidth)}
              </span>
              <DeltaIndicator value={result.bandwidthDelta} percent={result.bandwidthDeltaPercent} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs {formatBytes(result.previousBandwidth)} previously
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
