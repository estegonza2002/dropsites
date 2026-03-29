/**
 * Notification module — public API.
 */

export { dispatch, type DispatchResult } from './dispatcher'
export { sendEmail, type SendEmailOptions, type SendEmailResult } from './email'
export { sendSMS, type SendSMSOptions, type SendSMSResult } from './sms'
export {
  getNotificationPrefs,
  updateNotificationPrefs,
  resolveChannelPrefs,
  type NotificationPrefs,
  type ChannelPrefs,
} from './preferences'
export {
  checkNotificationRate,
  type NotificationChannel,
} from './rate-limiter'
export { renderTemplate, type RenderedTemplate } from './templates'
