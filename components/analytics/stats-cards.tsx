'use client'

import { Eye, Calendar, ExternalLink } from 'lucide-react'
import type { ViewStats } from '@/lib/analytics/query'

interface StatsCardsProps {
  stats: ViewStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Views',
      value: stats.totalViews.toLocaleString(),
      icon: Eye,
    },
    {
      label: 'Active Days',
      value: stats.uniqueDays.toLocaleString(),
      icon: Calendar,
    },
    {
      label: 'Top Referrer',
      value: stats.topReferrer ?? 'Direct',
      icon: ExternalLink,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-border bg-background p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <card.icon size={16} strokeWidth={1.5} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {card.label}
            </span>
          </div>
          <p className="text-xl font-medium truncate">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
