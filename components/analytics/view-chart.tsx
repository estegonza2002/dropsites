'use client'

import type { TimeSeriesPoint } from '@/lib/analytics/query'

interface ViewChartProps {
  data: TimeSeriesPoint[]
}

/**
 * Lightweight inline SVG time-series line chart.
 * No external chart library — just <polyline> + labels.
 */
export function ViewChart({ data }: ViewChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">No view data available</p>
      </div>
    )
  }

  const maxViews = Math.max(...data.map((d) => d.views), 1)

  // Chart dimensions
  const width = 600
  const height = 200
  const paddingLeft = 40
  const paddingRight = 16
  const paddingTop = 16
  const paddingBottom = 32
  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  // Generate polyline points
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * chartWidth
    const y = paddingTop + chartHeight - (d.views / maxViews) * chartHeight
    return `${x},${y}`
  })

  // Area fill points (close path at bottom)
  const firstX = paddingLeft
  const lastX = paddingLeft + ((data.length - 1) / Math.max(data.length - 1, 1)) * chartWidth
  const bottomY = paddingTop + chartHeight
  const areaPoints = `${firstX},${bottomY} ${points.join(' ')} ${lastX},${bottomY}`

  // Y-axis labels (0, mid, max)
  const yLabels = [0, Math.round(maxViews / 2), maxViews]

  // X-axis labels (first, middle, last)
  const xLabelIndices = [0, Math.floor(data.length / 2), data.length - 1]

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-medium mb-3">Views over time</h3>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[300px]"
          role="img"
          aria-label="Views over time chart"
        >
          {/* Grid lines */}
          {yLabels.map((label) => {
            const y = paddingTop + chartHeight - (label / maxViews) * chartHeight
            return (
              <g key={`grid-${label}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                  strokeDasharray="4,4"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize={10}
                >
                  {label}
                </text>
              </g>
            )
          })}

          {/* Area fill */}
          <polygon
            points={areaPoints}
            fill="var(--color-accent)"
            fillOpacity={0.08}
          />

          {/* Line */}
          <polyline
            points={points.join(' ')}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = paddingLeft + (i / Math.max(data.length - 1, 1)) * chartWidth
            const y = paddingTop + chartHeight - (d.views / maxViews) * chartHeight
            return (
              <circle
                key={`point-${d.date}`}
                cx={x}
                cy={y}
                r={data.length <= 14 ? 3 : 0}
                fill="var(--color-accent)"
              />
            )
          })}

          {/* X-axis labels */}
          {xLabelIndices.map((idx) => {
            if (idx < 0 || idx >= data.length) return null
            const x = paddingLeft + (idx / Math.max(data.length - 1, 1)) * chartWidth
            const label = formatDateLabel(data[idx].date)
            return (
              <text
                key={`xlabel-${idx}`}
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {label}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function formatDateLabel(dateStr: string): string {
  // Handle both "YYYY-MM-DD" and "YYYY-MM" formats
  if (dateStr.length === 7) {
    const [y, m] = dateStr.split('-')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[parseInt(m, 10) - 1]} ${y}`
  }
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
