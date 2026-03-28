import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'

type RouteContext = { params: Promise<{ id: string; userId: string }> }

// PATCH /api/v1/workspaces/[id]/members/[userId] — update member role
export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id, userId: targetUserId } = await context.params
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
    return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 })
  }

  // Cannot change own role
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const newRole = body.role as 'publisher' | 'viewer' | undefined
  if (!newRole || !['publisher', 'viewer'].includes(newRole)) {
    return NextResponse.json({ error: 'Role must be publisher or viewer' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: member, error } = await admin
    .from('workspace_members')
    .update({ role: newRole })
    .eq('workspace_id', id)
    .eq('user_id', targetUserId)
    .select('id, user_id, email, role')
    .single()

  if (error || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  return NextResponse.json({ member })
}

// DELETE /api/v1/workspaces/[id]/members/[userId] — remove member
export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { id, userId: targetUserId } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = await getUserRole(user.id, id)

  // Owners can remove anyone (except themselves); members can remove themselves
  const isSelf = targetUserId === user.id
  if (!isSelf && role !== 'owner') {
    return NextResponse.json({ error: 'Only owners can remove members' }, { status: 403 })
  }

  // Cannot remove the workspace owner
  const admin = createAdminClient()
  const { data: ws } = await admin.from('workspaces').select('owner_id').eq('id', id).single()
  if (ws?.owner_id === targetUserId) {
    return NextResponse.json({ error: 'Cannot remove workspace owner' }, { status: 400 })
  }

  // Transfer deployments owned by this user to the workspace owner
  await admin
    .from('deployments')
    .update({ owner_id: ws!.owner_id })
    .eq('workspace_id', id)
    .eq('owner_id', targetUserId)

  // Remove membership
  const { error } = await admin
    .from('workspace_members')
    .delete()
    .eq('workspace_id', id)
    .eq('user_id', targetUserId)

  if (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
