import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  PUBLISHER_NOTIFICATION_CATEGORIES,
  type NotificationPrefs,
} from '@/lib/notifications/types'

const VALID_KEYS = new Set(PUBLISHER_NOTIFICATION_CATEGORIES.map((c) => c.key))

// GET /api/v1/notifications/preferences — return current user prefs
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
  const { data: userRow } = await admin
    .from('users')
    .select('notification_prefs')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ prefs: userRow?.notification_prefs ?? {} })
}

// PATCH /api/v1/notifications/preferences — update notification prefs
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { prefs?: NotificationPrefs }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.prefs || typeof body.prefs !== 'object') {
    return NextResponse.json({ error: 'Missing prefs object' }, { status: 400 })
  }

  // Validate and sanitize — only allow known keys with boolean values
  const sanitized: NotificationPrefs = {}
  for (const [key, value] of Object.entries(body.prefs)) {
    if (!VALID_KEYS.has(key)) continue
    if (typeof value !== 'object' || value === null) continue
    const v = value as { email?: unknown; sms?: unknown }
    sanitized[key] = {
      email: typeof v.email === 'boolean' ? v.email : true,
      sms: typeof v.sms === 'boolean' ? v.sms : false,
    }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('users')
    .update({
      notification_prefs: sanitized as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    console.error('Update notification prefs error:', error)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }

  return NextResponse.json({ prefs: sanitized })
}
