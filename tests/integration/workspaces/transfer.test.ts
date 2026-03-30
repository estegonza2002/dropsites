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

const OWNER_ID = '00000000-0000-0000-0000-000000000001'
const NEW_OWNER_ID = '00000000-0000-0000-0000-000000000002'
const WORKSPACE_ID = '00000000-0000-0000-0000-000000000010'

const OWNER_AUTH = {
  userId: OWNER_ID,
  workspaceId: WORKSPACE_ID,
  method: 'session' as const,
}

const NEW_OWNER_AUTH = {
  userId: NEW_OWNER_ID,
  workspaceId: WORKSPACE_ID,
  method: 'session' as const,
}

// ---------------------------------------------------------------------------
// Admin mock builder
// ---------------------------------------------------------------------------

function buildAdminMock(overrides: {
  workspaceReturn?: unknown
  memberReturn?: unknown
  updateReturn?: unknown
} = {}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.neq = vi.fn().mockReturnValue(chain)
  chain.is = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue({
    data: overrides.workspaceReturn ?? {
      id: WORKSPACE_ID,
      owner_id: OWNER_ID,
      is_personal: false,
    },
    error: null,
  })
  chain.maybeSingle = vi.fn().mockResolvedValue({
    data: overrides.memberReturn ?? {
      id: 'member-1',
      user_id: NEW_OWNER_ID,
      role: 'publisher',
    },
    error: null,
  })

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
  vi.resetModules()
})

describe('POST /api/v1/workspaces/[id]/transfer — initiate transfer', () => {
  it('initiates transfer as owner', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(OWNER_AUTH)
    vi.mocked(getUserRole).mockResolvedValue('owner')
    buildAdminMock()

    const { POST } = await import('@/app/api/v1/workspaces/[id]/transfer/route')

    const req = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner_id: NEW_OWNER_ID }),
      },
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.token).toBeDefined()
    expect(json.data.new_owner_id).toBe(NEW_OWNER_ID)
    expect(json.data.expires_at).toBeDefined()
  })

  it('rejects transfer from non-owner', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(NEW_OWNER_AUTH)
    vi.mocked(getUserRole).mockResolvedValue('publisher')
    buildAdminMock()

    const { POST } = await import('@/app/api/v1/workspaces/[id]/transfer/route')

    const req = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner_id: OWNER_ID }),
      },
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(403)
  })

  it('rejects self-transfer', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(OWNER_AUTH)
    vi.mocked(getUserRole).mockResolvedValue('owner')
    buildAdminMock()

    const { POST } = await import('@/app/api/v1/workspaces/[id]/transfer/route')

    const req = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner_id: OWNER_ID }),
      },
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('self_transfer')
  })

  it('rejects missing new_owner_id', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(OWNER_AUTH)
    vi.mocked(getUserRole).mockResolvedValue('owner')
    buildAdminMock()

    const { POST } = await import('@/app/api/v1/workspaces/[id]/transfer/route')

    const req = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('invalid_field')
  })
})

describe('PUT /api/v1/workspaces/[id]/transfer — confirm transfer', () => {
  it('rejects invalid token', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(NEW_OWNER_AUTH)
    buildAdminMock()

    const { PUT } = await import('@/app/api/v1/workspaces/[id]/transfer/route')

    const req = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token' }),
      },
    )

    const res = await PUT(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('transfer_failed')
  })

  it('rejects missing token', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(NEW_OWNER_AUTH)
    buildAdminMock()

    const { PUT } = await import('@/app/api/v1/workspaces/[id]/transfer/route')

    const req = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
    )

    const res = await PUT(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('invalid_field')
  })

  it('completes transfer with valid token', async () => {
    // First initiate to get a real token
    vi.mocked(authenticateRequest).mockResolvedValue(OWNER_AUTH)
    vi.mocked(getUserRole).mockResolvedValue('owner')
    buildAdminMock()

    const { POST, PUT } = await import('@/app/api/v1/workspaces/[id]/transfer/route')

    const initReq = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner_id: NEW_OWNER_ID }),
      },
    )

    const initRes = await POST(initReq as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })
    expect(initRes.status).toBe(201)
    const initJson = await initRes.json()
    const token = initJson.data.token

    // Now confirm as the new owner
    vi.mocked(authenticateRequest).mockResolvedValue(NEW_OWNER_AUTH)

    const confirmReq = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      },
    )

    const confirmRes = await PUT(confirmReq as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(confirmRes.status).toBe(200)
    const confirmJson = await confirmRes.json()
    expect(confirmJson.data.status).toBe('transferred')
  })
})

describe('Transfer business logic', () => {
  it('rejects transfer of personal workspace', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(OWNER_AUTH)
    vi.mocked(getUserRole).mockResolvedValue('owner')
    buildAdminMock({
      workspaceReturn: {
        id: WORKSPACE_ID,
        owner_id: OWNER_ID,
        is_personal: true,
      },
    })

    const { POST } = await import('@/app/api/v1/workspaces/[id]/transfer/route')

    const req = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner_id: NEW_OWNER_ID }),
      },
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.message).toContain('Personal workspaces cannot be transferred')
  })

  it('rejects transfer to non-member', async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(OWNER_AUTH)
    vi.mocked(getUserRole).mockResolvedValue('owner')
    buildAdminMock({ memberReturn: null })

    const { POST } = await import('@/app/api/v1/workspaces/[id]/transfer/route')

    const req = new Request(
      `http://localhost/api/v1/workspaces/${WORKSPACE_ID}/transfer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner_id: '00000000-0000-0000-0000-000000000099' }),
      },
    )

    const res = await POST(req as never, {
      params: Promise.resolve({ id: WORKSPACE_ID }),
    })

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.message).toContain('accepted member')
  })
})
