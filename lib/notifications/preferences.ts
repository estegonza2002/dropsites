/**
 * Notification preferences — read/write from users.notification_prefs JSONB.
 */

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Per-event channel preferences.
 * Example:
 * ```
 * {
 *   "deployment.published": { email: true, sms: false },
 *   "deployment.expiring": { email: true, sms: true },
 *   "workspace.invite":    { email: true, sms: false },
 * }
 * ```
 */
export interface ChannelPrefs {
  email: boolean
  sms: boolean
}

export type NotificationPrefs = Record<string, ChannelPrefs>

/** Default prefs applied when a user has no overrides for an event type. */
const DEFAULT_CHANNEL_PREFS: ChannelPrefs = {
  email: true,
  sms: false,
}

/**
 * Read notification preferences for a user.
 * Returns the stored JSONB cast to NotificationPrefs, or empty object.
 */
export async function getNotificationPrefs(
  userId: string,
): Promise<NotificationPrefs> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('notification_prefs')
    .eq('id', userId)
    .single()

  if (error || !data) {
    console.error('[notifications:prefs] Failed to read prefs:', error?.message)
    return {}
  }

  return (data.notification_prefs ?? {}) as NotificationPrefs
}

/**
 * Update (merge) notification preferences for a user.
 * Existing event types not in `prefs` are preserved.
 */
export async function updateNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Read existing, then merge
  const existing = await getNotificationPrefs(userId)
  const merged = { ...existing, ...prefs }

  const { error } = await supabase
    .from('users')
    .update({ notification_prefs: merged })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Resolve the effective channel prefs for a given event type.
 * Falls back to defaults if the user hasn't configured the event type.
 */
export function resolveChannelPrefs(
  prefs: NotificationPrefs,
  eventType: string,
): ChannelPrefs {
  return prefs[eventType] ?? DEFAULT_CHANNEL_PREFS
}
