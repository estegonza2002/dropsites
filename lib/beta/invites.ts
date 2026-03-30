import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/notifications/email'

export interface BetaInvite {
  id: string
  email: string
  invite_code: string
  status: 'pending' | 'accepted' | 'expired'
  notes: string | null
  invited_at: string
  accepted_at: string | null
  created_by: string | null
}

export async function createInvite(
  email: string,
  notes: string,
  adminId: string,
): Promise<BetaInvite> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('beta_invites')
    .insert({ email, notes: notes || null, created_by: adminId })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create invite')

  const invite = data as BetaInvite

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/beta/accept?code=${invite.invite_code}`
  await sendEmail({
    to: email,
    subject: "You're invited to the DropSites beta",
    html: `
      <p>Hi,</p>
      <p>You've been invited to join the DropSites closed beta!</p>
      <p><a href="${inviteUrl}">Accept your invitation</a></p>
      <p>Or copy this link: ${inviteUrl}</p>
      <p>This invite is for ${email} only.</p>
    `,
    text: `You've been invited to the DropSites closed beta!\n\nAccept your invitation: ${inviteUrl}\n\nThis invite is for ${email} only.`,
  })

  return invite
}

export async function acceptInvite(code: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { data: invite, error: fetchError } = await supabase
    .from('beta_invites')
    .select()
    .eq('invite_code', code)
    .single()

  if (fetchError || !invite) throw new Error('Invalid invite code')
  if (invite.status === 'accepted') throw new Error('Invite already accepted')
  if (invite.status === 'expired') throw new Error('Invite has expired')

  // Verify the authenticated user's email matches the invite
  const admin = createAdminClient()
  const { data: { user } } = await admin.auth.admin.getUserById(userId)
  if (!user?.email) throw new Error('Could not verify user email')
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error('This invite was sent to a different email address')
  }

  const { error } = await supabase
    .from('beta_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('invite_code', code)

  if (error) throw new Error(error.message)
}

export async function listInvites(): Promise<BetaInvite[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('beta_invites')
    .select()
    .order('invited_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as BetaInvite[]
}

export async function isBetaUser(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: { user } } = await admin.auth.admin.getUserById(userId)
  if (!user?.email) return false

  const supabase = await createClient()
  const { data } = await supabase
    .from('beta_invites')
    .select('status')
    .eq('email', user.email)
    .eq('status', 'accepted')
    .maybeSingle()

  return data !== null
}
