import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, type ApiAuth } from './auth'
import { checkApiRateLimit, type RateLimitResult } from './rate-limit'
import { getRateLimitConfig } from './rate-limit-config'
import { apiError } from './response'

type RouteContext = { params: Promise<Record<string, string>> }

type ApiHandler = (
  req: NextRequest,
  ctx: RouteContext,
  auth: ApiAuth,
) => Promise<NextResponse>

/**
 * Apply rate limit headers to a response.
 */
function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set(
    'X-RateLimit-Reset',
    String(Math.floor(result.resetAt.getTime() / 1000)),
  )
  return response
}

/**
 * Higher-order function that wraps an API route handler with:
 * 1. Authentication (session or API key)
 * 2. Rate limiting (per-minute, daily, monthly)
 *
 * Usage:
 * ```ts
 * export const GET = withApiAuth(async (req, ctx, auth) => {
 *   // auth.userId, auth.workspaceId, auth.method available
 *   return apiSuccess({ ok: true })
 * })
 * ```
 */
export function withApiAuth(handler: ApiHandler) {
  return async (req: NextRequest, ctx: RouteContext): Promise<NextResponse> => {
    // 1. Authenticate
    const auth = await authenticateRequest(req)
    if (!auth) {
      return apiError('Unauthorized', 'unauthorized', 401)
    }

    // 2. Rate limit
    const rateLimitKey = auth.apiKeyId ?? auth.userId
    const config = await getRateLimitConfig(auth.workspaceId)
    const rateLimitResult = checkApiRateLimit(rateLimitKey, config)

    if (!rateLimitResult.allowed) {
      const resp = apiError(
        'Rate limit exceeded',
        'rate_limit_exceeded',
        429,
        { 'Retry-After': String(rateLimitResult.retryAfter ?? 60) },
      )
      return applyRateLimitHeaders(resp, rateLimitResult)
    }

    // 3. Execute handler
    try {
      const response = await handler(req, ctx, auth)
      return applyRateLimitHeaders(response, rateLimitResult)
    } catch (err) {
      console.error('API handler error:', err)
      const resp = apiError('Internal server error', 'internal_error', 500)
      return applyRateLimitHeaders(resp, rateLimitResult)
    }
  }
}

/**
 * Rate-limit-only wrapper (no auth required, uses IP-based limiting).
 * Useful for public endpoints that still need rate protection.
 */
export function withRateLimit(handler: (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>) {
  return async (req: NextRequest, ctx: RouteContext): Promise<NextResponse> => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const config = { perMinute: 30, daily: 1000, monthly: 10000, burstMultiplier: 3 }
    const rateLimitResult = checkApiRateLimit(`ip:${ip}`, config)

    if (!rateLimitResult.allowed) {
      const resp = apiError(
        'Rate limit exceeded',
        'rate_limit_exceeded',
        429,
        { 'Retry-After': String(rateLimitResult.retryAfter ?? 60) },
      )
      return applyRateLimitHeaders(resp, rateLimitResult)
    }

    try {
      const response = await handler(req, ctx)
      return applyRateLimitHeaders(response, rateLimitResult)
    } catch (err) {
      console.error('API handler error:', err)
      const resp = apiError('Internal server error', 'internal_error', 500)
      return applyRateLimitHeaders(resp, rateLimitResult)
    }
  }
}
