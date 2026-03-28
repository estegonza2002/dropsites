/**
 * General-purpose sliding-window rate limiter (in-memory).
 *
 * Re-exports from lib/auth/rate-limit.ts for convenience. The brute-force
 * password preset lives here alongside the generic check function.
 *
 * NOTE: Process-local. For multi-process deployments, back with Redis.
 */

export {
  checkRateLimit,
  type RateLimitResult,
} from '@/lib/auth/rate-limit'

import { checkRateLimit, type RateLimitResult } from '@/lib/auth/rate-limit'

/**
 * Brute-force protection: 5 attempts per IP+slug per 15 minutes.
 */
export function passwordBruteForceLimit(
  ip: string,
  slug: string,
): RateLimitResult {
  return checkRateLimit(
    `pw-brute:${ip}:${slug}`,
    5,
    15 * 60 * 1000,
  )
}
