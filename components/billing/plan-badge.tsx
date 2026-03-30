'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type PlanVariant = 'free' | 'pro' | 'team'

interface PlanBadgeProps {
  plan: PlanVariant
  className?: string
}

const PLAN_LABELS: Record<PlanVariant, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
}

/**
 * Small badge showing current plan name.
 * Free uses default (secondary) styling, Pro and Team use accent.
 */
export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const isAccent = plan === 'pro' || plan === 'team'

  return (
    <Badge
      variant={isAccent ? 'default' : 'secondary'}
      className={cn(
        isAccent && 'bg-[var(--color-accent)] text-white',
        className,
      )}
    >
      {PLAN_LABELS[plan]}
    </Badge>
  )
}
