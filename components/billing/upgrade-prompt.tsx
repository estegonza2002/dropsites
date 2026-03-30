'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpgradePromptProps {
  feature: string
  requiredPlan: string
  className?: string
}

/**
 * Inline prompt shown when a feature requires a higher plan.
 * Links to the billing settings page.
 */
export function UpgradePrompt({ feature, requiredPlan, className }: UpgradePromptProps) {
  const planLabel = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)

  return (
    <div
      className={`rounded-lg border border-dashed p-4 text-center space-y-2 ${className ?? ''}`}
    >
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{feature}</span> requires
        the {planLabel} plan.
      </p>
      <Button variant="outline" size="sm" render={<Link href="/dashboard/settings/billing" />}>
        Upgrade to {planLabel}
        <ArrowUpRight className="size-4" strokeWidth={1.5} data-icon="inline-end" />
      </Button>
    </div>
  )
}
