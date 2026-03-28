import { createClient } from '@/lib/supabase/server'

export class ForbiddenError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

type Role = 'owner' | 'publisher' | 'viewer'

const ROLE_RANK: Record<Role, number> = {
  owner: 3,
  publisher: 2,
  viewer: 1,
}

/**
 * Returns the user's role in a workspace, or null if they are not an accepted member.
 * Pending invitations (accepted_at IS NULL) do not grant access.
 */
export async function getUserRole(
  userId: string,
  workspaceId: string,
): Promise<Role | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .not('accepted_at', 'is', null)
    .maybeSingle()

  return (data?.role as Role) ?? null
}

/**
 * Throws ForbiddenError if the user's role is below the required minimum.
 */
export async function requireRole(
  userId: string,
  workspaceId: string,
  minRole: Role,
): Promise<void> {
  const role = await getUserRole(userId, workspaceId)
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new ForbiddenError(
      `Requires ${minRole} role or above (current: ${role ?? 'none'})`,
    )
  }
}
