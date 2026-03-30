import { createAdminClient } from '@/lib/supabase/admin'

export interface WorkspaceDefaults {
  /** Default expiry duration in days, or null for no expiry */
  expiryDays: number | null
  /** Whether new deployments allow search engine indexing */
  allowIndexing: boolean
  /** Whether new deployments require a password by default */
  passwordRequired: boolean
}

const DEFAULT_SETTINGS: WorkspaceDefaults = {
  expiryDays: null,
  allowIndexing: true,
  passwordRequired: false,
}

/**
 * Retrieve workspace-wide deployment defaults from the
 * `default_deployment_settings` JSON column on the workspaces table.
 */
export async function getWorkspaceDefaults(
  workspaceId: string,
): Promise<WorkspaceDefaults> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('workspaces')
    .select('default_deployment_settings')
    .eq('id', workspaceId)
    .single()

  if (error || !data) {
    return { ...DEFAULT_SETTINGS }
  }

  const raw = data.default_deployment_settings as Record<string, unknown> | null
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS }
  }

  return {
    expiryDays:
      typeof raw.expiry_days === 'number' ? raw.expiry_days : DEFAULT_SETTINGS.expiryDays,
    allowIndexing:
      typeof raw.allow_indexing === 'boolean' ? raw.allow_indexing : DEFAULT_SETTINGS.allowIndexing,
    passwordRequired:
      typeof raw.password_required === 'boolean'
        ? raw.password_required
        : DEFAULT_SETTINGS.passwordRequired,
  }
}

/**
 * Persist workspace-wide deployment defaults.
 */
export async function setWorkspaceDefaults(
  workspaceId: string,
  defaults: WorkspaceDefaults,
): Promise<void> {
  const admin = createAdminClient()

  const settings = {
    expiry_days: defaults.expiryDays,
    allow_indexing: defaults.allowIndexing,
    password_required: defaults.passwordRequired,
  }

  const { error } = await admin
    .from('workspaces')
    .update({
      default_deployment_settings: settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspaceId)

  if (error) {
    throw new Error('Failed to update workspace defaults')
  }
}
