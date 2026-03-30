/**
 * Stripe product/price mapping for DropSites plans.
 *
 * Price IDs are loaded from environment variables so they can differ
 * between Stripe test-mode and live-mode without code changes.
 */

export type PlanProfile = 'free' | 'pro' | 'team'
export type BillingInterval = 'month' | 'year'

interface PriceMapping {
  profile: PlanProfile
  interval: BillingInterval
  envKey: string
  fallback: string
}

const PRICE_MAP: PriceMapping[] = [
  { profile: 'pro', interval: 'month', envKey: 'STRIPE_PRICE_PRO_MONTHLY', fallback: 'price_pro_monthly' },
  { profile: 'pro', interval: 'year', envKey: 'STRIPE_PRICE_PRO_ANNUAL', fallback: 'price_pro_annual' },
  { profile: 'team', interval: 'month', envKey: 'STRIPE_PRICE_TEAM_MONTHLY', fallback: 'price_team_monthly' },
  { profile: 'team', interval: 'year', envKey: 'STRIPE_PRICE_TEAM_ANNUAL', fallback: 'price_team_annual' },
]

/**
 * Returns the Stripe Price ID for a given plan profile and billing interval.
 * Throws for `free` — free tier has no Stripe price.
 */
export function getStripePriceId(profile: string, interval: BillingInterval): string {
  if (profile === 'free') {
    throw new Error('Free tier does not have a Stripe price')
  }

  const entry = PRICE_MAP.find(
    (p) => p.profile === profile && p.interval === interval,
  )

  if (!entry) {
    throw new Error(`No price mapping for profile="${profile}" interval="${interval}"`)
  }

  return process.env[entry.envKey] ?? entry.fallback
}

/**
 * Returns the discount percentage for a billing interval.
 * Annual billing receives a 16% discount (roughly 2 months free).
 */
export function getDiscountPercentage(interval: BillingInterval): number {
  return interval === 'year' ? 16 : 0
}

/**
 * Map from a Stripe Price ID back to the limit_profile name.
 * Used by webhook handlers to determine which profile to assign.
 */
export function getProfileForPriceId(priceId: string): PlanProfile | null {
  for (const entry of PRICE_MAP) {
    const envPrice = process.env[entry.envKey] ?? entry.fallback
    if (envPrice === priceId) return entry.profile
  }
  return null
}
