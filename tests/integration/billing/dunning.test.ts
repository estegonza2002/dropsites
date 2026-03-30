import { describe, it, expect, vi, beforeEach } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn<(...args: any[]) => any>()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

import {
  handlePaymentFailure,
  checkGracePeriods,
  handlePaymentRecovery,
} from '@/lib/billing/dunning'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handlePaymentFailure', () => {
  it('sets grace_period_ends_at to 7 days from now', async () => {
    const now = Date.now()
    vi.setSystemTime(now)

    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { limit_profile: 'pro' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        update: vi.fn((payload: Record<string, unknown>) => {
          expect(payload.previous_limit_profile).toBe('pro')
          expect(payload.grace_period_ends_at).toBeDefined()

          const endsAt = new Date(payload.grace_period_ends_at as string).getTime()
          const expectedEndsAt = now + 7 * 24 * 60 * 60 * 1000
          // Allow 1 second tolerance
          expect(Math.abs(endsAt - expectedEndsAt)).toBeLessThan(1000)

          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      }
    })

    await handlePaymentFailure('ws-123')

    vi.useRealTimers()
  })

  it('throws when workspace is not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'not found' },
          }),
        }),
      }),
    })

    await expect(handlePaymentFailure('ws-missing')).rejects.toThrow(
      'Failed to fetch workspace ws-missing'
    )
  })
})

describe('checkGracePeriods', () => {
  it('downgrades workspaces with expired grace periods', async () => {
    const updatePayloads: Array<Record<string, unknown>> = []
    let callCount = 0

    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({
                data: [{ id: 'ws-1' }, { id: 'ws-2' }],
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        update: vi.fn((payload: Record<string, unknown>) => {
          updatePayloads.push(payload)
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      }
    })

    await checkGracePeriods()

    expect(updatePayloads.length).toBe(2)
    for (const payload of updatePayloads) {
      expect(payload.limit_profile).toBe('free')
      expect(payload.grace_period_ends_at).toBeNull()
      expect(payload.previous_limit_profile).toBeNull()
    }
  })

  it('does nothing when no grace periods are expired', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          lt: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    })

    await checkGracePeriods()

    // from() should only be called once (the select), no updates
    expect(mockFrom).toHaveBeenCalledTimes(1)
  })
})

describe('handlePaymentRecovery', () => {
  it('restores previous limit_profile and clears grace period', async () => {
    let callCount = 0
    let recoveryPayload: Record<string, unknown> = {}

    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { previous_limit_profile: 'pro' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        update: vi.fn((payload: Record<string, unknown>) => {
          recoveryPayload = payload
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      }
    })

    await handlePaymentRecovery('ws-123')

    expect(recoveryPayload.limit_profile).toBe('pro')
    expect(recoveryPayload.grace_period_ends_at).toBeNull()
    expect(recoveryPayload.previous_limit_profile).toBeNull()
  })

  it('clears grace period even without previous_limit_profile', async () => {
    let callCount = 0
    let recoveryPayload: Record<string, unknown> = {}

    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { previous_limit_profile: null },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        update: vi.fn((payload: Record<string, unknown>) => {
          recoveryPayload = payload
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      }
    })

    await handlePaymentRecovery('ws-123')

    expect(recoveryPayload.limit_profile).toBeUndefined()
    expect(recoveryPayload.grace_period_ends_at).toBeNull()
    expect(recoveryPayload.previous_limit_profile).toBeNull()
  })

  it('throws when workspace is not found', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'not found' },
          }),
        }),
      }),
    })

    await expect(handlePaymentRecovery('ws-missing')).rejects.toThrow(
      'Failed to fetch workspace ws-missing'
    )
  })
})
