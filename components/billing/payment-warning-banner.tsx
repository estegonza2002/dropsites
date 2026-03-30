'use client'

import { AlertTriangle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentWarningBannerProps {
  /** ISO date string for when the grace period expires */
  gracePeriodEndsAt: string
  /** URL to the Stripe Customer Portal for updating payment method */
  portalUrl: string
}

function getDaysRemaining(endsAt: string): number {
  const now = Date.now()
  const end = new Date(endsAt).getTime()
  const diffMs = end - now
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}

export function PaymentWarningBanner({
  gracePeriodEndsAt,
  portalUrl,
}: PaymentWarningBannerProps) {
  const daysRemaining = getDaysRemaining(gracePeriodEndsAt)

  return (
    <div
      role="alert"
      className="flex w-full items-center gap-3 border-b px-4 py-3"
      style={{
        backgroundColor: 'var(--color-warning-subtle)',
        borderColor: 'var(--color-warning-muted)',
      }}
    >
      <AlertTriangle
        className="shrink-0"
        size={20}
        strokeWidth={1.5}
        style={{ color: 'var(--color-warning)' }}
      />
      <p className="flex-1 text-sm font-medium" style={{ color: 'var(--color-warning)' }}>
        Your payment failed. Update your card within{' '}
        <strong>
          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
        </strong>{' '}
        to avoid losing access.
      </p>
      <a href={portalUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          Update card
          <ExternalLink data-icon="inline-end" size={14} strokeWidth={1.5} />
        </Button>
      </a>
    </div>
  )
}
