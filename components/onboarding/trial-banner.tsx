'use client'

import Link from 'next/link'
import { Clock, ArrowUpRight } from 'lucide-react'

interface TrialBannerProps {
  daysLeft: number
  trialEndsAt: string
}

/**
 * "X days left in Pro trial" banner displayed in the dashboard layout.
 * Uses design tokens only — no hardcoded colours.
 */
export function TrialBanner({ daysLeft, trialEndsAt }: TrialBannerProps) {
  if (daysLeft <= 0) return null

  const isUrgent = daysLeft <= 3
  const formattedDate = new Date(trialEndsAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm"
      style={{
        backgroundColor: isUrgent
          ? 'var(--color-warning-subtle)'
          : 'var(--color-accent-subtle)',
        borderColor: isUrgent
          ? 'var(--color-warning-muted)'
          : 'var(--color-accent-muted)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Clock
          className="h-4 w-4 shrink-0"
          strokeWidth={1.5}
          style={{
            color: isUrgent ? 'var(--color-warning)' : 'var(--color-accent)',
          }}
        />
        <span className="truncate">
          <span className="font-medium">
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
          </span>{' '}
          left in your Pro trial
          <span className="hidden sm:inline text-muted-foreground">
            {' '}&middot; Ends {formattedDate}
          </span>
        </span>
      </div>
      <Link
        href="/settings/billing"
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-1 text-sm font-medium text-white transition-colors"
        style={{
          backgroundColor: 'var(--color-accent)',
        }}
      >
        Upgrade
        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
      </Link>
    </div>
  )
}
