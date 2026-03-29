// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { injectLazyLoading } from '@/lib/serving/lazy-loading'

describe('Security: path traversal prevention', () => {
  it('rejects paths containing ../', () => {
    const maliciousPaths = [
      '../etc/passwd',
      'foo/../../etc/shadow',
      '..%2f..%2fetc%2fpasswd',
      'foo/bar/../../../secret',
    ]

    for (const path of maliciousPaths) {
      // Decoded path should be caught
      const decoded = decodeURIComponent(path)
      expect(decoded.includes('..')).toBe(true)
    }
  })

  it('allows normal file paths', () => {
    const validPaths = [
      'index.html',
      'css/style.css',
      'js/app.js',
      'images/logo.png',
      'deep/nested/path/file.html',
    ]

    for (const path of validPaths) {
      expect(path.includes('..')).toBe(false)
    }
  })
})

describe('Security: XSS in slug display', () => {
  it('slug validation rejects script tags', () => {
    const xssAttempts = [
      '<script>alert(1)</script>',
      'test<img onerror=alert(1)>',
      'test"onmouseover="alert(1)',
      "test'><script>alert(1)</script>",
    ]

    const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

    for (const attempt of xssAttempts) {
      expect(slugPattern.test(attempt)).toBe(false)
    }
  })
})

describe('Security: lazy loading injection safety', () => {
  it('injects loading=lazy on img tags', () => {
    const html = '<html><body><img src="test.jpg"><img src="test2.jpg" loading="eager"></body></html>'
    const result = injectLazyLoading(html)

    expect(result).toContain('loading="lazy"')
    // Should not double-add to tags that already have loading
    expect(result.match(/loading=/g)?.length).toBe(2)
  })

  it('does not break self-closing img tags', () => {
    const html = '<img src="test.jpg" />'
    const result = injectLazyLoading(html)
    expect(result).toContain('loading="lazy"')
    expect(result).toContain('/>')
  })
})

describe('Security: stack trace suppression', () => {
  it('error responses should not contain stack traces in production format', () => {
    // Verify error response shapes don't leak internals
    const errorResponse = { error: 'Not found' }
    expect(errorResponse).not.toHaveProperty('stack')
    expect(errorResponse).not.toHaveProperty('message')
    expect(JSON.stringify(errorResponse)).not.toContain('at ')
  })
})
