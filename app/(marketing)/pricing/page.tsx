import type { Metadata } from 'next'
import { PricingPageClient } from './client'

export const metadata: Metadata = {
  title: 'Pricing — DropSites',
  description:
    'Simple, transparent pricing for DropSites. Free for personal use, Pro for professionals, Team for organizations.',
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-medium tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Start free. Upgrade when you need more power. No surprises.
        </p>
      </div>

      <PricingPageClient />

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          All plans include SSL, CDN delivery, and instant deploys.
        </p>
        <p className="text-xs text-muted-foreground">
          Prices shown in USD. Annual billing saves 16%.
        </p>
      </div>
    </div>
  )
}
