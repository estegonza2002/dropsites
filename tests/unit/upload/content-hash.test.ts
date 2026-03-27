// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeHash } from '@/lib/upload/content-hash'

describe('computeHash', () => {
  it('returns a 64-character hex string', () => {
    const hash = computeHash(Buffer.from('hello'))
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })

  it('returns the correct SHA-256 for known input', () => {
    // echo -n "hello" | sha256sum => 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const hash = computeHash(Buffer.from('hello'))
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('returns different hashes for different inputs', () => {
    const h1 = computeHash(Buffer.from('hello'))
    const h2 = computeHash(Buffer.from('world'))
    expect(h1).not.toBe(h2)
  })

  it('returns the same hash for the same input', () => {
    const buf = Buffer.from('deterministic')
    expect(computeHash(buf)).toBe(computeHash(buf))
  })

  it('handles empty buffer', () => {
    const hash = computeHash(Buffer.from(''))
    // SHA-256 of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('handles binary data', () => {
    const buf = Buffer.from([0x00, 0xff, 0xab, 0xcd])
    const hash = computeHash(buf)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]+$/)
  })
})
