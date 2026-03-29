import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/v1/account/delete — soft-delete user account
export async function POST(_request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Check the user exists and is not already deleted
  const { data: existingUser } = await admin
    .from('users')
    .select('id, deleted_at')
    .eq('id', user.id)
    .single()

  if (!existingUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (existingUser.deleted_at) {
    return NextResponse.json({ error: 'Account already deleted' }, { status: 400 })
  }

  // Prevent deletion if user owns non-personal workspaces with other members
  const { data: ownedWorkspaces } = await admin
    .from('workspaces')
    .select('id, is_personal')
    .eq('owner_id', user.id)
    .is('deleted_at', null)

  for (const ws of ownedWorkspaces ?? []) {
    if (!ws.is_personal) {
      const { count } = await admin
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ws.id)
        .not('user_id', 'eq', user.id)
        .not('accepted_at', 'is', null)

      if (count && count > 0) {
        return NextResponse.json(
          {
            error:
              'Transfer ownership of shared workspaces before deleting your account.',
          },
          { status: 400 },
        )
      }
    }
  }

  // Soft-delete: set deleted_at on user record
  const now = new Date().toISOString()
  const { error: updateError } = await admin
    .from('users')
    .update({ deleted_at: now, updated_at: now })
    .eq('id', user.id)

  if (updateError) {
    console.error('Account delete error:', updateError)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  // Soft-delete personal workspace
  for (const ws of ownedWorkspaces ?? []) {
    if (ws.is_personal) {
      await admin
        .from('workspaces')
        .update({ deleted_at: now })
        .eq('id', ws.id)
    }
  }

  // Write audit log
  await admin.from('audit_log').insert({
    action: 'account.deleted',
    actor_id: user.id,
    target_id: user.id,
    target_type: 'user',
    details: { soft_delete: true },
  })

  // Sign out the user
  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
