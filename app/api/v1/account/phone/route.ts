import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/v1/account/phone
 *
 * Body: { action: 'send-otp', phone: string }
 *    or { action: 'verify-otp', phone: string, otp: string }
 *
 * In production, the send-otp action sends an OTP via Twilio.
 * For now this is a stub that stores the phone and generates a test OTP.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action?: string; phone?: string; otp?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, phone, otp } = body

  if (!action || !phone) {
    return NextResponse.json({ error: 'Missing action or phone' }, { status: 400 })
  }

  // Basic E.164-ish validation
  const cleaned = phone.replace(/[\s()-]/g, '')
  if (!/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
    return NextResponse.json(
      { error: 'Invalid phone number. Use international format, e.g. +15551234567' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  if (action === 'send-otp') {
    // Store phone (unverified) and generate OTP
    // In production, this would call Twilio to send the OTP via SMS.
    // For now, store a hash of a deterministic test OTP.
    const testOtp = '123456' // Replaced by Twilio in production
    const otpHash = Buffer.from(testOtp).toString('base64')

    // Store phone number and OTP hash temporarily
    // Using notification_prefs to store the pending OTP (temporary approach)
    const { data: userRow } = await admin
      .from('users')
      .select('notification_prefs')
      .eq('id', user.id)
      .single()

    const currentPrefs = (userRow?.notification_prefs ?? {}) as Record<string, unknown>

    await admin
      .from('users')
      .update({
        phone_number: cleaned,
        phone_verified_at: null,
        notification_prefs: {
          ...currentPrefs,
          _pending_otp: otpHash,
          _otp_sent_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({ success: true, message: 'Verification code sent' })
  }

  if (action === 'verify-otp') {
    if (!otp) {
      return NextResponse.json({ error: 'Missing OTP' }, { status: 400 })
    }

    // Retrieve stored OTP
    const { data: userRow } = await admin
      .from('users')
      .select('notification_prefs, phone_number')
      .eq('id', user.id)
      .single()

    const currentPrefs = (userRow?.notification_prefs ?? {}) as Record<string, unknown>
    const storedHash = currentPrefs._pending_otp as string | undefined
    const sentAt = currentPrefs._otp_sent_at as string | undefined

    if (!storedHash || !sentAt) {
      return NextResponse.json({ error: 'No pending verification. Send a code first.' }, { status: 400 })
    }

    // Check expiry (10 minutes)
    const elapsed = Date.now() - new Date(sentAt).getTime()
    if (elapsed > 10 * 60 * 1000) {
      return NextResponse.json({ error: 'Verification code expired. Send a new one.' }, { status: 400 })
    }

    // Verify OTP
    const otpHash = Buffer.from(otp).toString('base64')
    if (otpHash !== storedHash) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Verify phone matches
    if (userRow?.phone_number !== cleaned) {
      return NextResponse.json({ error: 'Phone number mismatch' }, { status: 400 })
    }

    // Clear OTP and mark verified
    const { _pending_otp: _a, _otp_sent_at: _b, ...cleanPrefs } = currentPrefs

    await admin
      .from('users')
      .update({
        phone_verified_at: new Date().toISOString(),
        notification_prefs: cleanPrefs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    return NextResponse.json({ success: true, verified: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
