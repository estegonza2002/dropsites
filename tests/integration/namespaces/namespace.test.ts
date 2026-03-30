import { describe, it, expect } from 'vitest'
import { validateNamespace } from '@/lib/namespaces/validate'
import { isNamespacePrefix, extractNamespace } from '@/lib/namespaces/resolve'

describe('Namespace validation', () => {
  it('should accept a valid namespace', () => {
    const result = validateNamespace('my-team')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should accept a namespace with numbers', () => {
    const result = validateNamespace('team42')
    expect(result.valid).toBe(true)
  })

  it('should reject a namespace shorter than 3 characters', () => {
    const result = validateNamespace('ab')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('at least 3')
  })

  it('should reject a namespace longer than 32 characters', () => {
    const result = validateNamespace('a'.repeat(33))
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('at most 32')
  })

  it('should reject uppercase characters', () => {
    const result = validateNamespace('MyTeam')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('lowercase')
  })

  it('should reject starting with a hyphen', () => {
    const result = validateNamespace('-team')
    expect(result.valid).toBe(false)
  })

  it('should reject ending with a hyphen', () => {
    const result = validateNamespace('team-')
    expect(result.valid).toBe(false)
  })

  it('should reject consecutive hyphens', () => {
    const result = validateNamespace('my--team')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('consecutive hyphens')
  })

  it('should reject reserved namespaces', () => {
    const reserved = ['api', 'admin', 'dashboard', 'login', 'www', 'dropsites']
    for (const ns of reserved) {
      const result = validateNamespace(ns)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('reserved')
    }
  })

  it('should accept a namespace not in the reserved list', () => {
    const result = validateNamespace('acme-corp')
    expect(result.valid).toBe(true)
  })
})

describe('Namespace URL parsing', () => {
  it('should detect a namespace prefix starting with ~', () => {
    expect(isNamespacePrefix('~acme')).toBe(true)
    expect(isNamespacePrefix('~my-team')).toBe(true)
  })

  it('should reject non-namespace segments', () => {
    expect(isNamespacePrefix('acme')).toBe(false)
    expect(isNamespacePrefix('~')).toBe(false)
    expect(isNamespacePrefix('')).toBe(false)
  })

  it('should extract the namespace from a ~prefixed segment', () => {
    expect(extractNamespace('~acme')).toBe('acme')
    expect(extractNamespace('~my-team')).toBe('my-team')
  })
})
