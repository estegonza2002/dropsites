import { createAdminClient } from '@/lib/supabase/admin'

export interface RateLimitConfig {
  perMinute: number
  daily: number
  monthly: number
  /** Burst multiplier applied to per-minute limit for short spikes */
  burstMultiplier: number
}

/**
 * Default rate limit configs per profile tier.
 * Used as fallback when limit_profiles table is unavailable.
 * Never hardcode these in route handlers — always call getRateLimitConfig.
 */
const FALLBACK_CONFIGS: Record<string, RateLimitConfig> = {
  free: { perMinute: 30, daily: 1000, monthly: 10000, burstMultiplier: 3 },
  pro: { perMinute: 60, daily: 5000, monthly: 50000, burstMultiplier: 3 },
  team: { perMinute: 120, daily: 10000, monthly: 100000, burstMultiplier: 3 },
}

/**
 * Load rate limit config from the limit_profiles table for a workspace.
 * Falls back to built-in defaults when the DB is unavailable.
 */
export async function getRateLimitConfig(
  workspaceId: string,
): Promise<RateLimitConfig> {
  try {
    const admin = createAdminClient()

    const { data: workspace } = await admin
      .from('workspaces')
      .select('limit_profile')
      .eq('id', workspaceId)
      .single()

    if (!workspace) return FALLBACK_CONFIGS.free

    const profileName = workspace.limit_profile

    const { data: profile } = await admin
      .from('limit_profiles')
      .select('api_rpm, api_daily_quota, api_monthly_quota')
      .eq('name', profileName)
      .single()

    if (profile) {
      return {
        perMinute: profile.api_rpm,
        daily: profile.api_daily_quota,
        monthly: profile.api_monthly_quota,
        burstMultiplier: 3,
      }
    }

    return FALLBACK_CONFIGS[profileName] ?? FALLBACK_CONFIGS.free
  } catch {
    return FALLBACK_CONFIGS.free
  }
}
