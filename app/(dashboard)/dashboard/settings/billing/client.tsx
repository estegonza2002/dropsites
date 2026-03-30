'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PricingTable } from '@/components/billing/pricing-table'
import { PlanBadge } from '@/components/billing/plan-badge'

interface BillingSettingsClientProps {
  currentPlan: 'free' | 'pro' | 'team'
  workspaceId: string | null
  hasStripeCustomer: boolean
}

export function BillingSettingsClient({
  currentPlan,
  workspaceId,
  hasStripeCustomer,
}: BillingSettingsClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  async function handleSelectPlan(plan: 'free' | 'pro' | 'team', interval: 'month' | 'year') {
    if (!workspaceId || plan === currentPlan) return

    setLoading(true)
    try {
      if (plan === 'free') {
        // Downgrade to free = cancel subscription
        await handleCancel()
        return
      }

      const resp = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, plan, interval }),
      })

      const json = await resp.json()
      if (json.url) {
        window.location.href = json.url
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!workspaceId) return

    setCancelLoading(true)
    try {
      await fetch('/api/v1/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
      router.refresh()
    } catch {
      // Silently handle
    } finally {
      setCancelLoading(false)
    }
  }

  async function handleManagePayment() {
    if (!workspaceId) return

    try {
      const resp = await fetch('/api/v1/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })

      const json = await resp.json()
      if (json.url) {
        window.location.href = json.url
      }
    } catch {
      // Silently handle
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-medium">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription, plan, and payment method.
        </p>
      </div>

      {/* Current plan summary */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-medium">Current plan</h2>
            <div className="flex items-center gap-2">
              <PlanBadge plan={currentPlan} />
              <span className="text-sm text-muted-foreground">
                {currentPlan === 'free'
                  ? 'No active subscription'
                  : `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan active`}
              </span>
            </div>
          </div>
          {hasStripeCustomer && (
            <Button variant="outline" size="sm" onClick={handleManagePayment}>
              <CreditCard className="size-4" strokeWidth={1.5} data-icon="inline-start" />
              Manage payment
              <ExternalLink className="size-3" strokeWidth={1.5} data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Plan comparison */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium">Choose a plan</h2>
        <PricingTable
          currentPlan={currentPlan}
          onSelectPlan={handleSelectPlan}
          showActions={true}
          loading={loading}
        />
      </div>

      {/* Cancel subscription */}
      {currentPlan !== 'free' && (
        <>
          <Separator />
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <h2 className="text-sm font-medium">Cancel subscription</h2>
            <p className="text-sm text-muted-foreground">
              Cancelling will downgrade your workspace to the Free plan at the end
              of your current billing period. Your deployments will remain active
              but features above Free limits will become unavailable.
            </p>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" size="sm" disabled={cancelLoading}>
                    {cancelLoading ? 'Cancelling...' : 'Cancel subscription'}
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your workspace will be downgraded to the Free plan at the end of
                    the current billing period. Features requiring a paid plan will
                    become unavailable. You can re-subscribe at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>
                    Confirm cancellation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  )
}
