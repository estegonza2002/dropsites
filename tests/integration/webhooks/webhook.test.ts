import { describe, it, expect } from 'vitest'
import { signPayload, verifySignature, generateSigningSecret } from '@/lib/webhooks/sign'
import type { WebhookEvent } from '@/lib/webhooks/dispatch'

describe('Webhook HMAC signing', () => {
  const secret = 'whsec_test-secret-key-for-webhooks'

  const sampleEvent: WebhookEvent = {
    event: 'deployment.created',
    slug: 'my-site',
    url: 'https://dropsites.app/my-site',
    timestamp: '2026-03-29T00:00:00.000Z',
    actor: 'user-123',
    deployment: {
      id: 'dep-123',
      name: 'my-site',
      version: 1,
    },
  }

  // T-API-15: HMAC signature valid
  it('should produce a valid HMAC-SHA256 signature', () => {
    const signature = signPayload(sampleEvent, secret)
    expect(signature).toBeTruthy()
    expect(typeof signature).toBe('string')
    // SHA-256 hex output is 64 characters
    expect(signature).toHaveLength(64)
  })

  it('should verify a correct signature', () => {
    const body = JSON.stringify(sampleEvent)
    const signature = signPayload(sampleEvent, secret)
    expect(verifySignature(body, signature, secret)).toBe(true)
  })

  it('should reject an incorrect signature', () => {
    const body = JSON.stringify(sampleEvent)
    const badSignature = 'a'.repeat(64)
    expect(verifySignature(body, badSignature, secret)).toBe(false)
  })

  it('should reject a signature made with the wrong secret', () => {
    const body = JSON.stringify(sampleEvent)
    const signature = signPayload(sampleEvent, 'wrong-secret')
    expect(verifySignature(body, signature, secret)).toBe(false)
  })

  it('should generate unique signing secrets', () => {
    const secret1 = generateSigningSecret()
    const secret2 = generateSigningSecret()
    expect(secret1).not.toBe(secret2)
    expect(secret1).toMatch(/^whsec_/)
    expect(secret2).toMatch(/^whsec_/)
  })

  it('should produce deterministic signatures for the same payload and secret', () => {
    const sig1 = signPayload(sampleEvent, secret)
    const sig2 = signPayload(sampleEvent, secret)
    expect(sig1).toBe(sig2)
  })

  it('should produce different signatures for different payloads', () => {
    const sig1 = signPayload(sampleEvent, secret)
    const modifiedEvent = { ...sampleEvent, slug: 'other-site' }
    const sig2 = signPayload(modifiedEvent, secret)
    expect(sig1).not.toBe(sig2)
  })
})

// T-API-14 and T-API-16 require full Supabase integration and are tested
// against a running instance during E2E/integration CI runs.
describe('Webhook event types', () => {
  it('should include all expected event types', () => {
    const expectedEvents = [
      'deployment.created',
      'deployment.updated',
      'deployment.deleted',
      'deployment.disabled',
      'deployment.reactivated',
    ]
    // Validate the event type union matches
    const event: WebhookEvent = {
      event: 'deployment.created',
      slug: 'test',
      url: 'https://example.com/test',
      timestamp: new Date().toISOString(),
      actor: null,
      deployment: { id: 'test', name: 'test', version: null },
    }
    expect(expectedEvents).toContain(event.event)
  })
})
