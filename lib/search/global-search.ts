/**
 * Global search — searches deployments across all workspaces a user belongs to.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface SearchResult {
  id: string
  slug: string
  workspaceId: string
  workspaceName: string
  entryPath: string
  namespace: string | null
  isDisabled: boolean
  createdAt: string
  /** Which field matched: 'slug', 'name', or 'domain' */
  matchField: 'slug' | 'name' | 'domain'
}

export interface GroupedSearchResults {
  workspace: {
    id: string
    name: string
  }
  results: SearchResult[]
}

/**
 * Search deployments across all workspaces the user has access to.
 * Searches slug, entry_path (as a name proxy), and custom domains.
 *
 * @param userId - The authenticated user's ID
 * @param query - Search query string (minimum 2 characters)
 * @param limit - Maximum results to return (default 20)
 */
export async function globalSearch(
  userId: string,
  query: string,
  limit = 20,
): Promise<SearchResult[]> {
  if (!userId || !query || query.trim().length < 2) {
    return []
  }

  const admin = createAdminClient()
  const searchTerm = query.trim().toLowerCase()

  // Get all workspaces the user belongs to
  const { data: memberships } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .not('accepted_at', 'is', null)

  if (!memberships || memberships.length === 0) return []

  const workspaceIds = memberships.map((m) => m.workspace_id)

  // Fetch workspace names
  const { data: workspaces } = await admin
    .from('workspaces')
    .select('id, name')
    .in('id', workspaceIds)

  const workspaceMap = new Map(
    (workspaces ?? []).map((w) => [w.id, w.name]),
  )

  // Search deployments by slug (ilike)
  const { data: slugMatches } = await admin
    .from('deployments')
    .select('id, slug, workspace_id, entry_path, namespace, is_disabled, created_at')
    .in('workspace_id', workspaceIds)
    .ilike('slug', `%${searchTerm}%`)
    .is('archived_at', null)
    .limit(limit)

  const results: SearchResult[] = []
  const seenIds = new Set<string>()

  // Add slug matches
  for (const d of slugMatches ?? []) {
    if (seenIds.has(d.id)) continue
    seenIds.add(d.id)
    results.push({
      id: d.id,
      slug: d.slug,
      workspaceId: d.workspace_id,
      workspaceName: workspaceMap.get(d.workspace_id) ?? 'Unknown',
      entryPath: d.entry_path,
      namespace: d.namespace,
      isDisabled: d.is_disabled,
      createdAt: d.created_at,
      matchField: 'slug',
    })
  }

  // Search by entry_path (acts as name)
  if (results.length < limit) {
    const { data: nameMatches } = await admin
      .from('deployments')
      .select('id, slug, workspace_id, entry_path, namespace, is_disabled, created_at')
      .in('workspace_id', workspaceIds)
      .ilike('entry_path', `%${searchTerm}%`)
      .is('archived_at', null)
      .limit(limit - results.length)

    for (const d of nameMatches ?? []) {
      if (seenIds.has(d.id)) continue
      seenIds.add(d.id)
      results.push({
        id: d.id,
        slug: d.slug,
        workspaceId: d.workspace_id,
        workspaceName: workspaceMap.get(d.workspace_id) ?? 'Unknown',
        entryPath: d.entry_path,
        namespace: d.namespace,
        isDisabled: d.is_disabled,
        createdAt: d.created_at,
        matchField: 'name',
      })
    }
  }

  // Search custom domains
  if (results.length < limit) {
    const { data: domainMatches } = await admin
      .from('custom_domains')
      .select('deployment_id, domain')
      .in('workspace_id', workspaceIds)
      .ilike('domain', `%${searchTerm}%`)
      .limit(limit - results.length)

    if (domainMatches && domainMatches.length > 0) {
      const domainDeploymentIds = domainMatches
        .map((d) => d.deployment_id)
        .filter((id) => !seenIds.has(id))

      if (domainDeploymentIds.length > 0) {
        const { data: deployments } = await admin
          .from('deployments')
          .select('id, slug, workspace_id, entry_path, namespace, is_disabled, created_at')
          .in('id', domainDeploymentIds)
          .is('archived_at', null)

        for (const d of deployments ?? []) {
          if (seenIds.has(d.id)) continue
          seenIds.add(d.id)
          results.push({
            id: d.id,
            slug: d.slug,
            workspaceId: d.workspace_id,
            workspaceName: workspaceMap.get(d.workspace_id) ?? 'Unknown',
            entryPath: d.entry_path,
            namespace: d.namespace,
            isDisabled: d.is_disabled,
            createdAt: d.created_at,
            matchField: 'domain',
          })
        }
      }
    }
  }

  return results.slice(0, limit)
}

/**
 * Group search results by workspace for display.
 */
export function groupByWorkspace(
  results: SearchResult[],
): GroupedSearchResults[] {
  const groups = new Map<string, GroupedSearchResults>()

  for (const result of results) {
    let group = groups.get(result.workspaceId)
    if (!group) {
      group = {
        workspace: { id: result.workspaceId, name: result.workspaceName },
        results: [],
      }
      groups.set(result.workspaceId, group)
    }
    group.results.push(result)
  }

  return Array.from(groups.values())
}
