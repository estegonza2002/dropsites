import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/v1/workspaces/[id]/members — list members
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id, id)
  if (!role) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const admin = createAdminClient()
  const { data: members, error } = await admin
    .from('workspace_members')
    .select('id, workspace_id, user_id, email, role, invited_at, accepted_at, invite_expires_at')
    .eq('workspace_id', id)
    .order('accepted_at', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('List members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Fetch display names for accepted members
  const userIds = (members ?? []).filter((m) => m.user_id).map((m) => m.user_id!)
  let userMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, display_name, email')
      .in('id', userIds)

    userMap = new Map((users ?? []).map((u) => [u.id, u.display_name || u.email]))
  }

  const enriched = (members ?? []).map((m) => ({
    ...m,
    display_name: m.user_id ? userMap.get(m.user_id) ?? m.email : m.email,
    is_pending: !m.accepted_at,
  }))

  return NextResponse.json({ members: enriched })
}

// POST /api/v1/workspaces/[id]/members — invite a member
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id, id)
  if (role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can invite members' }, { status: 403 })
  }

  let body: { email?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const inviteRole = body.role as 'publisher' | 'viewer' | undefined
  if (inviteRole && !['publisher', 'viewer'].includes(inviteRole)) {
    return NextResponse.json({ error: 'Role must be publisher or viewer' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Check if already a member
  const { data: existing } = await admin
    .from('workspace_members')
    .select('id, accepted_at')
    .eq('workspace_id', id)
    .eq('email', email)
    .maybeSingle()

  if (existing?.accepted_at) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
  }

  // Generate invite token
  const inviteToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

  if (existing && !existing.accepted_at) {
    // Update existing pending invitation
    const { error } = await admin
      .from('workspace_members')
      .update({
        role: inviteRole ?? 'viewer',
        invite_token: inviteToken,
        invite_expires_at: expiresAt,
        invited_by: user.id,
        invited_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Update invitation error:', error)
      return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
    }
  } else {
    // Check if user already exists in our system
    const { data: existingUser } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    const { error } = await admin.from('workspace_members').insert({
      workspace_id: id,
      user_id: existingUser?.id ?? null,
      email,
      role: inviteRole ?? 'viewer',
      invited_by: user.id,
      invite_token: inviteToken,
      invite_expires_at: expiresAt,
    })

    if (error) {
      console.error('Create invitation error:', error)
      return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
    }
  }

  // TODO: Send invitation email via Resend (S26)

  return NextResponse.json({
    success: true,
    invite_token: inviteToken,
    message: `Invitation sent to ${email}`,
  }, { status: 201 })
}
