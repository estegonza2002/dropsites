// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/slug/generate'

const SLUG_PATTERN = /^[a-z]+-[a-z]+-[0-9]+$/

describe('generateSlug', () => {
  it('generates a slug matching {adjective}-{noun}-{number} pattern', () => {
    const slug = generateSlug()
    expect(slug).toMatch(SLUG_PATTERN)
  })

  it('generates URL-safe output (lowercase, hyphens only)', () => {
    for (let i = 0; i < 100; i++) {
      const slug = generateSlug()
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('number part is two digits (10-99)', () => {
    for (let i = 0; i < 100; i++) {
      const slug = generateSlug()
      const num = parseInt(slug.split('-').at(-1)!, 10)
      expect(num).toBeGreaterThanOrEqual(10)
      expect(num).toBeLessThanOrEqual(99)
    }
  })

  it('produces reasonable variety over 1000 generations (no single value >5%)', () => {
    const counts = new Map<string, number>()
    for (let i = 0; i < 1000; i++) {
      const slug = generateSlug()
      counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(50) // max 5% of 1000
    }
  })

  it('all 1000 generated slugs match the pattern', () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateSlug()).toMatch(SLUG_PATTERN)
    }
  })
})
