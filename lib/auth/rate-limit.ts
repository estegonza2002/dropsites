/**
 * In-memory rate limiter.
 *
 * Uses a sliding window counter per key. Entries are cleaned up lazily on
 * each check to prevent unbounded memory growth.
 *
 * NOTE: This is process-local. In a multi-process / multi-region deployment
 * this should be backed by Redis or Upstash. Sufficient for Phase 1.
 */

interface RateLimitEntry {
  count: number
  resetAt: number // unix ms
}

const store = new Map<string, RateLimitEntry>()

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    // New window
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxAttempts - 1, resetAt: new Date(resetAt) }
  }

  if (existing.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: new Date(existing.resetAt) }
  }

  existing.count += 1
  return {
    allowed: true,
    remaining: maxAttempts - existing.count,
    resetAt: new Date(existing.resetAt),
  }
}

// ── Presets ──────────────────────────────────────────────────────

/** 5 account-creation attempts per IP per hour */
export function accountCreationLimit(ip: string): RateLimitResult {
  return checkRateLimit(`account-create:${ip}`, 5, 60 * 60 * 1000)
}

/** 10 deployments per account per hour */
export function deploymentCreationHourlyLimit(userId: string): RateLimitResult {
  return checkRateLimit(`deploy-hourly:${userId}`, 10, 60 * 60 * 1000)
}

/** 50 deployments per account per day */
export function deploymentCreationDailyLimit(userId: string): RateLimitResult {
  return checkRateLimit(`deploy-daily:${userId}`, 50, 24 * 60 * 60 * 1000)
}
