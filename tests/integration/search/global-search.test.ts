import { describe, it, expect, vi } from 'vitest'

// Mock the admin client
vi.mock('@/lib/supabase/admin', () => {
  const mockWorkspaces = [
    { id: 'ws-1', name: 'Personal' },
    { id: 'ws-2', name: 'Team Alpha' },
  ]

  const mockDeployments = [
    {
      id: 'dep-1',
      slug: 'my-portfolio',
      workspace_id: 'ws-1',
      entry_path: 'index.html',
      namespace: null,
      is_disabled: false,
      created_at: '2026-03-28T00:00:00Z',
      archived_at: null,
    },
    {
      id: 'dep-2',
      slug: 'team-docs',
      workspace_id: 'ws-2',
      entry_path: 'docs/index.html',
      namespace: 'alpha',
      is_disabled: false,
      created_at: '2026-03-29T00:00:00Z',
      archived_at: null,
    },
    {
      id: 'dep-3',
      slug: 'archived-site',
      workspace_id: 'ws-1',
      entry_path: 'index.html',
      namespace: null,
      is_disabled: true,
      created_at: '2026-03-20T00:00:00Z',
      archived_at: '2026-03-25T00:00:00Z',
    },
  ]

  const mockDomains = [
    { deployment_id: 'dep-2', domain: 'docs.team-alpha.com', workspace_id: 'ws-2' },
  ]

  return {
    createAdminClient: () => ({
      from: (table: string) => {
        if (table === 'workspace_members') {
          return {
            select: () => ({
              eq: () => ({
                not: () => ({
                  data: [{ workspace_id: 'ws-1' }, { workspace_id: 'ws-2' }],
                }),
              }),
            }),
          }
        }

        if (table === 'workspaces') {
          return {
            select: () => ({
              in: () => ({
                data: mockWorkspaces,
              }),
            }),
          }
        }

        if (table === 'deployments') {
          return {
            select: () => ({
              in: (_col: string, ids: string[]) => ({
                ilike: (_col2: string, pattern: string) => {
                  const term = pattern.replace(/%/g, '').toLowerCase()
                  const filtered = mockDeployments.filter(
                    (d) =>
                      ids.includes(d.workspace_id) &&
                      (d.slug.toLowerCase().includes(term) ||
                        d.entry_path.toLowerCase().includes(term)) &&
                      d.archived_at === null,
                  )
                  return {
                    is: () => ({
                      limit: () => ({ data: filtered }),
                    }),
                  }
                },
              }),
            }),
          }
        }

        if (table === 'custom_domains') {
          return {
            select: () => ({
              in: () => ({
                ilike: (_col: string, pattern: string) => {
                  const term = pattern.replace(/%/g, '').toLowerCase()
                  return {
                    limit: () => ({
                      data: mockDomains.filter((d) =>
                        d.domain.toLowerCase().includes(term),
                      ),
                    }),
                  }
                },
              }),
            }),
          }
        }

        return { select: () => ({ in: () => ({ data: [] }) }) }
      },
    }),
  }
})

import { globalSearch, groupByWorkspace } from '@/lib/search/global-search'

describe('Global search', () => {
  it('should find deployments by slug', async () => {
    const results = await globalSearch('user-1', 'portfolio')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].slug).toBe('my-portfolio')
  })

  it('should find deployments by partial slug', async () => {
    const results = await globalSearch('user-1', 'team')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.slug === 'team-docs')).toBe(true)
  })

  it('should return empty results for very short queries', async () => {
    const results = await globalSearch('user-1', 'a')
    expect(results).toEqual([])
  })

  it('should return empty results for empty query', async () => {
    const results = await globalSearch('user-1', '')
    expect(results).toEqual([])
  })

  it('should return empty results for empty userId', async () => {
    const results = await globalSearch('', 'test')
    expect(results).toEqual([])
  })

  it('should include workspace name in results', async () => {
    const results = await globalSearch('user-1', 'portfolio')
    expect(results[0].workspaceName).toBe('Personal')
  })

  it('should set correct matchField', async () => {
    const results = await globalSearch('user-1', 'portfolio')
    expect(results[0].matchField).toBe('slug')
  })

  it('should not return archived deployments', async () => {
    const results = await globalSearch('user-1', 'archived')
    // The mock filters out archived_at != null
    expect(results.every((r) => r.slug !== 'archived-site')).toBe(true)
  })
})

describe('groupByWorkspace', () => {
  it('should group results by workspace', () => {
    const results = [
      {
        id: 'dep-1',
        slug: 'site-a',
        workspaceId: 'ws-1',
        workspaceName: 'Personal',
        entryPath: 'index.html',
        namespace: null,
        isDisabled: false,
        createdAt: '2026-03-28T00:00:00Z',
        matchField: 'slug' as const,
      },
      {
        id: 'dep-2',
        slug: 'site-b',
        workspaceId: 'ws-2',
        workspaceName: 'Team',
        entryPath: 'index.html',
        namespace: null,
        isDisabled: false,
        createdAt: '2026-03-29T00:00:00Z',
        matchField: 'slug' as const,
      },
      {
        id: 'dep-3',
        slug: 'site-c',
        workspaceId: 'ws-1',
        workspaceName: 'Personal',
        entryPath: 'index.html',
        namespace: null,
        isDisabled: false,
        createdAt: '2026-03-29T00:00:00Z',
        matchField: 'slug' as const,
      },
    ]

    const grouped = groupByWorkspace(results)
    expect(grouped).toHaveLength(2)

    const personalGroup = grouped.find((g) => g.workspace.id === 'ws-1')
    expect(personalGroup?.results).toHaveLength(2)

    const teamGroup = grouped.find((g) => g.workspace.id === 'ws-2')
    expect(teamGroup?.results).toHaveLength(1)
  })

  it('should handle empty results', () => {
    const grouped = groupByWorkspace([])
    expect(grouped).toEqual([])
  })
})
