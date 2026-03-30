import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { provisionUser } from '@/lib/auth/provision'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Rate-limit new account provisioning: 10 sign-ins per IP per hour
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const rateLimit = checkRateLimit(`auth-callback:${ip}`, 10, 60 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.redirect(new URL('/login?error=too_many_attempts', origin))
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // TOS accepted flag is stored in user_metadata when signing up via magic link
      const tosAccepted = data.user.user_metadata?.tos_accepted === true
      await provisionUser(data.user, { tosAccepted })
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth', origin))
}
