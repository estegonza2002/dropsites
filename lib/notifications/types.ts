/**
 * Notification preference types shared between client and server.
 */

export type NotificationChannel = 'email' | 'sms'

/**
 * Notification category definition for the preferences UI.
 */
export type NotificationCategory = {
  key: string
  label: string
  description: string
  channels: NotificationChannel[]
}

/**
 * Shape of the notification_prefs JSONB column on the users table.
 * Keys are notification event types; values indicate channel enablement.
 */
export type NotificationPrefs = Record<
  string,
  { email: boolean; sms: boolean }
>

/** All publisher notification types exposed in the preferences UI. */
export const PUBLISHER_NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: 'deployment-published',
    label: 'Deployment published',
    description: 'When a site is successfully published',
    channels: ['email'],
  },
  {
    key: 'first-view',
    label: 'First view',
    description: 'When a deployment receives its first visitor',
    channels: ['email'],
  },
  {
    key: 'view-milestone',
    label: 'View milestones',
    description: 'When views reach 10, 100, 1000, etc.',
    channels: ['email'],
  },
  {
    key: 'expiry-warning',
    label: 'Expiry warning',
    description: 'Before a deployment expires',
    channels: ['email', 'sms'],
  },
  {
    key: 'deployment-expired',
    label: 'Deployment expired',
    description: 'When a deployment has expired',
    channels: ['email'],
  },
  {
    key: 'brute-force-alert',
    label: 'Security alerts',
    description: 'Failed password attempts on protected sites',
    channels: ['email', 'sms'],
  },
  {
    key: 'storage-warning',
    label: 'Storage warnings',
    description: 'When approaching storage limits',
    channels: ['email'],
  },
  {
    key: 'bandwidth-warning',
    label: 'Bandwidth warnings',
    description: 'When approaching bandwidth limits',
    channels: ['email'],
  },
  {
    key: 'workspace-invite',
    label: 'Workspace invitations',
    description: 'When invited to join a workspace',
    channels: ['email'],
  },
]

/** Default preferences for new users (all email on, all sms off). */
export function getDefaultPrefs(): NotificationPrefs {
  const prefs: NotificationPrefs = {}
  for (const cat of PUBLISHER_NOTIFICATION_CATEGORIES) {
    prefs[cat.key] = { email: true, sms: false }
  }
  return prefs
}
