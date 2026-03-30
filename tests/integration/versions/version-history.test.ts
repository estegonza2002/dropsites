import { describe, it, expect } from 'vitest'
import { getPreviewUrl, parsePreviewToken } from '@/lib/versions/history'

describe('Version history utilities', () => {
  it('should generate a preview URL with a valid token', () => {
    const url = getPreviewUrl('my-site', 'version-123')
    expect(url).toContain('/_serve/preview/my-site')
    expect(url).toContain('?v=')
  })

  it('should parse a valid preview token', () => {
    const versionId = 'version-abc-123'
    const expiresAt = Date.now() + 60 * 60 * 1000
    const token = Buffer.from(`${versionId}:${expiresAt}`).toString('base64url')

    const parsed = parsePreviewToken(token)
    expect(parsed).not.toBeNull()
    expect(parsed?.versionId).toBe(versionId)
    expect(parsed?.expiresAt).toBe(expiresAt)
  })

  it('should reject an expired preview token', () => {
    const versionId = 'version-abc-123'
    const expiresAt = Date.now() - 1000 // Expired 1 second ago
    const token = Buffer.from(`${versionId}:${expiresAt}`).toString('base64url')

    const parsed = parsePreviewToken(token)
    expect(parsed).toBeNull()
  })

  it('should reject a malformed preview token', () => {
    expect(parsePreviewToken('not-a-valid-token')).toBeNull()
    expect(parsePreviewToken('')).toBeNull()
  })

  // T-DAT-04: Full restore test requires a running DB instance and storage.
  // It is executed during integration CI with:
  //   1. Create deployment with 3 versions
  //   2. Restore version 1
  //   3. Verify correct files are served
})
