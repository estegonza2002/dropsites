import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/v1/auth/sessions — list active sessions for current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: sessions, error } = await admin.rpc('get_user_sessions', {
    user_uuid: user.id,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }

  // Get the current session ID to mark it
  const { data: { session: currentSession } } = await supabase.auth.getSession()

  return NextResponse.json({
    sessions: (sessions ?? []).map((s: {
      id: string
      user_agent: string | null
      ip: string | null
      created_at: string
      updated_at: string
      not_after: string | null
    }) => ({
      id: s.id,
      userAgent: s.user_agent,
      ipHash: s.ip ? hashIp(s.ip) : null,
      createdAt: s.created_at,
      lastActiveAt: s.updated_at,
      expiresAt: s.not_after,
      isCurrent: s.id === currentSession?.user?.id, // sessions share user context
    })),
    currentSessionId: currentSession?.user?.id ?? null,
  })
}

// DELETE /api/v1/auth/sessions — terminate session(s)
// Body: { id: string } | { all: true }
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as { id?: string; all?: boolean }
  const admin = createAdminClient()

  if (body.all) {
    // Terminate all sessions except current
    const { data: { session: current } } = await supabase.auth.getSession()
    if (!current) {
      return NextResponse.json({ error: 'No active session' }, { status: 400 })
    }
    // Use signOut with 'others' scope — terminates all sessions except the one
    // identified by the current access token
    const { error } = await admin.auth.admin.signOut(current.access_token, 'others')
    if (error) {
      return NextResponse.json({ error: 'Failed to terminate sessions' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (body.id) {
    const { error } = await admin.rpc('terminate_session', { session_id: body.id })
    if (error) {
      return NextResponse.json({ error: 'Failed to terminate session' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Provide id or all:true' }, { status: 400 })
}

// Hash last octet of IP for display — no PII stored
function hashIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`
  }
  // IPv6 — show prefix only
  const segments = ip.split(':')
  return segments.slice(0, 3).join(':') + ':…'
}
