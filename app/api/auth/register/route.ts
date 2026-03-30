import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPasswordStrength } from '@/lib/auth/password'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/auth/register
 * Creates a new account via Supabase Auth (email + password).
 * Sends a verification email; user must confirm before signing in.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  const rateLimit = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 },
    )
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: string
    password?: string
  }

  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 },
    )
  }

  const strength = checkPasswordStrength(password)
  if (strength.score < 2) {
    return NextResponse.json(
      { error: strength.feedback ?? 'Please choose a stronger password' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    // Map Supabase errors to user-friendly messages without leaking internals
    if (error.message.toLowerCase().includes('already registered')) {
      // Return 200 to avoid account enumeration
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
