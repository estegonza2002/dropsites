// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Test: Path traversal prevention in ZIP extraction
// ---------------------------------------------------------------------------

vi.mock('jszip', () => {
  return {
    default: {
      loadAsync: vi.fn(),
    },
  }
})

import JSZip from 'jszip'
import { extractZip } from '@/lib/upload/zip'

describe('Path traversal prevention — ZIP extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects paths containing ..', async () => {
    const mockZip = {
      files: {
        '../etc/passwd': {
          dir: false,
          async: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
          unixPermissions: null,
        },
      },
    }
    vi.mocked(JSZip.loadAsync).mockResolvedValue(mockZip as never)

    await expect(extractZip(Buffer.from('fake'))).rejects.toThrow(
      'Path traversal is not allowed',
    )
  })

  it('rejects paths with .. in nested segments', async () => {
    const mockZip = {
      files: {
        'foo/../../etc/passwd': {
          dir: false,
          async: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
          unixPermissions: null,
        },
      },
    }
    vi.mocked(JSZip.loadAsync).mockResolvedValue(mockZip as never)

    await expect(extractZip(Buffer.from('fake'))).rejects.toThrow(
      'Path traversal is not allowed',
    )
  })

  it('rejects absolute paths', async () => {
    const mockZip = {
      files: {
        '/etc/passwd': {
          dir: false,
          async: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
          unixPermissions: null,
        },
      },
    }
    vi.mocked(JSZip.loadAsync).mockResolvedValue(mockZip as never)

    await expect(extractZip(Buffer.from('fake'))).rejects.toThrow(
      'Absolute paths are not allowed',
    )
  })

  it('accepts safe paths', async () => {
    const content = new ArrayBuffer(5)
    const mockZip = {
      files: {
        'index.html': {
          dir: false,
          async: vi.fn().mockResolvedValue(content),
          unixPermissions: null,
        },
        'css/style.css': {
          dir: false,
          async: vi.fn().mockResolvedValue(content),
          unixPermissions: null,
        },
        'assets/': {
          dir: true,
        },
      },
    }
    vi.mocked(JSZip.loadAsync).mockResolvedValue(mockZip as never)

    const files = await extractZip(Buffer.from('fake'))
    expect(files).toHaveLength(2)
    expect(files[0].path).toBe('index.html')
    expect(files[1].path).toBe('css/style.css')
  })
})

// ---------------------------------------------------------------------------
// Test: XSS in slugs
// ---------------------------------------------------------------------------

describe('XSS in slugs', () => {
  it('rejects slugs with HTML characters', async () => {
    const { validateSlug } = await import('@/lib/slug/validate')

    const xssSlugs = [
      '<script>alert(1)</script>',
      'test"><img src=x onerror=alert(1)>',
      "test'><script>alert(1)</script>",
      'javascript:alert(1)',
      '../traversal',
      'test%00null',
    ]

    for (const slug of xssSlugs) {
      const result = validateSlug(slug)
      expect(result.valid, `Slug "${slug}" should be rejected`).toBe(false)
    }
  })

  it('accepts valid slugs', async () => {
    const { validateSlug } = await import('@/lib/slug/validate')

    const validSlugs = [
      'my-site',
      'test-123',
      'hello-world',
      'a1b2c3',
    ]

    for (const slug of validSlugs) {
      const result = validateSlug(slug)
      expect(result.valid, `Slug "${slug}" should be accepted`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Test: Stack trace suppression
// ---------------------------------------------------------------------------

describe('Stack trace suppression', () => {
  it('serve route returns generic error without stack trace', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')

    const serveRoute = readFileSync(
      resolve(process.cwd(), 'app/_serve/route.ts'),
      'utf-8',
    )

    // The catch block should NOT include error details in the response
    expect(serveRoute).toContain('} catch {')
    expect(serveRoute).toContain("return new NextResponse('Not Found', { status: 404 })")

    // Should not contain any pattern that passes error messages to the client
    expect(serveRoute).not.toMatch(/new NextResponse\(.*error.*message/i)
    expect(serveRoute).not.toMatch(/new NextResponse\(.*err\./i)
  })
})

// ---------------------------------------------------------------------------
// Test: Security headers
// ---------------------------------------------------------------------------

describe('Security headers', () => {
  it('getServingHeaders includes security headers for served content', async () => {
    const { getServingHeaders } = await import('@/lib/serving/headers')

    const deployment = {
      allow_indexing: false,
    } as Parameters<typeof getServingHeaders>[0]

    const file = {
      file_path: 'index.html',
      mime_type: 'text/html',
      sha256_hash: 'abc123',
    } as Parameters<typeof getServingHeaders>[1]

    const headers = getServingHeaders(deployment, file)

    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('SAMEORIGIN')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Permissions-Policy']).toContain('camera=()')
    expect(headers['Content-Security-Policy']).toBeDefined()
    expect(headers['Content-Security-Policy']).toContain('base-uri')
  })

  it('getDashboardSecurityHeaders returns strict CSP', async () => {
    const { getDashboardSecurityHeaders } = await import('@/lib/serving/headers')

    const headers = getDashboardSecurityHeaders()

    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'")
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })

  it('HTML files get no-cache headers', async () => {
    const { getServingHeaders } = await import('@/lib/serving/headers')

    const deployment = { allow_indexing: true } as Parameters<typeof getServingHeaders>[0]
    const file = {
      file_path: 'index.html',
      mime_type: 'text/html',
      sha256_hash: 'abc123',
    } as Parameters<typeof getServingHeaders>[1]

    const headers = getServingHeaders(deployment, file)
    expect(headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate')
  })

  it('Non-HTML assets get immutable cache headers', async () => {
    const { getServingHeaders } = await import('@/lib/serving/headers')

    const deployment = { allow_indexing: true } as Parameters<typeof getServingHeaders>[0]
    const file = {
      file_path: 'style.css',
      mime_type: 'text/css',
      sha256_hash: 'abc123',
    } as Parameters<typeof getServingHeaders>[1]

    const headers = getServingHeaders(deployment, file)
    expect(headers['Cache-Control']).toBe('public, max-age=31536000, immutable')
  })
})

// ---------------------------------------------------------------------------
// Test: Lazy loading injection
// ---------------------------------------------------------------------------

describe('Lazy loading injection', () => {
  it('injects loading="lazy" on img tags without loading attribute', async () => {
    const { injectLazyLoading } = await import('@/lib/serving/lazy-loading')

    const html = '<html><body><img src="photo.jpg"></body></html>'
    const result = injectLazyLoading(html)

    expect(result).toContain('loading="lazy"')
    expect(result).toContain('decoding="async"')
  })

  it('does not override existing loading attribute', async () => {
    const { injectLazyLoading } = await import('@/lib/serving/lazy-loading')

    const html = '<img src="hero.jpg" loading="eager">'
    const result = injectLazyLoading(html)

    expect(result).not.toContain('loading="lazy"')
    expect(result).toContain('loading="eager"')
  })

  it('does not override existing decoding attribute', async () => {
    const { injectLazyLoading } = await import('@/lib/serving/lazy-loading')

    const html = '<img src="hero.jpg" decoding="sync">'
    const result = injectLazyLoading(html)

    expect(result).toContain('decoding="sync"')
    expect(result).toContain('loading="lazy"')
    expect(result).not.toContain('decoding="async"')
  })

  it('handles multiple img tags', async () => {
    const { injectLazyLoading } = await import('@/lib/serving/lazy-loading')

    const html = '<img src="a.jpg"><img src="b.jpg" loading="eager"><img src="c.jpg">'
    const result = injectLazyLoading(html)

    const lazyMatches = result.match(/loading="lazy"/g)
    expect(lazyMatches).toHaveLength(2)
  })

  it('does not break self-closing img tags', async () => {
    const { injectLazyLoading } = await import('@/lib/serving/lazy-loading')

    const html = '<img src="test.jpg" />'
    const result = injectLazyLoading(html)
    expect(result).toContain('loading="lazy"')
  })
})

// ---------------------------------------------------------------------------
// Test: Slug redirect resolution
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'

describe('Slug redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns new slug when redirect exists', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { new_slug: 'new-site' },
      error: null,
    })
    const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockGte = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockEq = vi.fn().mockReturnValue({ gte: mockGte })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as never)

    const { resolveSlugRedirect } = await import('@/lib/serving/redirect')
    const result = await resolveSlugRedirect('old-site')

    expect(result).toEqual({ newSlug: 'new-site' })
  })

  it('returns null when no redirect exists', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    })
    const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockGte = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockEq = vi.fn().mockReturnValue({ gte: mockGte })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as never)

    const { resolveSlugRedirect } = await import('@/lib/serving/redirect')
    const result = await resolveSlugRedirect('nonexistent')

    expect(result).toBeNull()
  })
})
