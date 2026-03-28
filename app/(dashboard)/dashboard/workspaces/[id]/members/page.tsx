import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/permissions'
import { WorkspaceMembersClient } from './client'

export default async function WorkspaceMembersPage({
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

  return (
    <WorkspaceMembersClient
      workspaceId={id}
      currentUserId={user.id}
      isOwner={role === 'owner'}
    />
  )
}
