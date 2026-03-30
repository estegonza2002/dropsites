import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/auth/2fa/disable — remove 2FA from account
export async function POST(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    return NextResponse.json({ error: '2FA is not currently enabled' }, { status: 400 })
  }

  // Remove all 2FA data
  const {
    totp_enabled: _enabled,
    totp_secret: _secret,
    backup_codes: _codes,
    totp_secret_pending: _pending,
    backup_codes_pending: _pendingCodes,
    ...remainingPrefs
  } = prefs

  await admin
    .from('users')
    .update({ notification_prefs: remainingPrefs })
    .eq('id', user.id)

  await admin.from('audit_log').insert({
    action: 'auth.2fa_disabled',
    actor_id: user.id,
    target_id: user.id,
    target_type: 'user',
    details: {},
  })

  return NextResponse.json({ ok: true })
}
