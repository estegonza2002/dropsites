import { createAdminClient } from '@/lib/supabase/admin'

export async function assignProfile(workspaceId: string, profileName: string): Promise<void> {
  const supabase = createAdminClient()

  const { error: updateError } = await supabase
    .from('workspaces')
    .update({ limit_profile: profileName })
    .eq('id', workspaceId)

  if (updateError) {
    throw new Error(`Failed to assign profile: ${updateError.message}`)
  }

  await supabase.from('audit_log').insert({
    action: 'workspace.profile_changed',
    actor_id: null,
    target_id: workspaceId,
    target_type: 'workspace',
    details: { profile: profileName },
  })
}
