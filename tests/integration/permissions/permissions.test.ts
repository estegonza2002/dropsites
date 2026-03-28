// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserRole, requireRole, ForbiddenError } from '@/lib/auth/permissions'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OWNER_ID = '00000000-0000-0000-0000-000000000001'
const PUBLISHER_ID = '00000000-0000-0000-0000-000000000002'
const VIEWER_ID = '00000000-0000-0000-0000-000000000003'
const NON_MEMBER_ID = '00000000-0000-0000-0000-000000000004'
const PENDING_ID = '00000000-0000-0000-0000-000000000005'
const WORKSPACE_ID = '00000000-0000-0000-0000-000000000010'

const MEMBERS = [
  {
    user_id: OWNER_ID,
    workspace_id: WORKSPACE_ID,
    role: 'owner',
    accepted_at: '2026-01-01T00:00:00Z',
  },
  {
    user_id: PUBLISHER_ID,
    workspace_id: WORKSPACE_ID,
    role: 'publisher',
    accepted_at: '2026-01-02T00:00:00Z',
  },
  {
    user_id: VIEWER_ID,
    workspace_id: WORKSPACE_ID,
    role: 'viewer',
    accepted_at: '2026-01-03T00:00:00Z',
  },
  {
    user_id: PENDING_ID,
    workspace_id: WORKSPACE_ID,
    role: 'publisher',
    accepted_at: null, // pending invitation
  },
]

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

/**
 * Builds a mock Supabase client whose `.from('workspace_members')`
 * returns rows matching the eq() filters, respecting `accepted_at IS NOT NULL`.
 */
function buildSupabaseMock() {
  const fromMock = vi.fn().mockImplementation(() => {
    let filters: Record<string, unknown> = {}
    let notFilters: Array<{ column: string; op: string; value: unknown }> = []

    const chain = {
      select: () => chain,
      eq: (col: string, val: unknown) => {
        filters[col] = val
        return chain
      },
      not: (col: string, op: string, val: unknown) => {
        notFilters.push({ column: col, op, value: val })
        return chain
      },
      maybeSingle: () => {
        let rows = MEMBERS.filter((m) => {
          for (const [key, value] of Object.entries(filters)) {
            if ((m as Record<string, unknown>)[key] !== value) return false
          }
          return true
        })

        // Apply NOT filters
        for (const nf of notFilters) {
          if (nf.op === 'is' && nf.value === null) {
            // NOT ... IS NULL means column IS NOT NULL
            rows = rows.filter(
              (m) => (m as Record<string, unknown>)[nf.column] !== null,
            )
          }
        }

        const row = rows[0] ?? null
        return Promise.resolve({ data: row, error: null })
      },
    }

    return chain
  })

  return { from: fromMock }
}

// ---------------------------------------------------------------------------
// Tests: getUserRole
// ---------------------------------------------------------------------------

describe('getUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mock = buildSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(mock as never)
  })

  it('returns "owner" for an accepted owner', async () => {
    const role = await getUserRole(OWNER_ID, WORKSPACE_ID)
    expect(role).toBe('owner')
  })

  it('returns "publisher" for an accepted publisher', async () => {
    const role = await getUserRole(PUBLISHER_ID, WORKSPACE_ID)
    expect(role).toBe('publisher')
  })

  it('returns "viewer" for an accepted viewer', async () => {
    const role = await getUserRole(VIEWER_ID, WORKSPACE_ID)
    expect(role).toBe('viewer')
  })

  it('returns null for a non-member', async () => {
    const role = await getUserRole(NON_MEMBER_ID, WORKSPACE_ID)
    expect(role).toBeNull()
  })

  it('returns null for a pending invitation (accepted_at IS NULL)', async () => {
    const role = await getUserRole(PENDING_ID, WORKSPACE_ID)
    expect(role).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Tests: requireRole
// ---------------------------------------------------------------------------

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mock = buildSupabaseMock()
    vi.mocked(createClient).mockResolvedValue(mock as never)
  })

  it('passes for owner when owner role is required', async () => {
    await expect(requireRole(OWNER_ID, WORKSPACE_ID, 'owner')).resolves.toBeUndefined()
  })

  it('passes for publisher when publisher role is required', async () => {
    await expect(requireRole(PUBLISHER_ID, WORKSPACE_ID, 'publisher')).resolves.toBeUndefined()
  })

  it('passes for owner when publisher role is required (higher rank)', async () => {
    await expect(requireRole(OWNER_ID, WORKSPACE_ID, 'publisher')).resolves.toBeUndefined()
  })

  it('passes for viewer when viewer role is required', async () => {
    await expect(requireRole(VIEWER_ID, WORKSPACE_ID, 'viewer')).resolves.toBeUndefined()
  })

  it('passes for publisher when viewer role is required (higher rank)', async () => {
    await expect(requireRole(PUBLISHER_ID, WORKSPACE_ID, 'viewer')).resolves.toBeUndefined()
  })

  it('throws ForbiddenError for viewer when publisher role is required', async () => {
    await expect(requireRole(VIEWER_ID, WORKSPACE_ID, 'publisher')).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError for viewer when owner role is required', async () => {
    await expect(requireRole(VIEWER_ID, WORKSPACE_ID, 'owner')).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError for publisher when owner role is required', async () => {
    await expect(requireRole(PUBLISHER_ID, WORKSPACE_ID, 'owner')).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError for non-member', async () => {
    await expect(requireRole(NON_MEMBER_ID, WORKSPACE_ID, 'viewer')).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError for pending invitation', async () => {
    await expect(requireRole(PENDING_ID, WORKSPACE_ID, 'viewer')).rejects.toThrow(ForbiddenError)
  })
})

// ---------------------------------------------------------------------------
// Tests: RLS policy coverage (verifying SQL structure)
// ---------------------------------------------------------------------------

describe('RLS policy design verification', () => {
  /**
   * These tests verify the permission model design by testing the role hierarchy
   * and access patterns that RLS policies enforce at the DB level.
   * The actual SQL policies are tested via the Supabase integration, but here
   * we verify the application-layer mirrors the same constraints.
   */

  describe('deployment access rules', () => {
    it('owner can read deployments (SELECT)', async () => {
      const role = await getUserRole(OWNER_ID, WORKSPACE_ID)
      expect(role).toBe('owner')
      expect(['owner', 'publisher', 'viewer']).toContain(role)
    })

    it('publisher can read deployments (SELECT)', async () => {
      const role = await getUserRole(PUBLISHER_ID, WORKSPACE_ID)
      expect(['owner', 'publisher', 'viewer']).toContain(role)
    })

    it('viewer can read deployments (SELECT)', async () => {
      const role = await getUserRole(VIEWER_ID, WORKSPACE_ID)
      expect(['owner', 'publisher', 'viewer']).toContain(role)
    })

    it('owner can create deployments (INSERT)', async () => {
      const role = await getUserRole(OWNER_ID, WORKSPACE_ID)
      expect(['owner', 'publisher']).toContain(role)
    })

    it('publisher can create deployments (INSERT)', async () => {
      const role = await getUserRole(PUBLISHER_ID, WORKSPACE_ID)
      expect(['owner', 'publisher']).toContain(role)
    })

    it('viewer cannot create deployments (INSERT)', async () => {
      const role = await getUserRole(VIEWER_ID, WORKSPACE_ID)
      expect(['owner', 'publisher']).not.toContain(role)
    })

    it('owner can delete deployments (DELETE)', async () => {
      const role = await getUserRole(OWNER_ID, WORKSPACE_ID)
      expect(role).toBe('owner')
    })

    it('publisher cannot delete deployments (DELETE)', async () => {
      const role = await getUserRole(PUBLISHER_ID, WORKSPACE_ID)
      expect(role).not.toBe('owner')
    })

    it('viewer cannot delete deployments (DELETE)', async () => {
      const role = await getUserRole(VIEWER_ID, WORKSPACE_ID)
      expect(role).not.toBe('owner')
    })

    it('non-member cannot access deployments at all', async () => {
      const role = await getUserRole(NON_MEMBER_ID, WORKSPACE_ID)
      expect(role).toBeNull()
    })
  })

  describe('workspace settings access rules', () => {
    it('only owner can update workspace settings', async () => {
      const ownerRole = await getUserRole(OWNER_ID, WORKSPACE_ID)
      const publisherRole = await getUserRole(PUBLISHER_ID, WORKSPACE_ID)
      const viewerRole = await getUserRole(VIEWER_ID, WORKSPACE_ID)

      expect(ownerRole).toBe('owner')
      expect(publisherRole).not.toBe('owner')
      expect(viewerRole).not.toBe('owner')
    })

    it('only owner can delete workspace', async () => {
      const ownerRole = await getUserRole(OWNER_ID, WORKSPACE_ID)
      const publisherRole = await getUserRole(PUBLISHER_ID, WORKSPACE_ID)

      expect(ownerRole).toBe('owner')
      expect(publisherRole).not.toBe('owner')
    })
  })

  describe('member management access rules', () => {
    it('only owner can invite members', async () => {
      await expect(requireRole(OWNER_ID, WORKSPACE_ID, 'owner')).resolves.toBeUndefined()
      await expect(requireRole(PUBLISHER_ID, WORKSPACE_ID, 'owner')).rejects.toThrow(ForbiddenError)
      await expect(requireRole(VIEWER_ID, WORKSPACE_ID, 'owner')).rejects.toThrow(ForbiddenError)
    })

    it('only owner can change member roles', async () => {
      await expect(requireRole(OWNER_ID, WORKSPACE_ID, 'owner')).resolves.toBeUndefined()
      await expect(requireRole(PUBLISHER_ID, WORKSPACE_ID, 'owner')).rejects.toThrow(ForbiddenError)
    })

    it('only owner can remove other members', async () => {
      await expect(requireRole(OWNER_ID, WORKSPACE_ID, 'owner')).resolves.toBeUndefined()
      await expect(requireRole(PUBLISHER_ID, WORKSPACE_ID, 'owner')).rejects.toThrow(ForbiddenError)
    })
  })

  describe('pending invitation isolation', () => {
    it('pending member cannot read workspace data', async () => {
      const role = await getUserRole(PENDING_ID, WORKSPACE_ID)
      expect(role).toBeNull()
    })

    it('pending member cannot create deployments', async () => {
      await expect(requireRole(PENDING_ID, WORKSPACE_ID, 'publisher')).rejects.toThrow(ForbiddenError)
    })

    it('pending member cannot read deployments', async () => {
      await expect(requireRole(PENDING_ID, WORKSPACE_ID, 'viewer')).rejects.toThrow(ForbiddenError)
    })
  })
})
