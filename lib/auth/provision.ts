import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

const TOS_VERSION = '1.0'
const TRIAL_DAYS = 14

/**
 * Ensures a `users` row and personal workspace exist for the given auth user.
 * Safe to call on every login — idempotent via upsert.
 *
 * On first login:
 * - Sets trial_started_at and trial_ends_at (now + 14 days)
 * - Sets limit_profile to 'pro' for the trial period
 * - Checks if user ever had a trial before (prevent repeat trials)
 *
 * Uses the admin (service-role) client to bypass RLS.
 */
export async function provisionUser(
  user: User,
  opts: { tosAccepted?: boolean } = {},
): Promise<void> {
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const emailVerifiedAt = user.email_confirmed_at ?? null

  // ── 1. Upsert users row ────────────────────────────────────────
  const userInsert = {
    id: user.id,
    email: user.email!,
    email_verified_at: emailVerifiedAt,
    ...(opts.tosAccepted
      ? { tos_accepted_at: now, tos_version: TOS_VERSION }
      : {}),
  }

  const { error: userError } = await admin
    .from('users')
    .upsert(userInsert, { onConflict: 'id', ignoreDuplicates: false })

  if (userError) {
    console.error('[provision] failed to upsert user', userError)
    return
  }

  // ── 2. Check if personal workspace already exists ──────────────
  const { data: existing } = await admin
    .from('workspaces')
    .select('id, trial_started_at')
    .eq('owner_id', user.id)
    .eq('is_personal', true)
    .maybeSingle()

  if (existing) return // already provisioned

  // ── 3. Check if user ever had a trial (prevent repeat trials) ──
  //    Look for any workspace owned by this user that had a trial
  const { data: previousTrials } = await admin
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .not('trial_started_at', 'is', null)
    .limit(1)

  const hadPreviousTrial = (previousTrials?.length ?? 0) > 0

  // ── 4. Create personal workspace ──────────────────────────────
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .insert({
      name: 'Personal',
      owner_id: user.id,
      is_personal: true,
      // New users get a Pro trial; returning users who already used their trial get free
      limit_profile: hadPreviousTrial ? 'free' : 'pro',
      trial_started_at: hadPreviousTrial ? null : now,
      trial_ends_at: hadPreviousTrial ? null : trialEndsAt,
    })
    .select('id')
    .single()

  if (wsError || !workspace) {
    console.error('[provision] failed to create workspace', wsError)
    return
  }

  // ── 5. Add owner membership ────────────────────────────────────
  const { error: memberError } = await admin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: user.id,
    email: user.email!,
    role: 'owner',
    accepted_at: new Date().toISOString(),
  })

  if (memberError) {
    console.error('[provision] failed to create workspace_member', memberError)
  }
}

/**
 * Returns trial info for a workspace. Used by the trial banner.
 */
export async function getTrialInfo(workspaceId: string): Promise<{
  isTrial: boolean
  daysLeft: number
  trialEndsAt: string | null
}> {
  const admin = createAdminClient()

  const { data: workspace } = await admin
    .from('workspaces')
    .select('limit_profile, trial_started_at, trial_ends_at')
    .eq('id', workspaceId)
    .single()

  if (!workspace || !workspace.trial_started_at || !workspace.trial_ends_at) {
    return { isTrial: false, daysLeft: 0, trialEndsAt: null }
  }

  const endsAt = new Date(workspace.trial_ends_at)
  const now = new Date()
  const diffMs = endsAt.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))

  // Trial is active only if limit_profile is still 'pro' and not expired
  const isTrial = workspace.limit_profile === 'pro' && daysLeft > 0

  return {
    isTrial,
    daysLeft,
    trialEndsAt: workspace.trial_ends_at,
  }
}
