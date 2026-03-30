import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

export type Deployment = Database['public']['Tables']['deployments']['Row']

/**
 * Resolve a deployment by namespace and slug.
 * URL pattern: /{namespace}/{slug} or {namespace}.dropsites.app/{slug}
 *
 * The namespace must belong to a workspace, and the deployment must exist
 * within that workspace's namespace scope.
 */
export async function resolveNamespacedUrl(
  namespace: string,
  slug: string,
): Promise<Deployment | null> {
  const supabase = createAdminClient()

  // First, find the workspace that owns this namespace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('namespace_slug', namespace)
    .is('deleted_at', null)
    .single()

  if (!workspace) return null

  // Then find the deployment with this slug in that workspace
  const { data: deployment } = await supabase
    .from('deployments')
    .select('*')
    .eq('slug', slug)
    .eq('workspace_id', workspace.id)
    .eq('namespace', namespace)
    .is('archived_at', null)
    .single()

  if (!deployment) return null

  return deployment
}

/**
 * Check if a path segment looks like a namespace prefix.
 * Namespaces in URLs are prefixed with ~ (tilde): /~namespace/slug
 */
export function isNamespacePrefix(segment: string): boolean {
  return segment.startsWith('~') && segment.length > 1
}

/**
 * Extract the namespace from a ~prefixed segment.
 */
export function extractNamespace(segment: string): string {
  return segment.slice(1)
}
