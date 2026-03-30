import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createInvite, listInvites } from '@/lib/beta/invites'

async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('notification_prefs')
    .eq('id', userId)
    .single()
  const prefs = data?.notification_prefs as Record<string, unknown> | null
  return Boolean(prefs?.is_admin)
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const invites = await listInvites()
    return NextResponse.json({ invites })
  } catch (err) {
    console.error('List beta invites error:', err)
    return NextResponse.json({ error: 'Failed to list invites' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { email?: string; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, notes } = body
  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  try {
    const invite = await createInvite(email, notes ?? '', user.id)
    return NextResponse.json({ invite }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create invite'
    console.error('Create beta invite error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
