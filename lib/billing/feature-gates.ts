import { getWorkspaceProfile } from '@/lib/limits/get-profile'

/**
 * Features that are gated behind specific plan tiers.
 * Each feature maps to the minimum plan profile required.
 */
const FEATURE_REQUIREMENTS: Record<string, 'free' | 'pro' | 'team'> = {
  version_history: 'pro',
  custom_domains: 'pro',
  access_tokens: 'pro',
  webhooks: 'pro',
  namespace: 'pro',
  remove_badge: 'pro',
  sso: 'team',
}

/** Ordered tier levels for comparison. */
const TIER_ORDER: Record<string, number> = {
  free: 0,
  pro: 1,
  team: 2,
}

/**
 * Returns the minimum plan profile required for a given feature.
 * Returns 'free' if the feature is not gated.
 */
export function requiresProfile(feature: string): 'free' | 'pro' | 'team' {
  return FEATURE_REQUIREMENTS[feature] ?? 'free'
}

/**
 * Returns the list of all gated feature names.
 */
export function getGatedFeatures(): string[] {
  return Object.keys(FEATURE_REQUIREMENTS)
}

/**
 * Returns true if a profile tier meets or exceeds the required tier.
 */
export function tierMeetsRequirement(
  currentTier: string,
  requiredTier: string,
): boolean {
  const current = TIER_ORDER[currentTier] ?? 0
  const required = TIER_ORDER[requiredTier] ?? 0
  return current >= required
}

/**
 * Returns true if the workspace's current plan includes the given feature.
 */
export async function isFeatureAvailable(
  workspaceId: string,
  feature: string,
): Promise<boolean> {
  const required = requiresProfile(feature)

  if (required === 'free') return true

  const profile = await getWorkspaceProfile(workspaceId)
  return tierMeetsRequirement(profile.name, required)
}
