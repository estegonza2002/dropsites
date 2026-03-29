/**
 * Notification template router.
 *
 * Exports a single `renderTemplate(eventType, data)` function that delegates
 * to the correct publisher or admin template.
 */

import type { TemplateResult } from './base'
import {
  deploymentPublished,
  firstView,
  viewMilestone,
  expiryWarning,
  deploymentExpired,
  bruteForceAlert,
  storageWarning,
  bandwidthWarning,
  workspaceInvite,
} from './publisher'
import {
  adminAbuseReport,
  adminWeeklySummary,
  trialReminderDay7,
  trialReminderDay12,
  trialExpired,
} from './admin'

type TemplateFn = (data: Record<string, unknown>) => TemplateResult

const TEMPLATES: Record<string, TemplateFn> = {
  'deployment-published': deploymentPublished,
  'first-view': firstView,
  'view-milestone': viewMilestone,
  'expiry-warning': expiryWarning,
  'deployment-expired': deploymentExpired,
  'brute-force-alert': bruteForceAlert,
  'storage-warning': storageWarning,
  'bandwidth-warning': bandwidthWarning,
  'workspace-invite': workspaceInvite,
  'admin-abuse-report': adminAbuseReport,
  'admin-weekly-summary': adminWeeklySummary,
  'trial-reminder-day7': trialReminderDay7,
  'trial-reminder-day12': trialReminderDay12,
  'trial-expired': trialExpired,
}

/**
 * Render a notification template by event type.
 *
 * @throws Error if the event type is not recognised.
 */
export function renderTemplate(
  eventType: string,
  data: Record<string, unknown>,
): TemplateResult {
  const fn = TEMPLATES[eventType]
  if (!fn) {
    throw new Error(`Unknown notification template: ${eventType}`)
  }
  return fn(data)
}

/** All supported notification event types. */
export const NOTIFICATION_EVENT_TYPES = Object.keys(TEMPLATES)

export type { TemplateResult }
