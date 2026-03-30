import { describe, it, expect, vi } from 'vitest'

// Mock the admin client
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const mockData: Record<string, unknown[]> = {
        analytics_events: [
          {
            created_at: '2026-03-28T10:00:00Z',
            referrer_domain: 'google.com',
          },
          {
            created_at: '2026-03-28T11:00:00Z',
            referrer_domain: 'twitter.com',
          },
          {
            created_at: '2026-03-29T09:00:00Z',
            referrer_domain: 'google.com',
          },
          { created_at: '2026-03-29T10:00:00Z', referrer_domain: null },
        ],
      }

      return {
        select: () => ({
          eq: () => ({
            gte: () => ({
              not: () => ({
                limit: () => ({
                  data: (mockData[table] ?? []).filter(
                    (e) => (e as Record<string, unknown>).referrer_domain != null,
                  ),
                }),
              }),
              data: mockData[table] ?? [],
            }),
          }),
        }),
      }
    },
  }),
}))

import { generateAnalyticsPdf } from '@/lib/analytics/pdf-export'

describe('Analytics PDF export', () => {
  it('should generate a valid PDF buffer', async () => {
    const pdf = await generateAnalyticsPdf({
      deploymentId: 'dep-123',
      deploymentSlug: 'my-site',
      dateRange: '7d',
    })

    expect(Buffer.isBuffer(pdf)).toBe(true)
    expect(pdf.length).toBeGreaterThan(0)

    // Check PDF header
    const header = pdf.subarray(0, 8).toString('ascii')
    expect(header).toContain('%PDF-1.4')
  })

  it('should contain deployment slug in PDF', async () => {
    const pdf = await generateAnalyticsPdf({
      deploymentId: 'dep-123',
      deploymentSlug: 'test-deploy',
      dateRange: '30d',
    })

    const text = pdf.toString('ascii')
    expect(text).toContain('test-deploy')
  })

  it('should contain report title', async () => {
    const pdf = await generateAnalyticsPdf({
      deploymentId: 'dep-123',
      deploymentSlug: 'report-test',
      dateRange: '7d',
    })

    const text = pdf.toString('ascii')
    expect(text).toContain('DropSites Analytics Report')
  })

  it('should end with %%EOF', async () => {
    const pdf = await generateAnalyticsPdf({
      deploymentId: 'dep-123',
      deploymentSlug: 'eof-test',
      dateRange: '90d',
    })

    const text = pdf.toString('ascii')
    expect(text.trimEnd()).toMatch(/%%EOF$/)
  })

  it('should handle all date ranges', async () => {
    for (const range of ['7d', '30d', '90d'] as const) {
      const pdf = await generateAnalyticsPdf({
        deploymentId: 'dep-range',
        deploymentSlug: 'range-test',
        dateRange: range,
      })

      expect(pdf.length).toBeGreaterThan(0)
    }
  })
})
