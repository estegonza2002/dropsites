// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validateSlug } from '@/lib/slug/validate'
import { RESERVED_SLUGS } from '@/lib/config/constants'

describe('validateSlug', () => {
  describe('valid slugs', () => {
    it('accepts a simple valid slug', () => {
      expect(validateSlug('my-site')).toMatchObject({ valid: true, errors: [] })
    })

    it('accepts alphanumeric slug', () => {
      expect(validateSlug('abc123')).toMatchObject({ valid: true, errors: [] })
    })

    it('accepts slug at minimum length (3 chars)', () => {
      expect(validateSlug('abc')).toMatchObject({ valid: true, errors: [] })
    })

    it('accepts slug at maximum length (64 chars)', () => {
      const slug = 'a'.repeat(32) + '-' + 'b'.repeat(31)
      expect(slug).toHaveLength(64)
      expect(validateSlug(slug)).toMatchObject({ valid: true, errors: [] })
    })

    it('accepts slug with numbers', () => {
      expect(validateSlug('site-42')).toMatchObject({ valid: true, errors: [] })
    })
  })

  describe('length validation', () => {
    it('rejects slug shorter than 3 chars', () => {
      const result = validateSlug('ab')
      expect(result.valid).toBe(false)
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/at least/)]))
    })

    it('rejects single character slug', () => {
      const result = validateSlug('a')
      expect(result.valid).toBe(false)
    })

    it('rejects empty slug', () => {
      const result = validateSlug('')
      expect(result.valid).toBe(false)
    })

    it('rejects slug longer than 64 chars', () => {
      const result = validateSlug('a'.repeat(65))
      expect(result.valid).toBe(false)
      expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/at most/)]))
    })
  })

  describe('character validation', () => {
    it('rejects uppercase letters', () => {
      expect(validateSlug('MySlug').valid).toBe(false)
    })

    it('rejects spaces', () => {
      expect(validateSlug('my slug').valid).toBe(false)
    })

    it('rejects underscores', () => {
      expect(validateSlug('my_slug').valid).toBe(false)
    })

    it('rejects dots', () => {
      expect(validateSlug('my.slug').valid).toBe(false)
    })

    it('rejects special characters', () => {
      expect(validateSlug('my@slug').valid).toBe(false)
      expect(validateSlug('my/slug').valid).toBe(false)
      expect(validateSlug('my#slug').valid).toBe(false)
    })
  })

  describe('hyphen rules', () => {
    it('rejects slug starting with hyphen', () => {
      expect(validateSlug('-myslug').valid).toBe(false)
    })

    it('rejects slug ending with hyphen', () => {
      expect(validateSlug('myslug-').valid).toBe(false)
    })

    it('rejects consecutive hyphens', () => {
      expect(validateSlug('my--slug').valid).toBe(false)
    })
  })

  describe('reserved words', () => {
    it('rejects all reserved slugs', () => {
      for (const reserved of RESERVED_SLUGS) {
        const result = validateSlug(reserved)
        expect(result.valid).toBe(false)
        expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/reserved/)]))
      }
    })

    it('rejects reserved slugs regardless of case input', () => {
      // validateSlug checks lowercase; reserved check lowercases input
      expect(validateSlug('admin').valid).toBe(false)
      expect(validateSlug('API').valid).toBe(false) // also fails char check
    })
  })
})
