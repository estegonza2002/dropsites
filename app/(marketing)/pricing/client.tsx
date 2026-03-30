'use client'

import { useRouter } from 'next/navigation'
import { PricingTable } from '@/components/billing/pricing-table'

export function PricingPageClient() {
  const router = useRouter()

  function handleSelectPlan(plan: 'free' | 'pro' | 'team', interval: 'month' | 'year') {
    if (plan === 'free') {
      router.push('/login')
      return
    }
    // For paid plans, redirect to login/signup with plan context
    router.push(
      `/login?redirect=${encodeURIComponent(`/dashboard/settings/billing?plan=${plan}&interval=${interval}`)}`,
    )
  }

  return (
    <PricingTable
      onSelectPlan={handleSelectPlan}
      showActions={true}
    />
  )
}
