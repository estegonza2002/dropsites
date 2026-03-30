import { createAdminClient } from '@/lib/supabase/admin'

const GRACE_PERIOD_DAYS = 7
const FREE_PROFILE = 'free'

/**
 * Record a payment failure and start the dunning grace period.
 * Sets grace_period_ends_at to 7 days from now and stores the
 * current limit_profile so it can be restored on recovery.
 */
export async function handlePaymentFailure(
  workspaceId: string
): Promise<void> {
  const supabase = createAdminClient()

  // Fetch current workspace to preserve the existing limit_profile
  const { data: workspace, error: fetchError } = await supabase
    .from('workspaces')
    .select('limit_profile')
    .eq('id', workspaceId)
    .single()

  if (fetchError || !workspace) {
    throw new Error(
      `Failed to fetch workspace ${workspaceId}: ${fetchError?.message ?? 'not found'}`
    )
  }

  const gracePeriodEndsAt = new Date(
    Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const { error: updateError } = await supabase
    .from('workspaces')
    .update({
      grace_period_ends_at: gracePeriodEndsAt,
      previous_limit_profile: workspace.limit_profile,
    })
    .eq('id', workspaceId)

  if (updateError) {
    throw new Error(
      `Failed to set grace period for workspace ${workspaceId}: ${updateError.message}`
    )
  }
}

/**
 * Check all workspaces with expired grace periods and downgrade
 * them to the free profile. Called by the daily cron job.
 */
export async function checkGracePeriods(): Promise<void> {
  const supabase = createAdminClient()

  const now = new Date().toISOString()

  const { data: expired, error: queryError } = await supabase
    .from('workspaces')
    .select('id')
    .not('grace_period_ends_at', 'is', null)
    .lt('grace_period_ends_at', now)

  if (queryError) {
    throw new Error(
      `Failed to query expired grace periods: ${queryError.message}`
    )
  }

  if (!expired || expired.length === 0) {
    return
  }

  for (const workspace of expired) {
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        limit_profile: FREE_PROFILE,
        grace_period_ends_at: null,
        previous_limit_profile: null,
      })
      .eq('id', workspace.id)

    if (updateError) {
      // Log but continue processing other workspaces
      console.error(
        `Failed to downgrade workspace ${workspace.id}: ${updateError.message}`
      )
    }
  }
}

/**
 * Clear the grace period after a successful payment recovery
 * and restore the workspace to its previous limit_profile.
 */
export async function handlePaymentRecovery(
  workspaceId: string
): Promise<void> {
  const supabase = createAdminClient()

  const { data: workspace, error: fetchError } = await supabase
    .from('workspaces')
    .select('previous_limit_profile')
    .eq('id', workspaceId)
    .single()

  if (fetchError || !workspace) {
    throw new Error(
      `Failed to fetch workspace ${workspaceId}: ${fetchError?.message ?? 'not found'}`
    )
  }

  const updates: Record<string, unknown> = {
    grace_period_ends_at: null,
    previous_limit_profile: null,
  }

  // Restore the previous profile if one was saved
  if (workspace.previous_limit_profile) {
    updates.limit_profile = workspace.previous_limit_profile
  }

  const { error: updateError } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', workspaceId)

  if (updateError) {
    throw new Error(
      `Failed to clear grace period for workspace ${workspaceId}: ${updateError.message}`
    )
  }
}
