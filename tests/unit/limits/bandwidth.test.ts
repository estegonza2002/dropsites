// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { checkBandwidthLimit, getMonthlyBandwidth } from '@/lib/limits/bandwidth'

const GB = 1024 * 1024 * 1024
const MB = 1024 * 1024

const freeProfile = {
  name: 'free',
  max_deployments: 10,
  max_deploy_size_bytes: 50 * MB,
  max_total_storage_bytes: 500 * MB,
  max_monthly_bandwidth_bytes: 10 * GB,
  max_file_size_bytes: 10 * MB,
}

function makeSupabaseMock({
  profile,
  deploymentIds,
  bandwidthRows,
}: {
  profile: Record<string, unknown>
  deploymentIds: string[]
  bandwidthRows: Array<{ bytes_served: number }>
}) {
  const selectMock = vi.fn()

  selectMock.mockImplementation((fields: string) => {
    if (fields === '*') {
      return {
        eq: () => ({
          single: () => Promise.resolve({ data: profile, error: null }),
        }),
      }
    }
    if (fields === 'limit_profile') {
      return {
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { limit_profile: profile.name }, error: null }),
        }),
      }
    }
    if (fields === 'id') {
      return {
        eq: () =>
          Promise.resolve({
            data: deploymentIds.map((id) => ({ id })),
            error: null,
          }),
      }
    }
    if (fields === 'bytes_served') {
      return {
        in: () => ({
          gte: () => Promise.resolve({ data: bandwidthRows, error: null }),
        }),
      }
    }
    return {}
  })

  return { from: vi.fn(() => ({ select: selectMock })) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getMonthlyBandwidth', () => {
  it('sums bytes from all deployments this month', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({
        profile: freeProfile,
        deploymentIds: ['d1', 'd2'],
        bandwidthRows: [{ bytes_served: 2 * GB }, { bytes_served: 3 * GB }],
      }),
    )

    const result = await getMonthlyBandwidth('ws-1')
    expect(result.used).toBe(5 * GB)
    expect(result.limit).toBe(10 * GB)
  })

  it('returns 0 used when workspace has no deployments', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({
        profile: freeProfile,
        deploymentIds: [],
        bandwidthRows: [],
      }),
    )

    const result = await getMonthlyBandwidth('ws-empty')
    expect(result.used).toBe(0)
  })

  it('returns -1 limit for unlimited profiles', async () => {
    const enterpriseProfile = { ...freeProfile, name: 'enterprise', max_monthly_bandwidth_bytes: -1 }
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({
        profile: enterpriseProfile,
        deploymentIds: ['d1'],
        bandwidthRows: [{ bytes_served: 100 * GB }],
      }),
    )

    const result = await getMonthlyBandwidth('ws-ent')
    expect(result.limit).toBe(-1)
  })
})

describe('checkBandwidthLimit', () => {
  it('allows when bandwidth is under the limit', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({
        profile: freeProfile,
        deploymentIds: ['d1'],
        bandwidthRows: [{ bytes_served: 5 * GB }],
      }),
    )

    const result = await checkBandwidthLimit('ws-1')
    expect(result.allowed).toBe(true)
    expect(result.used).toBe(5 * GB)
    expect(result.limit).toBe(10 * GB)
  })

  it('blocks when bandwidth meets or exceeds the limit', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({
        profile: freeProfile,
        deploymentIds: ['d1'],
        bandwidthRows: [{ bytes_served: 10 * GB }],
      }),
    )

    const result = await checkBandwidthLimit('ws-1')
    expect(result.allowed).toBe(false)
  })

  it('always allows for unlimited (-1) profiles', async () => {
    const enterpriseProfile = { ...freeProfile, name: 'enterprise', max_monthly_bandwidth_bytes: -1 }
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({
        profile: enterpriseProfile,
        deploymentIds: ['d1'],
        bandwidthRows: [{ bytes_served: 999 * GB }],
      }),
    )

    const result = await checkBandwidthLimit('ws-ent')
    expect(result.allowed).toBe(true)
  })
})
