'use client'

import type { CountryEntry } from '@/lib/analytics/query'
import { countryCodeToFlag, countryCodeToName } from '@/lib/analytics/geo'

interface CountryChartProps {
  countries: CountryEntry[]
}

/**
 * Bar chart showing top 10 countries by view count.
 * Uses CSS-only bars and emoji flags — no charting library.
 */
export function CountryChart({ countries }: CountryChartProps) {
  if (countries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <h3 className="text-sm font-medium mb-3">Top Countries</h3>
        <p className="text-sm text-muted-foreground py-4 text-center">
          No geographic data yet
        </p>
      </div>
    )
  }

  const maxCount = countries[0]?.count ?? 1

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <h3 className="text-sm font-medium mb-3">Top Countries</h3>
      <div className="space-y-2">
        {countries.map((entry) => (
          <div key={entry.countryCode} className="flex items-center gap-3">
            <span className="shrink-0 text-base" aria-hidden="true">
              {countryCodeToFlag(entry.countryCode)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm truncate">
                  {countryCodeToName(entry.countryCode)}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {entry.count.toLocaleString()} ({entry.percentage}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(entry.count / maxCount) * 100}%`,
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
