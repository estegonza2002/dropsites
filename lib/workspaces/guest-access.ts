import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export interface WorkspaceGuestAccess {
  workspaceId: string
  workspaceName: string
  createdAt: string
}

/**
 * In-memory store for guest access tokens. In production this would be a DB
 * table; for now a Map is sufficient for single-instance deployments.
 * Tokens do not expire but can be revoked by removing the entry.
 */
const guestTokens = new Map<string, { workspaceId: string; createdAt: string }>()

/**
 * Generate a read-only guest access link for a workspace.
 * Returns the guest token (to be used as /workspace/[token]).
 */
export async function generateGuestLink(workspaceId: string): Promise<string> {
  const admin = createAdminClient()

  // Verify workspace exists and is not deleted
  const { data: workspace, error } = await admin
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (error || !workspace) {
    throw new Error('Workspace not found')
  }

  const token = randomBytes(32).toString('hex')
  guestTokens.set(token, {
    workspaceId,
    createdAt: new Date().toISOString(),
  })

  // Audit log
  await admin.from('audit_log').insert({
    action: 'workspace.guest_link_created',
    actor_id: null,
    target_id: workspaceId,
    target_type: 'workspace',
    details: { token_prefix: token.slice(0, 8) },
  })

  return token
}

/**
 * Validate a guest access token and return workspace info if valid.
 * Returns null for invalid or expired tokens.
 */
export async function validateGuestToken(
  token: string,
): Promise<WorkspaceGuestAccess | null> {
  const entry = guestTokens.get(token)
  if (!entry) return null

  const admin = createAdminClient()

  const { data: workspace, error } = await admin
    .from('workspaces')
    .select('id, name')
    .eq('id', entry.workspaceId)
    .is('deleted_at', null)
    .single()

  if (error || !workspace) return null

  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    createdAt: entry.createdAt,
  }
}

/** Exposed for testing only */
export function _getGuestTokens() {
  return guestTokens
}
