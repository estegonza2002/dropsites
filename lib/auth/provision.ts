import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

const TOS_VERSION = '1.0'
const TRIAL_DAYS = 14

/**
 * Ensures a `users` row and personal workspace exist for the given auth user.
 * Safe to call on every login — idempotent via upsert.
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
    .select('id')
    .eq('owner_id', user.id)
    .eq('is_personal', true)
    .maybeSingle()

  if (existing) return // already provisioned

  // ── 3. Create personal workspace ──────────────────────────────
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .insert({
      name: 'Personal',
      owner_id: user.id,
      is_personal: true,
      limit_profile: 'free',
      trial_started_at: now,
      trial_ends_at: trialEndsAt,
    })
    .select('id')
    .single()

  if (wsError || !workspace) {
    console.error('[provision] failed to create workspace', wsError)
    return
  }

  // ── 4. Add owner membership ────────────────────────────────────
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
