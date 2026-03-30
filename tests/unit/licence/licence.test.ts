// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// We need to set env vars before importing the modules
const TEST_SIGNING_KEY = 'test-secret-signing-key-for-licence-tests'

describe('Licence system', () => {
  beforeEach(() => {
    vi.stubEnv('LICENCE_SIGNING_KEY', TEST_SIGNING_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('generateLicenceKey', () => {
    it('generates a key with two base64url parts separated by a dot', async () => {
      const { generateLicenceKey } = await import('@/lib/licence/generate')

      const key = generateLicenceKey({
        customer: 'Acme Corp',
        expiresAt: new Date('2027-12-31T00:00:00Z'),
        deploymentLimit: 100,
        features: ['custom-domains', 'white-label'],
      })

      expect(key).toContain('.')
      const parts = key.split('.')
      expect(parts).toHaveLength(2)

      // Both parts should be valid base64url
      expect(() => Buffer.from(parts[0], 'base64url')).not.toThrow()
      expect(() => Buffer.from(parts[1], 'base64url')).not.toThrow()
    })

    it('throws without LICENCE_SIGNING_KEY', async () => {
      vi.stubEnv('LICENCE_SIGNING_KEY', '')
      // Re-import to pick up the env change
      const { generateLicenceKey } = await import('@/lib/licence/generate')

      expect(() =>
        generateLicenceKey({
          customer: 'Test',
          expiresAt: new Date('2027-01-01'),
          deploymentLimit: 10,
          features: [],
        }),
      ).toThrow('LICENCE_SIGNING_KEY')
    })
  })

  describe('validateLicenceKey', () => {
    it('validates a correctly generated key', async () => {
      const { generateLicenceKey } = await import('@/lib/licence/generate')
      const { validateLicenceKey } = await import('@/lib/licence/validate')

      const key = generateLicenceKey({
        customer: 'Acme Corp',
        expiresAt: new Date('2027-12-31T00:00:00Z'),
        deploymentLimit: 50,
        features: ['analytics', 'webhooks'],
      })

      const result = validateLicenceKey(key)

      expect(result.valid).toBe(true)
      expect(result.customer).toBe('Acme Corp')
      expect(result.deploymentLimit).toBe(50)
      expect(result.features).toEqual(['analytics', 'webhooks'])
      expect(result.expired).toBe(false)
      expect(result.expiresAt.toISOString()).toBe('2027-12-31T00:00:00.000Z')
    })

    it('returns expired with graceful degradation for expired key', async () => {
      const { generateLicenceKey } = await import('@/lib/licence/generate')
      const { validateLicenceKey } = await import('@/lib/licence/validate')

      const key = generateLicenceKey({
        customer: 'Expired Corp',
        expiresAt: new Date('2020-01-01T00:00:00Z'),
        deploymentLimit: 10,
        features: ['basic'],
      })

      const result = validateLicenceKey(key)

      // Key is still valid (signature checks out) but marked as expired
      expect(result.valid).toBe(true)
      expect(result.expired).toBe(true)
      expect(result.customer).toBe('Expired Corp')
      expect(result.features).toEqual(['basic'])
    })

    it('rejects a tampered key', async () => {
      const { generateLicenceKey } = await import('@/lib/licence/generate')
      const { validateLicenceKey } = await import('@/lib/licence/validate')

      const key = generateLicenceKey({
        customer: 'Good Corp',
        expiresAt: new Date('2027-12-31T00:00:00Z'),
        deploymentLimit: 100,
        features: [],
      })

      // Tamper with the payload (flip a character)
      const parts = key.split('.')
      const tamperedPayload =
        parts[0].slice(0, -1) +
        (parts[0].slice(-1) === 'A' ? 'B' : 'A')
      const tamperedKey = `${tamperedPayload}.${parts[1]}`

      const result = validateLicenceKey(tamperedKey)

      expect(result.valid).toBe(false)
      expect(result.customer).toBe('')
    })

    it('rejects a malformed key', async () => {
      const { validateLicenceKey } = await import('@/lib/licence/validate')

      const result = validateLicenceKey('not-a-valid-key')

      expect(result.valid).toBe(false)
    })

    it('rejects a key signed with a different secret', async () => {
      const { generateLicenceKey } = await import('@/lib/licence/generate')

      const key = generateLicenceKey({
        customer: 'Test',
        expiresAt: new Date('2027-12-31T00:00:00Z'),
        deploymentLimit: 10,
        features: [],
      })

      // Switch to a different signing key for validation
      vi.stubEnv('LICENCE_SIGNING_KEY', 'different-secret-key')
      const { validateLicenceKey } = await import('@/lib/licence/validate')

      const result = validateLicenceKey(key)

      expect(result.valid).toBe(false)
    })

    it('correctly parses feature flags', async () => {
      const { generateLicenceKey } = await import('@/lib/licence/generate')
      const { validateLicenceKey } = await import('@/lib/licence/validate')

      const features = ['custom-domains', 'white-label', 'sso', 'analytics', 'webhooks']

      const key = generateLicenceKey({
        customer: 'Full Corp',
        expiresAt: new Date('2027-06-15T00:00:00Z'),
        deploymentLimit: 500,
        features,
      })

      const result = validateLicenceKey(key)

      expect(result.valid).toBe(true)
      expect(result.features).toEqual(features)
      expect(result.features).toHaveLength(5)
    })
  })
})
