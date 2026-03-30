import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export interface TransferToken {
  token: string
  workspaceId: string
  newOwnerId: string
  currentOwnerId: string
  expiresAt: string
}

/**
 * In-memory store for transfer tokens. In production this would be backed by
 * Redis or a DB table, but for now a simple Map suffices for single-instance
 * deployments. Tokens expire after 24 hours.
 */
const pendingTransfers = new Map<string, TransferToken>()

/**
 * Initiate a workspace ownership transfer. Generates a secure token that the
 * new owner must confirm. The token is valid for 24 hours.
 */
export async function initiateTransfer(
  workspaceId: string,
  newOwnerId: string,
  currentOwnerId: string,
): Promise<TransferToken> {
  const admin = createAdminClient()

  // Verify workspace exists and current user is owner
  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .select('id, owner_id, is_personal')
    .eq('id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (wsError || !workspace) {
    throw new Error('Workspace not found')
  }

  if (workspace.owner_id !== currentOwnerId) {
    throw new Error('Only the current owner can initiate a transfer')
  }

  if (workspace.is_personal) {
    throw new Error('Personal workspaces cannot be transferred')
  }

  // Verify new owner is an existing member of the workspace
  const { data: member, error: memberError } = await admin
    .from('workspace_members')
    .select('id, user_id, role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', newOwnerId)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  if (memberError || !member) {
    throw new Error('New owner must be an accepted member of the workspace')
  }

  if (member.role === 'owner') {
    throw new Error('User is already the owner')
  }

  // Generate transfer token
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const transferToken: TransferToken = {
    token,
    workspaceId,
    newOwnerId,
    currentOwnerId,
    expiresAt,
  }

  pendingTransfers.set(token, transferToken)

  // Log initiation
  await admin.from('audit_log').insert({
    action: 'workspace.transfer_initiated',
    actor_id: currentOwnerId,
    target_id: workspaceId,
    target_type: 'workspace',
    details: { new_owner_id: newOwnerId },
  })

  return transferToken
}

/**
 * Confirm and execute a workspace transfer. The new owner provides the token.
 * Previous owner is demoted to publisher.
 */
export async function confirmTransfer(
  token: string,
  newOwnerId: string,
): Promise<void> {
  const transfer = pendingTransfers.get(token)
  if (!transfer) {
    throw new Error('Invalid or expired transfer token')
  }

  if (transfer.newOwnerId !== newOwnerId) {
    throw new Error('Transfer token does not belong to this user')
  }

  if (new Date(transfer.expiresAt) < new Date()) {
    pendingTransfers.delete(token)
    throw new Error('Transfer token has expired')
  }

  const admin = createAdminClient()

  // Update workspace owner
  const { error: wsError } = await admin
    .from('workspaces')
    .update({
      owner_id: newOwnerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', transfer.workspaceId)

  if (wsError) {
    throw new Error('Failed to update workspace owner')
  }

  // Demote previous owner to publisher
  const { error: demoteError } = await admin
    .from('workspace_members')
    .update({ role: 'publisher' as const })
    .eq('workspace_id', transfer.workspaceId)
    .eq('user_id', transfer.currentOwnerId)

  if (demoteError) {
    console.error('Failed to demote previous owner:', demoteError)
  }

  // Promote new owner
  const { error: promoteError } = await admin
    .from('workspace_members')
    .update({ role: 'owner' as const })
    .eq('workspace_id', transfer.workspaceId)
    .eq('user_id', newOwnerId)

  if (promoteError) {
    console.error('Failed to promote new owner:', promoteError)
  }

  // Clean up token
  pendingTransfers.delete(token)

  // Audit log
  await admin.from('audit_log').insert({
    action: 'workspace.transfer_completed',
    actor_id: newOwnerId,
    target_id: transfer.workspaceId,
    target_type: 'workspace',
    details: {
      previous_owner_id: transfer.currentOwnerId,
      new_owner_id: newOwnerId,
    },
  })
}

/** Exposed for testing only */
export function _getPendingTransfers() {
  return pendingTransfers
}
