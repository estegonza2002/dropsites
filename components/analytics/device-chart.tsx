'use client'

import { Monitor, Smartphone, Tablet } from 'lucide-react'
import type { DeviceBreakdown, BrowserEntry } from '@/lib/analytics/query'

interface DeviceChartProps {
  devices: DeviceBreakdown
  browsers: BrowserEntry[]
}

const DEVICE_COLORS = {
  desktop: 'var(--color-accent)',
  mobile: 'var(--color-success)',
  tablet: 'var(--color-warning)',
} as const

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
} as const

/**
 * Device + browser breakdown using CSS-only donut and bars.
 */
export function DeviceChart({ devices, browsers }: DeviceChartProps) {
  const total = devices.total || 1
  const segments = [
    { key: 'desktop' as const, count: devices.desktop, pct: Math.round((devices.desktop / total) * 100) },
    { key: 'mobile' as const, count: devices.mobile, pct: Math.round((devices.mobile / total) * 100) },
    { key: 'tablet' as const, count: devices.tablet, pct: Math.round((devices.tablet / total) * 100) },
  ]

  // Donut: conic-gradient segments
  let offset = 0
  const gradientParts: string[] = []
  for (const seg of segments) {
    if (seg.count === 0) continue
    const pct = (seg.count / total) * 100
    gradientParts.push(`${DEVICE_COLORS[seg.key]} ${offset}% ${offset + pct}%`)
    offset += pct
  }
  // Fill remainder if rounding leaves a gap
  if (offset < 100) {
    gradientParts.push(`transparent ${offset}% 100%`)
  }

  const conicGradient = `conic-gradient(${gradientParts.join(', ')})`

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-medium mb-4">Devices &amp; Browsers</h3>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Donut chart */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-28 h-28 rounded-full relative"
            style={{ background: conicGradient }}
            role="img"
            aria-label={`Device breakdown: ${segments.map((s) => `${s.key} ${s.pct}%`).join(', ')}`}
          >
            {/* Inner white circle for donut effect */}
            <div className="absolute inset-3 rounded-full bg-background flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">
                {total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center">
            {segments.map((seg) => {
              const Icon = DEVICE_ICONS[seg.key]
              return (
                <div key={seg.key} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: DEVICE_COLORS[seg.key] }}
                  />
                  <Icon size={14} strokeWidth={1.5} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">
                    {seg.key} {seg.pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Browser breakdown */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Browsers
          </h4>
          {browsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No browser data yet</p>
          ) : (
            <div className="space-y-2">
              {browsers.map((b) => (
                <div key={b.browser}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm truncate">{b.browser}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {b.count.toLocaleString()} ({b.percentage}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${b.percentage}%`,
                        backgroundColor: 'var(--color-accent)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
