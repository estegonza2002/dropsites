'use client'

import type { ReferrerEntry } from '@/lib/analytics/query'
import { Globe } from 'lucide-react'

interface ReferrerTableProps {
  referrers: ReferrerEntry[]
}

export function ReferrerTable({ referrers }: ReferrerTableProps) {
  if (referrers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <h3 className="text-sm font-medium mb-3">Top Referrers</h3>
        <p className="text-sm text-muted-foreground py-4 text-center">
          No referrer data yet
        </p>
      </div>
    )
  }

  const maxCount = referrers[0]?.count ?? 1

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-medium mb-3">Top Referrers</h3>
      <div className="space-y-2">
        {referrers.map((r) => (
          <div key={r.domain} className="flex items-center gap-3">
            <Globe size={16} strokeWidth={1.5} className="text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm truncate">{r.domain}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {r.count.toLocaleString()} ({r.percentage}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(r.count / maxCount) * 100}%`,
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
