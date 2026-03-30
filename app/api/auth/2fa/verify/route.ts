import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyTotp } from '@/lib/auth/totp'

// POST /api/auth/2fa/verify — confirm TOTP code and activate 2FA
// Must be called after /api/auth/2fa/setup with a valid TOTP code.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { code } = body

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
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
  const pendingSecret = prefs.totp_secret_pending as string | undefined

  if (!pendingSecret) {
    return NextResponse.json(
      { error: 'No pending 2FA setup found. Call /api/auth/2fa/setup first.' },
      { status: 400 },
    )
  }

  if (!verifyTotp(pendingSecret, code.trim())) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  // Activate 2FA — move pending secret to active
  await admin
    .from('users')
    .update({
      notification_prefs: {
        ...prefs,
        totp_enabled: true,
        totp_secret: pendingSecret,
        backup_codes: prefs.backup_codes_pending ?? [],
        totp_secret_pending: null,
        backup_codes_pending: null,
      },
    })
    .eq('id', user.id)

  await admin.from('audit_log').insert({
    action: 'auth.2fa_enabled',
    actor_id: user.id,
    target_id: user.id,
    target_type: 'user',
    details: {},
  })

  return NextResponse.json({ ok: true })
}
