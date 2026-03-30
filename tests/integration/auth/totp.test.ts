// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'

// ---------------------------------------------------------------------------
// Tests: TOTP secret generation
// ---------------------------------------------------------------------------

describe('generateTotpSecret', () => {
  it('returns a secret, QR URL, and backup codes', async () => {
    const { generateTotpSecret } = await import('@/lib/auth/totp')

    const result = generateTotpSecret('user-123')

    expect(result.secret).toBeTruthy()
    expect(result.secret.length).toBeGreaterThan(0)
    expect(result.qrCodeUrl).toContain('otpauth://totp/')
    expect(result.qrCodeUrl).toContain('secret=')
    expect(result.qrCodeUrl).toContain('DropSites')
    expect(result.backupCodes).toHaveLength(10)
  })

  it('generates unique secrets on each call', async () => {
    const { generateTotpSecret } = await import('@/lib/auth/totp')

    const a = generateTotpSecret('user-1')
    const b = generateTotpSecret('user-1')

    expect(a.secret).not.toBe(b.secret)
  })

  it('generates unique backup codes', async () => {
    const { generateTotpSecret } = await import('@/lib/auth/totp')

    const result = generateTotpSecret('user-1')
    const uniqueCodes = new Set(result.backupCodes)

    expect(uniqueCodes.size).toBe(result.backupCodes.length)
  })

  it('backup codes are 8 characters long (hex)', async () => {
    const { generateTotpSecret } = await import('@/lib/auth/totp')

    const result = generateTotpSecret('user-1')
    for (const code of result.backupCodes) {
      expect(code).toMatch(/^[0-9a-f]{8}$/)
    }
  })
})

// ---------------------------------------------------------------------------
// Tests: TOTP verification
// ---------------------------------------------------------------------------

describe('verifyTotp', () => {
  it('verifies a correct TOTP code', async () => {
    const { generateTotpSecret, generateTotpCode, base32Decode } = await import('@/lib/auth/totp')

    const { secret } = generateTotpSecret('user-1')
    const secretBuffer = base32Decode(secret)
    const code = generateTotpCode(secretBuffer, 0)

    const { verifyTotp } = await import('@/lib/auth/totp')
    expect(verifyTotp(secret, code)).toBe(true)
  })

  it('rejects an incorrect TOTP code', async () => {
    const { generateTotpSecret, verifyTotp } = await import('@/lib/auth/totp')

    const { secret } = generateTotpSecret('user-1')
    expect(verifyTotp(secret, '000000')).toBe(false)
  })

  it('accepts codes within +/- 1 time window', async () => {
    const { generateTotpSecret, generateTotpCode, base32Decode, verifyTotp } = await import('@/lib/auth/totp')

    const { secret } = generateTotpSecret('user-1')
    const secretBuffer = base32Decode(secret)

    // Code from previous window
    const prevCode = generateTotpCode(secretBuffer, -1)
    expect(verifyTotp(secret, prevCode)).toBe(true)

    // Code from next window
    const nextCode = generateTotpCode(secretBuffer, 1)
    expect(verifyTotp(secret, nextCode)).toBe(true)
  })

  it('rejects codes from distant time windows', async () => {
    const { generateTotpSecret, generateTotpCode, base32Decode, verifyTotp } = await import('@/lib/auth/totp')

    const { secret } = generateTotpSecret('user-1')
    const secretBuffer = base32Decode(secret)

    const distantCode = generateTotpCode(secretBuffer, 10)
    expect(verifyTotp(secret, distantCode)).toBe(false)
  })

  it('rejects empty or short codes', async () => {
    const { generateTotpSecret, verifyTotp } = await import('@/lib/auth/totp')

    const { secret } = generateTotpSecret('user-1')
    expect(verifyTotp(secret, '')).toBe(false)
    expect(verifyTotp(secret, '123')).toBe(false)
    expect(verifyTotp(secret, '1234567')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: Base32 encoding / decoding
// ---------------------------------------------------------------------------

describe('base32 encode/decode', () => {
  it('round-trips correctly', async () => {
    const { base32Encode, base32Decode } = await import('@/lib/auth/totp')

    const original = Buffer.from('Hello, TOTP!')
    const encoded = base32Encode(original)
    const decoded = base32Decode(encoded)

    expect(decoded.toString()).toBe(original.toString())
  })

  it('produces uppercase alphanumeric output', async () => {
    const { base32Encode } = await import('@/lib/auth/totp')

    const encoded = base32Encode(Buffer.from('test'))
    expect(encoded).toMatch(/^[A-Z2-7]+$/)
  })
})

// ---------------------------------------------------------------------------
// Tests: Backup code verification
// ---------------------------------------------------------------------------

describe('verifyBackupCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true and removes a valid backup code', async () => {
    const crypto = await import('crypto')
    const codeHash = crypto.createHash('sha256').update('abcd1234').digest('hex')

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        notification_prefs: {
          backup_codes: [codeHash, 'other-hash'],
        },
      },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: mockSelect, update: mockUpdate }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const { verifyBackupCode } = await import('@/lib/auth/totp')
    const result = await verifyBackupCode('user-1', 'abcd1234')

    expect(result).toBe(true)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('returns false for an invalid backup code', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        notification_prefs: {
          backup_codes: ['some-hash'],
        },
      },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const { verifyBackupCode } = await import('@/lib/auth/totp')
    const result = await verifyBackupCode('user-1', 'wrong-code')

    expect(result).toBe(false)
  })

  it('returns false when user not found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const { verifyBackupCode } = await import('@/lib/auth/totp')
    const result = await verifyBackupCode('nonexistent', 'code')

    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Tests: hashBackupCodes
// ---------------------------------------------------------------------------

describe('hashBackupCodes', () => {
  it('produces SHA-256 hashes of backup codes', async () => {
    const { hashBackupCodes } = await import('@/lib/auth/totp')

    const codes = ['abcd1234', 'efgh5678']
    const hashed = hashBackupCodes(codes)

    expect(hashed).toHaveLength(2)
    // SHA-256 hex is 64 characters
    for (const h of hashed) {
      expect(h).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it('is deterministic', async () => {
    const { hashBackupCodes } = await import('@/lib/auth/totp')

    const a = hashBackupCodes(['test1234'])
    const b = hashBackupCodes(['test1234'])

    expect(a[0]).toBe(b[0])
  })
})
