import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Write an audit log entry. Fire-and-forget safe.
 */
export async function writeAuditLog(params: {
  action: string
  actor_id: string | null
  target_id?: string | null
  target_type?: string | null
  details?: Record<string, unknown> | null
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('audit_log').insert({
      action: params.action,
      actor_id: params.actor_id,
      target_id: params.target_id ?? null,
      target_type: params.target_type ?? null,
      details: params.details ?? null,
    })
  } catch (err) {
    console.error('[audit] Failed to write log:', err)
  }
}

export interface AuditLogEntry {
  id: string
  action: string
  actor_id: string | null
  actor_email?: string
  target_id: string | null
  target_type: string | null
  details: Record<string, unknown> | null
  created_at: string
}

/**
 * Query audit log with pagination and optional action filter.
 */
export async function queryAuditLog(params: {
  page?: number
  limit?: number
  action?: string
}): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const admin = createAdminClient()
  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? 50, 100)
  const offset = (page - 1) * limit

  let query = admin
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (params.action) {
    query = query.eq('action', params.action)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('[audit] Query error:', error)
    return { entries: [], total: 0 }
  }

  // Resolve actor emails
  const actorIds = [...new Set((data ?? []).filter((e) => e.actor_id).map((e) => e.actor_id!))]
  let emailMap = new Map<string, string>()
  if (actorIds.length > 0) {
    const { data: users } = await admin
      .from('users')
      .select('id, email')
      .in('id', actorIds)
    emailMap = new Map((users ?? []).map((u) => [u.id, u.email]))
  }

  const entries: AuditLogEntry[] = (data ?? []).map((e) => ({
    ...e,
    actor_email: e.actor_id ? emailMap.get(e.actor_id) : undefined,
  }))

  return { entries, total: count ?? 0 }
}

/**
 * Convert audit log entries to CSV.
 */
export function auditLogToCsv(entries: AuditLogEntry[]): string {
  const header = 'timestamp,action,actor_email,target_type,target_id,details'
  const rows = entries.map((e) =>
    [
      e.created_at,
      e.action,
      e.actor_email ?? '',
      e.target_type ?? '',
      e.target_id ?? '',
      e.details ? JSON.stringify(e.details).replace(/"/g, '""') : '',
    ].join(','),
  )
  return [header, ...rows].join('\n')
}
