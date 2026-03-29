/**
 * Notification-specific rate limiter.
 *
 * Reuses the sliding window pattern from lib/auth/rate-limit.ts
 * with notification-specific presets.
 *
 * Limits:
 * - SMS: 10 per user per hour
 * - Email: 50 per user per day
 */

import { checkRateLimit, type RateLimitResult } from '@/lib/auth/rate-limit'

const SMS_MAX_PER_HOUR = 10
const SMS_WINDOW_MS = 60 * 60 * 1000 // 1 hour

const EMAIL_MAX_PER_DAY = 50
const EMAIL_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

export type NotificationChannel = 'email' | 'sms'

/**
 * Check whether a notification can be sent on the given channel.
 * Returns the standard RateLimitResult (allowed, remaining, resetAt).
 */
export function checkNotificationRate(
  userId: string,
  channel: NotificationChannel,
): RateLimitResult {
  switch (channel) {
    case 'sms':
      return checkRateLimit(
        `notif-sms:${userId}`,
        SMS_MAX_PER_HOUR,
        SMS_WINDOW_MS,
      )
    case 'email':
      return checkRateLimit(
        `notif-email:${userId}`,
        EMAIL_MAX_PER_DAY,
        EMAIL_WINDOW_MS,
      )
  }
}
