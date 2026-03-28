import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = { params: Promise<{ token: string }> }

// GET /api/v1/invitations/[token] — get invitation details (public, no auth required for viewing)
export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { token } = await context.params
  const admin = createAdminClient()

  const { data: member } = await admin
    .from('workspace_members')
    .select('id, workspace_id, email, role, invited_at, invite_expires_at, accepted_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (member.accepted_at) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 410 })
  }

  if (member.invite_expires_at && new Date(member.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }

  // Fetch workspace name
  const { data: workspace } = await admin
    .from('workspaces')
    .select('name')
    .eq('id', member.workspace_id)
    .single()

  return NextResponse.json({
    invitation: {
      email: member.email,
      role: member.role,
      workspace_name: workspace?.name ?? 'Unknown',
      expires_at: member.invite_expires_at,
    },
  })
}

// POST /api/v1/invitations/[token] — accept an invitation (requires auth)
export async function POST(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { token } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized — please sign in to accept' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('workspace_members')
    .select('id, workspace_id, email, accepted_at, invite_expires_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  if (member.accepted_at) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 410 })
  }

  if (member.invite_expires_at && new Date(member.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }

  // Verify email matches
  if (user.email?.toLowerCase() !== member.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'This invitation was sent to a different email address' },
      { status: 403 },
    )
  }

  // Accept the invitation
  const { error } = await admin
    .from('workspace_members')
    .update({
      user_id: user.id,
      accepted_at: new Date().toISOString(),
      invite_token: null,
      invite_expires_at: null,
    })
    .eq('id', member.id)

  if (error) {
    console.error('Accept invitation error:', error)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    workspace_id: member.workspace_id,
  })
}
