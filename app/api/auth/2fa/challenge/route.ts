import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTotp, verifyBackupCode } from '@/lib/auth/totp'

// POST /api/auth/2fa/challenge — verify a TOTP code or backup code during sign-in
// Body: { code: string; type: 'totp' | 'backup' }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { code?: string; type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { code, type } = body

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  if (type !== 'totp' && type !== 'backup') {
    return NextResponse.json(
      { error: 'type must be "totp" or "backup"' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: userData, error: userError } = await admin
    .from('users')
    .select('notification_prefs')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const prefs = (userData.notification_prefs as Record<string, unknown>) ?? {}

  if (!prefs.totp_enabled) {
    return NextResponse.json({ error: '2FA is not enabled for this account' }, { status: 400 })
  }

  let valid = false

  if (type === 'totp') {
    const secret = prefs.totp_secret as string | undefined
    if (!secret) {
      return NextResponse.json({ error: '2FA configuration error' }, { status: 500 })
    }
    valid = verifyTotp(secret, code.trim())
  } else {
    valid = await verifyBackupCode(user.id, code.trim())
  }

  if (!valid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  await admin.from('audit_log').insert({
    action: 'auth.2fa_challenge_passed',
    actor_id: user.id,
    target_id: user.id,
    target_type: 'user',
    details: { type },
  })

  return NextResponse.json({ ok: true })
}
