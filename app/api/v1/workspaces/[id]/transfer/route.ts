import { NextRequest } from 'next/server'
import { getUserRole } from '@/lib/auth/permissions'
import { withApiAuth } from '@/lib/api/middleware'
import { apiSuccess, apiError } from '@/lib/api/response'
import type { ApiAuth } from '@/lib/api/auth'
import { initiateTransfer, confirmTransfer } from '@/lib/workspaces/transfer'

// POST /api/v1/workspaces/[id]/transfer — initiate ownership transfer (owner only)
export const POST = withApiAuth(async (req: NextRequest, ctx, auth: ApiAuth) => {
  const { id: workspaceId } = await ctx.params

  const role = await getUserRole(auth.userId, workspaceId)
  if (!role) return apiError('Not found', 'not_found', 404)
  if (role !== 'owner') {
    return apiError('Only workspace owners can transfer ownership', 'forbidden', 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 'invalid_body', 400)
  }

  const newOwnerId = typeof body.new_owner_id === 'string' ? body.new_owner_id.trim() : ''
  if (!newOwnerId) {
    return apiError('new_owner_id is required', 'invalid_field', 400)
  }

  if (newOwnerId === auth.userId) {
    return apiError('Cannot transfer to yourself', 'self_transfer', 400)
  }

  try {
    const transfer = await initiateTransfer(workspaceId, newOwnerId, auth.userId)
    return apiSuccess({
      token: transfer.token,
      expires_at: transfer.expiresAt,
      new_owner_id: transfer.newOwnerId,
    }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transfer failed'
    return apiError(message, 'transfer_failed', 400)
  }
})

// PUT /api/v1/workspaces/[id]/transfer — confirm transfer (new owner, with token)
export const PUT = withApiAuth(async (req: NextRequest, _ctx, auth: ApiAuth) => {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 'invalid_body', 400)
  }

  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!token) {
    return apiError('token is required', 'invalid_field', 400)
  }

  try {
    await confirmTransfer(token, auth.userId)
    return apiSuccess({ status: 'transferred' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Confirmation failed'
    return apiError(message, 'transfer_failed', 400)
  }
})
