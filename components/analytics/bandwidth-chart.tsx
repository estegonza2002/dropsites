'use client'

import type { BandwidthPoint } from '@/lib/analytics/bandwidth'

interface BandwidthChartProps {
  data: BandwidthPoint[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export function BandwidthChart({ data }: BandwidthChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background p-4 text-center">
        <p className="text-sm text-muted-foreground py-8">No bandwidth data yet.</p>
      </div>
    )
  }

  const W = 600
  const H = 200
  const PAD = { top: 10, right: 10, bottom: 30, left: 60 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const values = data.map((d) => d.bytesServed)
  const max = Math.max(...values, 1)

  const points = values.map((v, i) => {
    const x = PAD.left + (i / Math.max(values.length - 1, 1)) * plotW
    const y = PAD.top + plotH - (v / max) * plotH
    return `${x},${y}`
  })

  const areaPoints = [
    `${PAD.left},${PAD.top + plotH}`,
    ...points,
    `${PAD.left + plotW},${PAD.top + plotH}`,
  ].join(' ')

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-medium mb-3">Bandwidth Usage</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = PAD.top + plotH - pct * plotH
          return (
            <g key={pct}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} className="stroke-border" strokeWidth={0.5} />
              <text x={PAD.left - 4} y={y + 3} textAnchor="end" className="fill-muted-foreground" fontSize={9}>
                {formatBytes(max * pct)}
              </text>
            </g>
          )
        })}

        {/* Area fill */}
        <polygon points={areaPoints} style={{ fill: 'var(--color-accent)', opacity: 0.1 }} />

        {/* Line */}
        <polyline
          points={points.join(' ')}
          fill="none"
          style={{ stroke: 'var(--color-accent)' }}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0).map((d, idx) => {
          const i = data.indexOf(d)
          const x = PAD.left + (i / Math.max(data.length - 1, 1)) * plotW
          return (
            <text key={idx} x={x} y={H - 4} textAnchor="middle" className="fill-muted-foreground" fontSize={9}>
              {d.date.slice(5)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
