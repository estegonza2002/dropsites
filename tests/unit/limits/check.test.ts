// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { checkDeploymentLimits } from '@/lib/limits/check'

const MB = 1024 * 1024

function makeSupabaseMock({
  profile,
  deployments,
}: {
  profile: Record<string, unknown>
  deployments: Array<{ storage_bytes: number }>
}) {
  const selectMock = vi.fn()

  selectMock.mockImplementation((fields: string) => {
    if (fields === '*') {
      // limit_profiles query
      return {
        eq: () => ({
          single: () => Promise.resolve({ data: profile, error: null }),
        }),
      }
    }
    if (fields === 'limit_profile') {
      // workspaces query
      return {
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { limit_profile: profile.name }, error: null }),
        }),
      }
    }
    if (fields === 'storage_bytes') {
      // deployments query
      return {
        eq: () => ({
          is: () => Promise.resolve({ data: deployments, error: null }),
        }),
      }
    }
    return {
      eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
    }
  })

  return {
    from: vi.fn(() => ({ select: selectMock })),
  }
}

const freeProfile = {
  name: 'free',
  max_deployments: 10,
  max_deploy_size_bytes: 50 * MB,
  max_total_storage_bytes: 500 * MB,
  max_monthly_bandwidth_bytes: 10 * 1024 * MB,
  max_file_size_bytes: 10 * MB,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('checkDeploymentLimits', () => {
  it('allows upload within all limits', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({
        profile: freeProfile,
        deployments: [{ storage_bytes: 10 * MB }],
      }),
    )

    const result = await checkDeploymentLimits('ws-1', 5 * MB, 3)
    expect(result.allowed).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('rejects when deployment count is at the limit', async () => {
    const deployments = Array.from({ length: 10 }, () => ({ storage_bytes: MB }))
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({ profile: freeProfile, deployments }),
    )

    const result = await checkDeploymentLimits('ws-1', 1 * MB, 1)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/deployment limit/i)
  })

  it('rejects when upload exceeds max_deploy_size_bytes', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({
        profile: freeProfile,
        deployments: [{ storage_bytes: MB }],
      }),
    )

    const result = await checkDeploymentLimits('ws-1', 51 * MB, 1)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/50 MB/i)
  })

  it('rejects when total storage would be exceeded', async () => {
    const deployments = Array.from({ length: 9 }, () => ({ storage_bytes: 55 * MB }))
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({ profile: freeProfile, deployments }),
    )

    // 9 * 55 MB = 495 MB used, adding 10 MB = 505 MB > 500 MB limit
    const result = await checkDeploymentLimits('ws-1', 10 * MB, 1)
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/storage full/i)
  })

  it('allows unlimited enterprise profile regardless of size', async () => {
    const enterpriseProfile = {
      name: 'enterprise',
      max_deployments: -1,
      max_deploy_size_bytes: -1,
      max_total_storage_bytes: -1,
      max_monthly_bandwidth_bytes: -1,
      max_file_size_bytes: -1,
    }
    const deployments = Array.from({ length: 1000 }, () => ({ storage_bytes: 100 * MB }))
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({ profile: enterpriseProfile, deployments }),
    )

    const result = await checkDeploymentLimits('ws-ent', 2048 * MB, 100)
    expect(result.allowed).toBe(true)
  })

  it('includes specific limit value in rejection message', async () => {
    ;(createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      makeSupabaseMock({
        profile: freeProfile,
        deployments: [{ storage_bytes: MB }],
      }),
    )

    const result = await checkDeploymentLimits('ws-1', 60 * MB, 1)
    expect(result.reason).toContain('50 MB')
  })
})
