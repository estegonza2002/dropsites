/**
 * Notification dispatcher.
 *
 * Orchestrates: check prefs -> check rate limit -> render template -> send -> log.
 * Retries on failure up to 3 times with exponential backoff.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from './email'
import { sendSMS } from './sms'
import {
  getNotificationPrefs,
  resolveChannelPrefs,
} from './preferences'
import { checkNotificationRate, type NotificationChannel } from './rate-limiter'
import { renderTemplate } from './templates'

export interface DispatchResult {
  email?: { sent: boolean; error?: string; rateLimited?: boolean }
  sms?: { sent: boolean; error?: string; rateLimited?: boolean }
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 500

/**
 * Dispatch a notification to a user for a given event type.
 *
 * 1. Read user prefs to determine which channels are enabled
 * 2. Check rate limits per channel
 * 3. Render the template
 * 4. Send on each enabled, non-rate-limited channel
 * 5. Log results to notification_log (best-effort)
 */
export async function dispatch(
  userId: string,
  eventType: string,
  data: Record<string, unknown>,
): Promise<DispatchResult> {
  const result: DispatchResult = {}

  // 1. Load user and prefs
  const [prefs, user] = await Promise.all([
    getNotificationPrefs(userId),
    getUserContact(userId),
  ])

  if (!user) {
    console.error('[notifications:dispatch] User not found:', userId)
    return result
  }

  const channelPrefs = resolveChannelPrefs(prefs, eventType)

  // 2. Render template
  const template = renderTemplate(eventType, data)

  // 3. Send on each enabled channel
  if (channelPrefs.email && user.email) {
    const rateCheck = checkNotificationRate(userId, 'email')
    if (!rateCheck.allowed) {
      result.email = { sent: false, rateLimited: true }
    } else {
      const sendResult = await sendWithRetry('email', async () =>
        sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      )
      result.email = {
        sent: sendResult.success,
        error: sendResult.error,
      }
    }
  }

  if (channelPrefs.sms && user.phone) {
    const rateCheck = checkNotificationRate(userId, 'sms')
    if (!rateCheck.allowed) {
      result.sms = { sent: false, rateLimited: true }
    } else {
      const sendResult = await sendWithRetry('sms', async () =>
        sendSMS({ to: user.phone!, body: template.text }),
      )
      result.sms = {
        sent: sendResult.success,
        error: sendResult.error,
      }
    }
  }

  // 4. Log to audit_log (best-effort, don't block on failure)
  logNotification(userId, eventType, result).catch((err) => {
    console.error('[notifications:dispatch] Failed to log notification:', err)
  })

  return result
}

// ── Helpers ──────────────────────────────────────────────────────

interface UserContact {
  email: string
  phone: string | null
}

async function getUserContact(userId: string): Promise<UserContact | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('email, phone_number')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return { email: data.email, phone: data.phone_number }
}

interface SendResult {
  success: boolean
  error?: string
}

async function sendWithRetry(
  channel: NotificationChannel,
  fn: () => Promise<SendResult>,
): Promise<SendResult> {
  let lastError: string | undefined

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await fn()
    if (result.success) return result

    lastError = result.error
    console.warn(
      `[notifications:${channel}] Attempt ${attempt + 1}/${MAX_RETRIES} failed: ${lastError}`,
    )

    if (attempt < MAX_RETRIES - 1) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt)
      await sleep(delay)
    }
  }

  return { success: false, error: lastError }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function logNotification(
  userId: string,
  eventType: string,
  result: DispatchResult,
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('audit_log').insert({
    action: 'notification.sent',
    actor_id: null,
    target_id: userId,
    target_type: 'user',
    details: {
      event_type: eventType,
      channels: result,
    },
  })
}
