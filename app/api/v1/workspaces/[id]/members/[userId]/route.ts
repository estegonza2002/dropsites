import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import type { ApiAuth } from '@/lib/api/auth'

// PATCH /api/v1/workspaces/[id]/members/[userId] — update member role
export const PATCH = withApiAuth(async (req: NextRequest, ctx, auth: ApiAuth) => {
  const { id: workspaceId, userId: targetUserId } = await ctx.params

  const callerRole = await getUserRole(auth.userId, workspaceId)
  if (!callerRole) return apiError('Not found', 'not_found', 404)
  if (callerRole !== 'owner') {
    return apiError('Only workspace owners can update member roles', 'forbidden', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 'invalid_body', 400)
  }

  const newRole = typeof body.role === 'string' ? body.role : ''
  if (!['owner', 'publisher', 'viewer'].includes(newRole)) {
    return apiError(
      'role must be "owner", "publisher", or "viewer"',
      'invalid_field',
      400,
    )
  }

  // Cannot change own role
  if (targetUserId === auth.userId) {
    return apiError('Cannot change your own role', 'self_role_change', 400)
  }

  const admin = createAdminClient()

  // Find the member
  const { data: member, error: findError } = await admin
    .from('workspace_members')
    .select('id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUserId)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  if (findError || !member) {
    return apiError('Member not found', 'not_found', 404)
  }

  const previousRole = member.role

  const { data: updated, error: updateError } = await admin
    .from('workspace_members')
    .update({ role: newRole as 'owner' | 'publisher' | 'viewer' })
    .eq('id', member.id)
    .select('id, user_id, email, role, accepted_at')
    .single()

  if (updateError || !updated) {
    console.error('Update member role error:', updateError)
    return apiError('Failed to update member role', 'update_failed', 500)
  }

  await admin.from('audit_log').insert({
    action: 'workspace.member_role_change',
    actor_id: auth.userId,
    target_id: member.id,
    target_type: 'workspace_member',
    details: {
      workspace_id: workspaceId,
      user_id: targetUserId,
      previous_role: previousRole,
      new_role: newRole,
    },
  })

  return apiSuccess(updated)
})

// DELETE /api/v1/workspaces/[id]/members/[userId] — remove member
export const DELETE = withApiAuth(async (_req: NextRequest, ctx, auth: ApiAuth) => {
  const { id: workspaceId, userId: targetUserId } = await ctx.params

  const callerRole = await getUserRole(auth.userId, workspaceId)
  if (!callerRole) return apiError('Not found', 'not_found', 404)

  // Owners can remove anyone; members can remove themselves
  if (callerRole !== 'owner' && targetUserId !== auth.userId) {
    return apiError('Only workspace owners can remove other members', 'forbidden', 403)
  }

  // Cannot remove yourself if you are the sole owner
  if (targetUserId === auth.userId && callerRole === 'owner') {
    const admin = createAdminClient()
    const { count } = await admin
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('role', 'owner')
      .not('accepted_at', 'is', null)

    if ((count ?? 0) <= 1) {
      return apiError(
        'Cannot remove the last owner. Transfer ownership first.',
        'last_owner',
        400,
      )
    }
  }

  const admin = createAdminClient()

  // Find the member
  const { data: member, error: findError } = await admin
    .from('workspace_members')
    .select('id, role, email')
    .eq('workspace_id', workspaceId)
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (findError || !member) {
    return apiError('Member not found', 'not_found', 404)
  }

  const { error: deleteError } = await admin
    .from('workspace_members')
    .delete()
    .eq('id', member.id)

  if (deleteError) {
    console.error('Remove member error:', deleteError)
    return apiError('Failed to remove member', 'delete_failed', 500)
  }

  await admin.from('audit_log').insert({
    action: 'workspace.member_remove',
    actor_id: auth.userId,
    target_id: member.id,
    target_type: 'workspace_member',
    details: {
      workspace_id: workspaceId,
      user_id: targetUserId,
      role: member.role,
      email: member.email,
    },
  })

  return new Response(null, { status: 204 }) as unknown as import('next/server').NextResponse
})
