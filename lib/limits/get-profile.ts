import { createAdminClient } from '@/lib/supabase/admin'
import { getProfileByName, type LimitProfile } from './profiles'

export async function getWorkspaceProfile(workspaceId: string): Promise<LimitProfile> {
  const supabase = createAdminClient()

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('limit_profile')
    .eq('id', workspaceId)
    .single()

  if (error || !workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`)
  }

  return getProfileByName(workspace.limit_profile)
}
