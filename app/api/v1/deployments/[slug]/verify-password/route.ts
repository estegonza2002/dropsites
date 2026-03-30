import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPassword, createVerificationToken } from '@/lib/serving/password'
import { passwordBruteForceLimit } from '@/lib/rate-limit'
import { dispatch } from '@/lib/notifications/dispatcher'

type RouteContext = { params: Promise<{ slug: string }> }

/**
 * POST /api/v1/deployments/[slug]/verify-password
 *
 * Public endpoint — no auth required. Used by the password prompt page.
 * Verifies a password against the deployment's stored hash.
 * On success, returns a signed cookie token granting access.
 */
export async function POST(
  req: NextRequest,
  ctx: RouteContext,
): Promise<NextResponse> {
  const { slug } = await ctx.params

  // ── Rate limiting ──────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  const rateLimit = passwordBruteForceLimit(ip, slug)
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(
      (rateLimit.resetAt.getTime() - Date.now()) / 1000,
    )
    return NextResponse.json(
      {
        error: 'Too many attempts. Please try again later.',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
      },
    )
  }

  // ── Parse body ─────────────────────────────────────────────────────
  let body: { password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const password = typeof body.password === 'string' ? body.password : ''
  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 })
  }

  // ── Resolve deployment ─────────────────────────────────────────────
  const admin = createAdminClient()
  const { data: deployment } = await admin
    .from('deployments')
    .select('id, password_hash, owner_id')
    .eq('slug', slug)
    .is('archived_at', null)
    .single()

  if (!deployment || !deployment.password_hash) {
    // Don't reveal whether the deployment exists
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  // ── Verify password ────────────────────────────────────────────────
  const isValid = await verifyPassword(password, deployment.password_hash)

  if (!isValid) {
    // Log failed attempt to audit log
    await admin.from('audit_log').insert({
      action: 'deployment.password.failed',
      actor_id: null,
      target_id: deployment.id,
      target_type: 'deployment',
      details: { slug, ip },
    })

    // Dispatch brute-force alert to deployment owner when the limit is exhausted
    if (rateLimit.remaining === 0 && deployment.owner_id) {
      void dispatch(deployment.owner_id, 'bruteForceAlert', {
        slug,
        deploymentId: deployment.id,
        ip,
        attempts: 5,
      }).catch(() => {})
    }

    return NextResponse.json(
      {
        error: 'Incorrect password',
        remaining: rateLimit.remaining,
      },
      { status: 401 },
    )
  }

  // ── Success: create verification token cookie ──────────────────────
  const token = await createVerificationToken(deployment.id)
  const cookieName = `ds-auth-${deployment.id}`

  const response = NextResponse.json({ ok: true })
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
  })

  return response
}
