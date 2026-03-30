import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTotpSecret, hashBackupCodes } from '@/lib/auth/totp'

// GET /api/auth/2fa/backup-codes — returns remaining backup code count
// Backup codes are stored as hashes and cannot be retrieved in plaintext after setup.
// Use POST to regenerate a fresh set.
export async function GET(): Promise<NextResponse> {
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
    return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
  }

  const storedCodes = (prefs.backup_codes as string[] | undefined) ?? []

  // Return empty array — plaintext codes are only shown at setup/regeneration time
  return NextResponse.json({
    codes: [],
    remaining: storedCodes.length,
  })
}

// POST /api/auth/2fa/backup-codes — regenerate backup codes
// Returns plaintext codes once; subsequent GETs only return count.
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
    return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
  }

  // Regenerate by re-using the backup code generation from generateTotpSecret
  const { backupCodes } = generateTotpSecret(user.id)
  const hashedCodes = hashBackupCodes(backupCodes)

  await admin
    .from('users')
    .update({
      notification_prefs: {
        ...prefs,
        backup_codes: hashedCodes,
      },
    })
    .eq('id', user.id)

  await admin.from('audit_log').insert({
    action: 'auth.2fa_backup_codes_regenerated',
    actor_id: user.id,
    target_id: user.id,
    target_type: 'user',
    details: {},
  })

  return NextResponse.json({ codes: backupCodes, remaining: backupCodes.length })
}
