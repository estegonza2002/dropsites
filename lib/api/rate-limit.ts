import type { RateLimitConfig } from './rate-limit-config'

/**
 * In-memory sliding window rate limiter for API endpoints.
 *
 * Supports per-minute, daily, and monthly windows with burst allowance.
 * Process-local — upgrade to Redis/Upstash for multi-process deployments.
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: Date
  retryAfter?: number
}

interface WindowEntry {
  count: number
  resetAt: number // unix ms
}

const minuteStore = new Map<string, WindowEntry>()
const dailyStore = new Map<string, WindowEntry>()
const monthlyStore = new Map<string, WindowEntry>()

const ONE_MINUTE = 60 * 1000
const ONE_DAY = 24 * 60 * 60 * 1000
const ONE_MONTH = 30 * 24 * 60 * 60 * 1000

function cleanupStore(store: Map<string, WindowEntry>) {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}

function checkWindow(
  store: Map<string, WindowEntry>,
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  cleanupStore(store)
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      limit: maxRequests,
      resetAt: new Date(resetAt),
    }
  }

  if (existing.count >= maxRequests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      limit: maxRequests,
      resetAt: new Date(existing.resetAt),
      retryAfter,
    }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    limit: maxRequests,
    resetAt: new Date(existing.resetAt),
  }
}

/**
 * Check all rate limit windows for a given key identifier.
 *
 * The per-minute window allows burst up to burstMultiplier * perMinute,
 * but the base limit is reported in headers.
 *
 * Returns the most restrictive result across all windows.
 */
export function checkApiRateLimit(
  keyId: string,
  config: RateLimitConfig,
): RateLimitResult {
  // Burst: allow up to 3x per-minute in short bursts
  const burstLimit = config.perMinute * config.burstMultiplier
  const minuteResult = checkWindow(
    minuteStore,
    `min:${keyId}`,
    burstLimit,
    ONE_MINUTE,
  )

  const dailyResult = checkWindow(
    dailyStore,
    `day:${keyId}`,
    config.daily,
    ONE_DAY,
  )

  const monthlyResult = checkWindow(
    monthlyStore,
    `month:${keyId}`,
    config.monthly,
    ONE_MONTH,
  )

  // Return the most restrictive (first denied, or the one with least remaining)
  for (const result of [monthlyResult, dailyResult, minuteResult]) {
    if (!result.allowed) return result
  }

  // All allowed — report per-minute stats (using base limit, not burst)
  return {
    allowed: true,
    remaining: Math.max(0, config.perMinute - (burstLimit - minuteResult.remaining)),
    limit: config.perMinute,
    resetAt: minuteResult.resetAt,
  }
}

/**
 * Reset all in-memory rate limit stores (for testing).
 */
export function resetAllRateLimits(): void {
  minuteStore.clear()
  dailyStore.clear()
  monthlyStore.clear()
}
