import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole } from '@/lib/auth/permissions'
import { WorkspaceSettingsClient } from './client'

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = await getUserRole(user.id, id)
  if (!role) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: workspace } = await admin
    .from('workspaces')
    .select('id, name, namespace_slug, is_personal, owner_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!workspace) redirect('/dashboard')

  return (
    <WorkspaceSettingsClient
      workspace={workspace}
      role={role}
    />
  )
}
