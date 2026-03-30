import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTotpSecret, hashBackupCodes } from '@/lib/auth/totp'

// POST /api/auth/2fa/setup — generate a new TOTP secret and backup codes
// Stores a pending secret until verified; does not enable 2FA yet.
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

  if (prefs.totp_enabled) {
    return NextResponse.json(
      { error: '2FA is already enabled. Disable it first to set up again.' },
      { status: 409 },
    )
  }

  const { secret, qrCodeUrl, backupCodes } = generateTotpSecret(user.email ?? user.id)
  const hashedCodes = hashBackupCodes(backupCodes)

  // Store pending secret + hashed backup codes — not active until verified
  await admin
    .from('users')
    .update({
      notification_prefs: {
        ...prefs,
        totp_secret_pending: secret,
        backup_codes_pending: hashedCodes,
      },
    })
    .eq('id', user.id)

  return NextResponse.json({ secret, qrCodeUrl, backupCodes })
}
