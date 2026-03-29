// @vitest-environment node
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'

// Mock supabase admin client before importing modules
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: mockSelect,
          update: mockUpdate,
        }
      }
      if (table === 'audit_log') {
        return { insert: mockInsert }
      }
      return { select: mockSelect }
    },
  }),
}))

// Mock email and sms modules
vi.mock('@/lib/notifications/email', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('@/lib/notifications/sms', () => ({
  sendSMS: vi.fn(),
}))

import { dispatch } from '@/lib/notifications/dispatcher'
import { sendEmail } from '@/lib/notifications/email'
import { sendSMS } from '@/lib/notifications/sms'
import { checkNotificationRate } from '@/lib/notifications/rate-limiter'
import { renderTemplate } from '@/lib/notifications/templates'
import { resolveChannelPrefs, type NotificationPrefs } from '@/lib/notifications/preferences'

describe('Notification Dispatcher', () => {
  const userId = 'user-123'
  const eventType = 'deployment.published'
  const eventData = { slug: 'my-site', url: 'https://dropsites.io/my-site' }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default: user found with email and phone
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({
      data: {
        email: 'user@example.com',
        phone_number: '+15551234567',
        notification_prefs: {},
      },
      error: null,
    })

    mockInsert.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    ;(sendEmail as Mock).mockResolvedValue({ success: true, id: 'email-1' })
    ;(sendSMS as Mock).mockResolvedValue({ success: true, sid: 'sms-1' })
  })

  it('sends email when channel is enabled', async () => {
    const result = await dispatch(userId, eventType, eventData)

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(result.email?.sent).toBe(true)
  })

  it('does not send SMS when default prefs disable it', async () => {
    const result = await dispatch(userId, eventType, eventData)

    // Default prefs: email=true, sms=false
    expect(sendSMS).not.toHaveBeenCalled()
    expect(result.sms).toBeUndefined()
  })

  it('returns empty result when user is not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })

    const result = await dispatch(userId, eventType, eventData)

    expect(result).toEqual({})
    expect(sendEmail).not.toHaveBeenCalled()
    expect(sendSMS).not.toHaveBeenCalled()
  })

  it('retries on send failure up to 3 times', async () => {
    ;(sendEmail as Mock)
      .mockResolvedValueOnce({ success: false, error: 'timeout' })
      .mockResolvedValueOnce({ success: false, error: 'timeout' })
      .mockResolvedValueOnce({ success: true, id: 'email-3' })

    const result = await dispatch(userId, eventType, eventData)

    expect(sendEmail).toHaveBeenCalledTimes(3)
    expect(result.email?.sent).toBe(true)
  })

  it('reports failure after all retries exhausted', async () => {
    ;(sendEmail as Mock).mockResolvedValue({
      success: false,
      error: 'service down',
    })

    const result = await dispatch(userId, eventType, eventData)

    expect(sendEmail).toHaveBeenCalledTimes(3)
    expect(result.email?.sent).toBe(false)
    expect(result.email?.error).toBe('service down')
  })
})

describe('renderTemplate', () => {
  it('returns subject, html, and text for any event type', () => {
    const result = renderTemplate('deployment.published', {
      slug: 'test',
    })

    expect(result.subject).toContain('Deployment Published')
    expect(result.html).toContain('Deployment Published')
    expect(result.text).toContain('Deployment Published')
    expect(result.text).toContain('"slug": "test"')
  })

  it('escapes HTML in data', () => {
    const result = renderTemplate('test.event', {
      html: '<script>alert("xss")</script>',
    })

    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })
})

describe('checkNotificationRate', () => {
  it('allows first SMS', () => {
    const result = checkNotificationRate('rate-test-user', 'sms')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9) // 10 max - 1
  })

  it('allows first email', () => {
    const result = checkNotificationRate('rate-test-email', 'email')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(49) // 50 max - 1
  })

  it('blocks SMS after 10 in the window', () => {
    const uid = 'rate-block-sms'
    for (let i = 0; i < 10; i++) {
      checkNotificationRate(uid, 'sms')
    }
    const result = checkNotificationRate(uid, 'sms')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})

describe('resolveChannelPrefs', () => {
  it('returns user prefs when set', () => {
    const prefs: NotificationPrefs = {
      'deployment.published': { email: false, sms: true },
    }
    const result = resolveChannelPrefs(prefs, 'deployment.published')
    expect(result).toEqual({ email: false, sms: true })
  })

  it('returns defaults for unknown event type', () => {
    const result = resolveChannelPrefs({}, 'unknown.event')
    expect(result).toEqual({ email: true, sms: false })
  })
})
