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

vi.mock('@/lib/api/auth', () => ({
  authenticateRequest: vi.fn(),
}))

vi.mock('@/lib/api/rate-limit', () => ({
  checkApiRateLimit: vi.fn().mockReturnValue({
    allowed: true,
    limit: 60,
    remaining: 59,
    resetAt: new Date(Date.now() + 60_000),
  }),
}))

vi.mock('@/lib/api/rate-limit-config', () => ({
  getRateLimitConfig: vi.fn().mockResolvedValue({
    perMinute: 60,
    daily: 10000,
    monthly: 100000,
    burstMultiplier: 3,
  }),
}))

vi.mock('@/lib/auth/permissions', () => ({
  getUserRole: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/api/auth'
import { getUserRole } from '@/lib/auth/permissions'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_USER_ID = '00000000-0000-0000-0000-000000000002'
const WORKSPACE_ID = '00000000-0000-0000-0000-000000000010'

const AUTH: { userId: string; workspaceId: string; method: 'session' } = {
  userId: USER_ID,
  workspaceId: WORKSPACE_ID,
  method: 'session',
}

const WORKSPACE_ROW = {
  id: WORKSPACE_ID,
  name: 'Test Workspace',
  namespace_slug: 'test-ws',
  owner_id: USER_ID,
  is_personal: false,
  limit_profile: 'free',
  trial_started_at: null,
  trial_ends_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
}

// ---------------------------------------------------------------------------
// Admin mock builder
// ---------------------------------------------------------------------------

type MockChainOverrides = {
  selectReturn?: unknown
  insertReturn?: unknown
  updateReturn?: unknown
  deleteReturn?: unknown
  countReturn?: number
  maybeSingleReturn?: unknown
}

function buildAdminMock(overrides: MockChainOverrides = {}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.neq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue({
    data: overrides.selectReturn ?? WORKSPACE_ROW,
    error: null,
  })
  chain.maybeSingle = vi.fn().mockResolvedValue({
    data: overrides.maybeSingleReturn ?? null,
    error: null,
  })

  // For count queries
  if (overrides.countReturn !== undefined) {
    chain.select = vi.fn().mockReturnValue({
      ...chain,
      eq: vi.fn().mockReturnValue({
        ...chain,
        not: vi.fn().mockResolvedValue({
          count: overrides.countReturn,
          data: null,
          error: null,
        }),
      }),
    })
  }

  const from = vi.fn().mockReturnValue(chain)
  const mock = { from }

  vi.mocked(createAdminClient).mockReturnValue(mock as never)
  return { mock, chain }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(authenticateRequest).mockResolvedValue(AUTH)
})

describe('POST /api/v1/workspaces', () => {
  it('creates a workspace with valid name', async () => {
    const { chain } = buildAdminMock()

    // insert -> select -> single for workspace creation
    chain.single.mockResolvedValue({
      data: {
        id: WORKSPACE_ID,
        name: 'My Workspace',
        namespace_slug: null,
        owner_id: USER_ID,
        is_personal: false,
        limit_profile: 'free',
        created_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    })
    chain.insert.mockReturnValue(chain)

    const { POST } = await import('@/app/api/v1/workspaces/route')

    const req = new Request('http://localhost/api/v1/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Workspace' }),
    })

    const res = await POST(req as never, { params: Promise.resolve({}) })
    expect(res.status).toBe(201)

    const json = await res.json()
    expect(json.data.name).toBe('My Workspace')
  })

  it('rejects empty name', async () => {
    buildAdminMock()

    const { POST } = await import('@/app/api/v1/workspaces/route')

    const req = new Request('http://localhost/api/v1/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })

    const res = await POST(req as never, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error.code).toBe('invalid_field')
  })

  it('rejects invalid namespace', async () => {
    buildAdminMock()

    const { POST } = await import('@/app/api/v1/workspaces/route')

    const req = new Request('http://localhost/api/v1/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', namespace: '-invalid' }),
    })

    const res = await POST(req as never, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)

    const json = await res.json()
    expect(json.error.code).toBe('invalid_namespace')
  })
})

describe('GET /api/v1/workspaces', () => {
  it('returns workspaces the user is a member of', async () => {
    const { chain } = buildAdminMock()

    // First call: memberships query
    // Second call: workspaces query
    let _callCount = 0
    chain.select.mockImplementation(() => {
      _callCount++
      return chain
    })
    chain.not.mockResolvedValueOnce({
      data: [{ workspace_id: WORKSPACE_ID, role: 'owner' }],
      error: null,
    })

    // For the workspaces query after .order()
    chain.order.mockResolvedValue({
      data: [{ ...WORKSPACE_ROW }],
      error: null,
    })

    const { GET } = await import('@/app/api/v1/workspaces/route')

    const req = new Request('http://localhost/api/v1/workspaces')
    const res = await GET(req as never, { params: Promise.resolve({}) })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json.data)).toBe(true)
  })
})

describe('GET /api/v1/workspaces/[id]', () => {
  it('returns workspace detail with member count', async () => {
    buildAdminMock({ countReturn: 3 })
    vi.mocked(getUserRole).mockResolvedValue('owner')

    const { GET } = await import('@/app/api/v1/workspaces/[id]/route')

    const req = new Request('http://localhost/api/v1/workspaces/' + WORKSPACE_ID)
    const res = await GET(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe(WORKSPACE_ID)
    expect(json.data.role).toBe('owner')
  })

  it('returns 404 for non-member', async () => {
    buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue(null)

    const { GET } = await import('@/app/api/v1/workspaces/[id]/route')

    const req = new Request('http://localhost/api/v1/workspaces/' + WORKSPACE_ID)
    const res = await GET(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    // resolveWorkspace returns null when role is null
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/v1/workspaces/[id]', () => {
  it('updates workspace name as owner', async () => {
    const { chain } = buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue('owner')

    chain.single.mockResolvedValue({
      data: {
        ...WORKSPACE_ROW,
        name: 'Updated Name',
        updated_at: '2026-03-29T00:00:00Z',
      },
      error: null,
    })

    const { PATCH } = await import('@/app/api/v1/workspaces/[id]/route')

    const req = new Request('http://localhost/api/v1/workspaces/' + WORKSPACE_ID, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated Name' }),
    })

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(200)
  })

  it('rejects update from non-owner', async () => {
    buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue('viewer')

    const { PATCH } = await import('@/app/api/v1/workspaces/[id]/route')

    const req = new Request('http://localhost/api/v1/workspaces/' + WORKSPACE_ID, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    })

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/v1/workspaces/[id]', () => {
  it('soft-deletes workspace as owner', async () => {
    buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue('owner')

    const { DELETE } = await import('@/app/api/v1/workspaces/[id]/route')

    const req = new Request('http://localhost/api/v1/workspaces/' + WORKSPACE_ID, {
      method: 'DELETE',
    })

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(204)
  })

  it('rejects delete from non-owner', async () => {
    buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue('publisher')

    const { DELETE } = await import('@/app/api/v1/workspaces/[id]/route')

    const req = new Request('http://localhost/api/v1/workspaces/' + WORKSPACE_ID, {
      method: 'DELETE',
    })

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(403)
  })

  it('prevents deleting personal workspace', async () => {
    buildAdminMock({
      selectReturn: { ...WORKSPACE_ROW, is_personal: true },
    })
    vi.mocked(getUserRole).mockResolvedValue('owner')

    const { DELETE } = await import('@/app/api/v1/workspaces/[id]/route')

    const req = new Request('http://localhost/api/v1/workspaces/' + WORKSPACE_ID, {
      method: 'DELETE',
    })

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('cannot_delete_personal')
  })
})

describe('POST /api/v1/workspaces/[id]/members', () => {
  it('rejects invite from non-owner', async () => {
    buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue('publisher')

    const { POST } = await import('@/app/api/v1/workspaces/[id]/members/route')

    const req = new Request('http://localhost/api/v1/workspaces/' + WORKSPACE_ID + '/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', role: 'viewer' }),
    })

    const res = await POST(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(403)
  })

  it('rejects invalid email', async () => {
    buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue('owner')

    const { POST } = await import('@/app/api/v1/workspaces/[id]/members/route')

    const req = new Request('http://localhost/api/v1/workspaces/' + WORKSPACE_ID + '/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', role: 'viewer' }),
    })

    const res = await POST(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('invalid_field')
  })
})

describe('PATCH /api/v1/workspaces/[id]/members/[userId]', () => {
  it('prevents self role change', async () => {
    buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue('owner')

    const { PATCH } = await import(
      '@/app/api/v1/workspaces/[id]/members/[userId]/route'
    )

    const req = new Request(
      'http://localhost/api/v1/workspaces/' + WORKSPACE_ID + '/members/' + USER_ID,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      },
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID, userId: USER_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('self_role_change')
  })

  it('rejects role update from non-owner', async () => {
    buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue('publisher')

    const { PATCH } = await import(
      '@/app/api/v1/workspaces/[id]/members/[userId]/route'
    )

    const req = new Request(
      'http://localhost/api/v1/workspaces/' + WORKSPACE_ID + '/members/' + OTHER_USER_ID,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' }),
      },
    )

    const res = await PATCH(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID, userId: OTHER_USER_ID }),
    })

    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/v1/workspaces/[id]/members/[userId]', () => {
  it('rejects non-owner removing another member', async () => {
    buildAdminMock()
    vi.mocked(getUserRole).mockResolvedValue('viewer')

    const { DELETE } = await import(
      '@/app/api/v1/workspaces/[id]/members/[userId]/route'
    )

    const req = new Request(
      'http://localhost/api/v1/workspaces/' + WORKSPACE_ID + '/members/' + OTHER_USER_ID,
      { method: 'DELETE' },
    )

    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID, userId: OTHER_USER_ID }),
    })

    expect(res.status).toBe(403)
  })
})
