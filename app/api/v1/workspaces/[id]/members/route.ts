import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import type { ApiAuth } from '@/lib/api/auth'
import { randomBytes } from 'crypto'

// POST /api/v1/workspaces/[id]/members — invite a member by email
export const POST = withApiAuth(async (req: NextRequest, ctx, auth: ApiAuth) => {
  const { id: workspaceId } = await ctx.params

  const role = await getUserRole(auth.userId, workspaceId)
  if (!role) return apiError('Not found', 'not_found', 404)
  if (role !== 'owner') {
    return apiError('Only workspace owners can invite members', 'forbidden', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 'invalid_body', 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return apiError('A valid email is required', 'invalid_field', 400)
  }

  const memberRole = typeof body.role === 'string' ? body.role : 'viewer'
  if (!['publisher', 'viewer'].includes(memberRole)) {
    return apiError(
      'role must be "publisher" or "viewer"',
      'invalid_field',
      400,
    )
  }

  const admin = createAdminClient()

  // Check if already a member
  const { data: existing } = await admin
    .from('workspace_members')
    .select('id, accepted_at')
    .eq('workspace_id', workspaceId)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    return apiError('User is already a member or has a pending invite', 'member_exists', 409)
  }

  // Look up user by email to set user_id if they exist
  const { data: existingUser } = await admin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  const inviteToken = randomBytes(32).toString('hex')
  const inviteExpiresAt = new Date()
  inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7) // 7-day expiry

  const { data: member, error } = await admin
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: existingUser?.id ?? null,
      email,
      role: memberRole as 'publisher' | 'viewer',
      invited_by: auth.userId,
      invited_at: new Date().toISOString(),
      invite_token: inviteToken,
      invite_expires_at: inviteExpiresAt.toISOString(),
    })
    .select('id, workspace_id, email, role, invited_at, invite_expires_at')
    .single()

  if (error || !member) {
    console.error('Invite member error:', error)
    return apiError('Failed to invite member', 'invite_failed', 500)
  }

  await admin.from('audit_log').insert({
    action: 'workspace.member_invite',
    actor_id: auth.userId,
    target_id: member.id,
    target_type: 'workspace_member',
    details: { email, role: memberRole, workspace_id: workspaceId },
  })

  return apiSuccess(member, 201)
})

// GET /api/v1/workspaces/[id]/members — list workspace members
export const GET = withApiAuth(async (_req: NextRequest, ctx, auth: ApiAuth) => {
  const { id: workspaceId } = await ctx.params

  const role = await getUserRole(auth.userId, workspaceId)
  if (!role) return apiError('Not found', 'not_found', 404)

  const admin = createAdminClient()
  const { data: members, error } = await admin
    .from('workspace_members')
    .select('id, user_id, email, role, invited_at, accepted_at, invite_expires_at, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('List members error:', error)
    return apiError('Failed to list members', 'query_failed', 500)
  }

  return apiSuccess(members ?? [])
})
