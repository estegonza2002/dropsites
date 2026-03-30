import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Retention periods for different data types.
 * These are enforced by this module — never hardcoded elsewhere.
 */
const RETENTION = {
  /** Application logs: 90 days */
  APP_LOGS_DAYS: 90,
  /** Audit logs: 2 years (730 days) */
  AUDIT_LOGS_DAYS: 730,
  /** Analytics events: 13 months (395 days) */
  ANALYTICS_DAYS: 395,
  /** Bandwidth daily records: 13 months (395 days) */
  BANDWIDTH_DAYS: 395,
  /** Webhook delivery logs: 90 days */
  WEBHOOK_DELIVERY_DAYS: 90,
} as const

export interface RetentionResult {
  analyticsDeleted: number
  bandwidthDeleted: number
  webhookDeliveriesDeleted: number
  errors: string[]
}

/**
 * Enforces data retention policies by deleting records older than
 * their configured retention period.
 *
 * - Analytics events: 13 months
 * - Bandwidth daily: 13 months
 * - Audit logs: 2 years (kept — not deleted here, but noted for compliance)
 * - Webhook deliveries: 90 days
 *
 * Audit logs are append-only and retained for 2 years. They are NOT
 * deleted by this function — a separate archive process handles them
 * after the 2-year mark.
 */
export async function enforceRetention(): Promise<RetentionResult> {
  const admin = createAdminClient()
  const errors: string[] = []
  let analyticsDeleted = 0
  let bandwidthDeleted = 0
  let webhookDeliveriesDeleted = 0

  // Analytics events — delete records older than 13 months
  try {
    const analyticsCutoff = dateDaysAgo(RETENTION.ANALYTICS_DAYS)
    const { count, error } = await admin
      .from('analytics_events')
      .delete({ count: 'exact' })
      .lt('created_at', analyticsCutoff)

    if (error) {
      errors.push(`Analytics retention error: ${error.message}`)
    } else {
      analyticsDeleted = count ?? 0
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    errors.push(`Analytics retention error: ${message}`)
  }

  // Bandwidth daily — delete records older than 13 months
  try {
    const bandwidthCutoff = dateDaysAgo(RETENTION.BANDWIDTH_DAYS)
    const { count, error } = await admin
      .from('bandwidth_daily')
      .delete({ count: 'exact' })
      .lt('date', bandwidthCutoff)

    if (error) {
      errors.push(`Bandwidth retention error: ${error.message}`)
    } else {
      bandwidthDeleted = count ?? 0
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    errors.push(`Bandwidth retention error: ${message}`)
  }

  // Webhook deliveries — delete records older than 90 days
  try {
    const deliveryCutoff = dateDaysAgo(RETENTION.WEBHOOK_DELIVERY_DAYS)
    const { count, error } = await admin
      .from('webhook_deliveries')
      .delete({ count: 'exact' })
      .lt('created_at', deliveryCutoff)

    if (error) {
      errors.push(`Webhook delivery retention error: ${error.message}`)
    } else {
      webhookDeliveriesDeleted = count ?? 0
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    errors.push(`Webhook delivery retention error: ${message}`)
  }

  // Write audit log for the retention run
  try {
    await admin.from('audit_log').insert({
      action: 'system.retention_enforced',
      actor_id: null,
      target_id: null,
      target_type: 'system',
      details: {
        analytics_deleted: analyticsDeleted,
        bandwidth_deleted: bandwidthDeleted,
        webhook_deliveries_deleted: webhookDeliveriesDeleted,
        error_count: errors.length,
        retention_config: RETENTION,
      },
    })
  } catch {
    // Best-effort audit logging
  }

  return {
    analyticsDeleted,
    bandwidthDeleted,
    webhookDeliveriesDeleted,
    errors,
  }
}

/** Returns an ISO date string for N days ago. */
function dateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/** Exported retention constants for use in tests and documentation. */
export const RETENTION_CONFIG = RETENTION
