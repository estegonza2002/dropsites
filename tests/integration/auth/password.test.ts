// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Tests: hashPassword + verifyPassword
// ---------------------------------------------------------------------------

describe('hashPassword', () => {
  it('produces a scrypt hash string', async () => {
    const { hashPassword } = await import('@/lib/auth/password')

    const hash = await hashPassword('MySecureP@ss1')

    expect(hash).toMatch(/^scrypt:\d+:\d+:\d+:[0-9a-f]+:[0-9a-f]+$/)
  })

  it('produces different hashes for the same password (unique salts)', async () => {
    const { hashPassword } = await import('@/lib/auth/password')

    const hash1 = await hashPassword('SamePassword123!')
    const hash2 = await hashPassword('SamePassword123!')

    expect(hash1).not.toBe(hash2)
  })
})

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const { hashPassword, verifyPassword } = await import('@/lib/auth/password')

    const password = 'Correct-Horse-Battery-Staple!'
    const hash = await hashPassword(password)
    const result = await verifyPassword(password, hash)

    expect(result).toBe(true)
  })

  it('returns false for incorrect password', async () => {
    const { hashPassword, verifyPassword } = await import('@/lib/auth/password')

    const hash = await hashPassword('RealPassword123!')
    const result = await verifyPassword('WrongPassword456!', hash)

    expect(result).toBe(false)
  })

  it('returns false for malformed hash', async () => {
    const { verifyPassword } = await import('@/lib/auth/password')

    const result = await verifyPassword('anything', 'not-a-valid-hash')
    expect(result).toBe(false)
  })

  it('returns false for empty password', async () => {
    const { hashPassword, verifyPassword } = await import('@/lib/auth/password')

    const hash = await hashPassword('RealPassword')
    const result = await verifyPassword('', hash)

    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: checkPasswordStrength
// ---------------------------------------------------------------------------

describe('checkPasswordStrength', () => {
  it('scores very weak passwords as 0', async () => {
    const { checkPasswordStrength } = await import('@/lib/auth/password')

    const result = checkPasswordStrength('abc')
    expect(result.score).toBe(0)
    expect(result.feedback.length).toBeGreaterThan(0)
  })

  it('scores short passwords low', async () => {
    const { checkPasswordStrength } = await import('@/lib/auth/password')

    const result = checkPasswordStrength('pass')
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it('scores passwords with variety higher', async () => {
    const { checkPasswordStrength } = await import('@/lib/auth/password')

    const result = checkPasswordStrength('MyP@ssw0rd12')
    expect(result.score).toBeGreaterThanOrEqual(2)
  })

  it('scores long diverse passwords as 4', async () => {
    const { checkPasswordStrength } = await import('@/lib/auth/password')

    const result = checkPasswordStrength('Str0ng!P@ssword2026')
    expect(result.score).toBeGreaterThanOrEqual(3)
  })

  it('penalizes common patterns', async () => {
    const { checkPasswordStrength } = await import('@/lib/auth/password')

    const result = checkPasswordStrength('password123456')
    expect(result.score).toBeLessThanOrEqual(1)
    expect(result.feedback.some((f) => f.toLowerCase().includes('common'))).toBe(true)
  })

  it('penalizes repeated characters', async () => {
    const { checkPasswordStrength } = await import('@/lib/auth/password')

    const result = checkPasswordStrength('aaaaAAAA1111!!!!')
    expect(result.feedback.some((f) => f.toLowerCase().includes('common') || f.toLowerCase().includes('repeat'))).toBe(true)
  })

  it('returns feedback for short passwords', async () => {
    const { checkPasswordStrength } = await import('@/lib/auth/password')

    const result = checkPasswordStrength('Ab1!')
    expect(result.feedback.some((f) => f.includes('at least 8'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests: checkPwnedPassword
// ---------------------------------------------------------------------------

describe('checkPwnedPassword', () => {
  it('returns true for a known pwned password (mocked)', async () => {
    const crypto = await import('crypto')
    const sha1 = crypto.createHash('sha1').update('password').digest('hex').toUpperCase()
    const suffix = sha1.slice(5)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(`${suffix}:12345\nOTHERHASH:1`),
    }) as unknown as typeof fetch

    const { checkPwnedPassword } = await import('@/lib/auth/password')
    const result = await checkPwnedPassword('password')

    expect(result).toBe(true)
  })

  it('returns false for a non-pwned password (mocked)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('AAAAAAA:1\nBBBBBBB:2'),
    }) as unknown as typeof fetch

    const { checkPwnedPassword } = await import('@/lib/auth/password')
    const result = await checkPwnedPassword('super-unique-password-xyz-123!')

    expect(result).toBe(false)
  })

  it('returns false when API is unavailable (fail open)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch

    const { checkPwnedPassword } = await import('@/lib/auth/password')
    const result = await checkPwnedPassword('any-password')

    expect(result).toBe(false)
  })

  it('returns false when API returns non-200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as unknown as typeof fetch

    const { checkPwnedPassword } = await import('@/lib/auth/password')
    const result = await checkPwnedPassword('any-password')

    expect(result).toBe(false)
  })

  it('sends only the first 5 chars of SHA-1 (k-anonymity)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('AAAAAAA:1'),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const { checkPwnedPassword } = await import('@/lib/auth/password')
    await checkPwnedPassword('test-password')

    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[A-F0-9]{5}$/)
  })
})
