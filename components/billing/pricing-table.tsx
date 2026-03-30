'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type PlanKey = 'free' | 'pro' | 'team'

interface PricingPlan {
  key: PlanKey
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number
  features: string[]
  highlighted?: boolean
}

const PLANS: PricingPlan[] = [
  {
    key: 'free',
    name: 'Free',
    description: 'For personal projects and experiments.',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      'Up to 5 deployments',
      '50 MB per deployment',
      '1 GB total storage',
      '5 GB monthly bandwidth',
      'Basic analytics',
      'DropSites badge',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'For professionals and power users.',
    monthlyPrice: 12,
    annualPrice: 120,
    highlighted: true,
    features: [
      'Unlimited deployments',
      '500 MB per deployment',
      '50 GB total storage',
      '100 GB monthly bandwidth',
      'Version history',
      'Custom domains',
      'Access tokens',
      'Webhooks',
      'Custom namespace',
      'Remove badge',
      'Priority support',
    ],
  },
  {
    key: 'team',
    name: 'Team',
    description: 'For teams and organizations.',
    monthlyPrice: 29,
    annualPrice: 290,
    features: [
      'Everything in Pro',
      '2 GB per deployment',
      '200 GB total storage',
      '500 GB monthly bandwidth',
      'SSO integration',
      'Workspace roles',
      'Audit log',
      'White-label options',
      'Dedicated support',
    ],
  },
]

interface PricingTableProps {
  /** Currently active plan for the workspace. */
  currentPlan?: PlanKey
  /** Callback when user clicks a plan CTA button. */
  onSelectPlan?: (plan: PlanKey, interval: 'month' | 'year') => void
  /** Show CTA buttons (false for read-only display). */
  showActions?: boolean
  /** Loading state for action buttons. */
  loading?: boolean
}

export function PricingTable({
  currentPlan,
  onSelectPlan,
  showActions = true,
  loading = false,
}: PricingTableProps) {
  const [annual, setAnnual] = useState(false)

  function getPrice(plan: PricingPlan): string {
    if (plan.monthlyPrice === 0) return 'Free'
    const price = annual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice
    return `$${price}`
  }

  function getCtaLabel(planKey: PlanKey): string {
    if (!currentPlan || currentPlan === planKey) return 'Current plan'
    const tierOrder: Record<PlanKey, number> = { free: 0, pro: 1, team: 2 }
    return tierOrder[planKey] > tierOrder[currentPlan] ? 'Upgrade' : 'Downgrade'
  }

  function isCurrentPlan(planKey: PlanKey): boolean {
    return currentPlan === planKey
  }

  return (
    <div className="space-y-6">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={cn(
            'text-sm',
            !annual ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}
        >
          Monthly
        </span>
        <Switch
          checked={annual}
          onCheckedChange={setAnnual}
          aria-label="Toggle annual billing"
        />
        <span
          className={cn(
            'text-sm',
            annual ? 'font-medium text-foreground' : 'text-muted-foreground',
          )}
        >
          Annual
        </span>
        {annual && (
          <Badge variant="secondary" className="text-xs">
            Save 16%
          </Badge>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.key}
            className={cn(
              plan.highlighted &&
                !isCurrentPlan(plan.key) &&
                'ring-2 ring-[var(--color-accent)]',
              isCurrentPlan(plan.key) && 'ring-2 ring-foreground/20',
            )}
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{plan.name}</CardTitle>
                {isCurrentPlan(plan.key) && (
                  <Badge variant="outline" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-2xl font-medium">{getPrice(plan)}</span>
                {plan.monthlyPrice > 0 && (
                  <span className="text-sm text-muted-foreground">/month</span>
                )}
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            {showActions && (
              <CardFooter>
                <Button
                  className="w-full"
                  variant={
                    isCurrentPlan(plan.key)
                      ? 'outline'
                      : plan.highlighted
                        ? 'default'
                        : 'secondary'
                  }
                  disabled={isCurrentPlan(plan.key) || loading}
                  onClick={() =>
                    onSelectPlan?.(plan.key, annual ? 'year' : 'month')
                  }
                >
                  {getCtaLabel(plan.key)}
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
