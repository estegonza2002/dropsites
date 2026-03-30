import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------- Uptime tracker mock ----------

const mockCalculateMonthlyUptime = vi.fn()

vi.mock('@/lib/health/uptime-tracker', () => ({
  calculateMonthlyUptime: (...args: unknown[]) => mockCalculateMonthlyUptime(...args),
}))

// ---------- Supabase admin mock ----------

const mockInsert = vi.fn().mockReturnValue({ error: null })
const mockSelectSingle = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'audit_log') {
        return { insert: mockInsert }
      }
      if (table === 'workspaces') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSelectSingle,
            }),
          }),
        }
      }
      return {
        select: () => ({ eq: () => ({ single: mockSelectSingle }) }),
        insert: mockInsert,
      }
    },
  }),
}))

// ---------- Tests ----------

describe('Service Credits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateServiceCredit', () => {
    it('rejects invalid month format', async () => {
      const { calculateServiceCredit } = await import('@/lib/billing/service-credits')
      const result = await calculateServiceCredit('ws1', 'invalid')

      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Invalid month format')
    })

    it('returns not eligible for free tier', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { id: 'ws1', limit_profile: 'free', stripe_subscription_id: null },
        error: null,
      })

      const { calculateServiceCredit } = await import('@/lib/billing/service-credits')
      const result = await calculateServiceCredit('ws1', '2026-03')

      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Free-tier')
    })

    it('returns not eligible when uptime meets SLA', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { id: 'ws1', limit_profile: 'pro', stripe_subscription_id: 'sub_123' },
        error: null,
      })
      mockCalculateMonthlyUptime.mockResolvedValue(99.95)

      const { calculateServiceCredit } = await import('@/lib/billing/service-credits')
      const result = await calculateServiceCredit('ws1', '2026-03')

      expect(result.eligible).toBe(false)
      expect(result.uptimePercent).toBe(99.95)
    })

    it('returns 10% credit for 99.0-99.9% uptime', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { id: 'ws1', limit_profile: 'pro', stripe_subscription_id: 'sub_123' },
        error: null,
      })
      mockCalculateMonthlyUptime.mockResolvedValue(99.5)

      const { calculateServiceCredit } = await import('@/lib/billing/service-credits')
      const result = await calculateServiceCredit('ws1', '2026-03')

      expect(result.eligible).toBe(true)
      expect(result.creditPercent).toBe(10)
      expect(result.creditAmount).toBe(190) // 10% of $19 (1900 cents)
      expect(result.monthlyFee).toBe(1900)
    })

    it('returns 25% credit for 95.0-99.0% uptime', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { id: 'ws1', limit_profile: 'pro', stripe_subscription_id: 'sub_123' },
        error: null,
      })
      mockCalculateMonthlyUptime.mockResolvedValue(97.0)

      const { calculateServiceCredit } = await import('@/lib/billing/service-credits')
      const result = await calculateServiceCredit('ws1', '2026-03')

      expect(result.eligible).toBe(true)
      expect(result.creditPercent).toBe(25)
      expect(result.creditAmount).toBe(475) // 25% of 1900
    })

    it('returns 50% credit for below 95% uptime', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { id: 'ws1', limit_profile: 'pro', stripe_subscription_id: 'sub_123' },
        error: null,
      })
      mockCalculateMonthlyUptime.mockResolvedValue(90.0)

      const { calculateServiceCredit } = await import('@/lib/billing/service-credits')
      const result = await calculateServiceCredit('ws1', '2026-03')

      expect(result.eligible).toBe(true)
      expect(result.creditPercent).toBe(50)
      expect(result.creditAmount).toBe(950) // 50% of 1900
    })

    it('calculates enterprise plan credits correctly', async () => {
      mockSelectSingle.mockResolvedValue({
        data: { id: 'ws1', limit_profile: 'enterprise', stripe_subscription_id: 'sub_456' },
        error: null,
      })
      mockCalculateMonthlyUptime.mockResolvedValue(99.5)

      const { calculateServiceCredit } = await import('@/lib/billing/service-credits')
      const result = await calculateServiceCredit('ws1', '2026-03')

      expect(result.eligible).toBe(true)
      expect(result.creditPercent).toBe(10)
      expect(result.creditAmount).toBe(490) // 10% of $49 (4900 cents)
      expect(result.monthlyFee).toBe(4900)
    })

    it('handles workspace not found', async () => {
      mockSelectSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      const { calculateServiceCredit } = await import('@/lib/billing/service-credits')
      const result = await calculateServiceCredit('nonexistent', '2026-03')

      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Workspace not found')
    })
  })

  describe('applyServiceCredit', () => {
    it('records credit in audit log', async () => {
      const { applyServiceCredit } = await import('@/lib/billing/service-credits')
      await applyServiceCredit('ws1', 190)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'billing.service_credit_applied',
          target_id: 'ws1',
          target_type: 'workspace',
        }),
      )
    })

    it('does not record for zero amount', async () => {
      mockInsert.mockClear()

      const { applyServiceCredit } = await import('@/lib/billing/service-credits')
      await applyServiceCredit('ws1', 0)

      expect(mockInsert).not.toHaveBeenCalled()
    })
  })
})
