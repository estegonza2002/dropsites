// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — set up before importing modules under test
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    deletePrefix: vi.fn(),
    exists: vi.fn(),
    list: vi.fn(),
  },
}))

vi.mock('@/lib/abuse/virustotal', () => ({
  scanFile: vi.fn(),
  scanUrl: vi.fn(),
}))

vi.mock('@/lib/abuse/safe-browsing', () => ({
  checkUrl: vi.fn(),
  checkUrls: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { storage } from '@/lib/storage'
import { scanFile as vtScanFile } from '@/lib/abuse/virustotal'
import { checkUrls } from '@/lib/abuse/safe-browsing'
import { scanDeployment } from '@/lib/abuse/scanner'
import { extractUrls, extractUrlsFromJs } from '@/lib/abuse/url-extractor'
import { Readable } from 'stream'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockSupabase() {
  const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  const mockInsert = vi.fn().mockResolvedValue({ error: null })

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'deployment_files') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                sha256_hash: 'abc123',
                file_path: 'index.html',
                mime_type: 'text/html',
                storage_key: 'deployments/test-deploy/index.html',
              },
              {
                sha256_hash: 'def456',
                file_path: 'app.js',
                mime_type: 'application/javascript',
                storage_key: 'deployments/test-deploy/app.js',
              },
            ],
            error: null,
          }),
        }),
      }
    }
    if (table === 'deployments') {
      return {
        update: mockUpdate,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { owner_id: 'user-1' },
              error: null,
            }),
          }),
        }),
      }
    }
    if (table === 'audit_log') {
      return { insert: mockInsert }
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      update: mockUpdate,
      insert: mockInsert,
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }
  })

  return { from: mockFrom, _mockUpdate: mockUpdate, _mockInsert: mockInsert }
}

function stringToReadable(str: string): Readable {
  const readable = new Readable()
  readable.push(str)
  readable.push(null)
  return readable
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('scanDeployment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns clean result when no threats detected', async () => {
    const mockSupabase = createMockSupabase()
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never)

    vi.mocked(vtScanFile).mockResolvedValue({
      target: 'abc123',
      isMalicious: false,
      positives: 0,
      total: 60,
      permalink: null,
    })

    vi.mocked(storage.get).mockResolvedValue({
      body: stringToReadable('<html><body>Hello</body></html>'),
      contentType: 'text/html',
      contentLength: 30,
    })

    vi.mocked(checkUrls).mockResolvedValue([])

    const result = await scanDeployment('deploy-1')

    expect(result.deploymentId).toBe('deploy-1')
    expect(result.quarantined).toBe(false)
    expect(result.virusTotalFlags).toHaveLength(0)
    expect(result.safeBrowsingFlags).toHaveLength(0)
    expect(result.fileHashes).toBe(2)
  })

  it('quarantines deployment when VirusTotal flags a file', async () => {
    const mockSupabase = createMockSupabase()
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never)

    vi.mocked(vtScanFile).mockImplementation(async (hash: string) => ({
      target: hash,
      isMalicious: hash === 'abc123',
      positives: hash === 'abc123' ? 5 : 0,
      total: 60,
      permalink: null,
    }))

    vi.mocked(storage.get).mockResolvedValue({
      body: stringToReadable('<html><body>Malware site</body></html>'),
      contentType: 'text/html',
      contentLength: 38,
    })

    vi.mocked(checkUrls).mockResolvedValue([])

    const result = await scanDeployment('deploy-malware')

    expect(result.quarantined).toBe(true)
    expect(result.virusTotalFlags).toHaveLength(1)
    expect(result.virusTotalFlags[0].target).toBe('abc123')
  })

  it('quarantines deployment when Safe Browsing flags URLs', async () => {
    const mockSupabase = createMockSupabase()
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never)

    vi.mocked(vtScanFile).mockResolvedValue({
      target: 'abc123',
      isMalicious: false,
      positives: 0,
      total: 60,
      permalink: null,
    })

    const htmlContent =
      '<html><body><a href="https://malicious.example.com/phish">Click</a></body></html>'
    vi.mocked(storage.get).mockResolvedValue({
      body: stringToReadable(htmlContent),
      contentType: 'text/html',
      contentLength: htmlContent.length,
    })

    vi.mocked(checkUrls).mockResolvedValue([
      {
        url: 'https://malicious.example.com/phish',
        isThreat: true,
        threatTypes: ['SOCIAL_ENGINEERING'],
      },
    ])

    const result = await scanDeployment('deploy-phish')

    expect(result.quarantined).toBe(true)
    expect(result.safeBrowsingFlags).toHaveLength(1)
    expect(result.safeBrowsingFlags[0].threatTypes).toContain(
      'SOCIAL_ENGINEERING',
    )
  })

  it('handles empty deployment (no files) gracefully', async () => {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'deployment_files') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }
      }
      return {
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const result = await scanDeployment('deploy-empty')

    expect(result.fileHashes).toBe(0)
    expect(result.quarantined).toBe(false)
    expect(vtScanFile).not.toHaveBeenCalled()
    expect(checkUrls).not.toHaveBeenCalled()
  })

  it('continues scanning when storage.get fails for a file', async () => {
    const mockSupabase = createMockSupabase()
    vi.mocked(createAdminClient).mockReturnValue(mockSupabase as never)

    vi.mocked(vtScanFile).mockResolvedValue({
      target: 'abc123',
      isMalicious: false,
      positives: 0,
      total: 60,
      permalink: null,
    })

    // First call fails, second succeeds
    vi.mocked(storage.get)
      .mockRejectedValueOnce(new Error('File not found'))
      .mockResolvedValueOnce({
        body: stringToReadable('const x = "https://safe.example.com"'),
        contentType: 'application/javascript',
        contentLength: 36,
      })

    vi.mocked(checkUrls).mockResolvedValue([])

    const result = await scanDeployment('deploy-partial')

    expect(result.error).toBeUndefined()
    expect(result.quarantined).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// URL extractor tests
// ---------------------------------------------------------------------------

describe('extractUrls', () => {
  it('extracts href URLs from anchor tags', () => {
    const html = '<a href="https://example.com/page">Link</a>'
    const urls = extractUrls(html)
    expect(urls).toContain('https://example.com/page')
  })

  it('extracts src URLs from script tags', () => {
    const html = '<script src="https://cdn.example.com/app.js"></script>'
    const urls = extractUrls(html)
    expect(urls).toContain('https://cdn.example.com/app.js')
  })

  it('extracts URLs from meta refresh tags', () => {
    const html =
      '<meta http-equiv="refresh" content="0;url=https://redirect.example.com">'
    const urls = extractUrls(html)
    expect(urls).toContain('https://redirect.example.com')
  })

  it('ignores relative URLs', () => {
    const html = '<a href="/relative/path">Link</a><img src="image.png">'
    const urls = extractUrls(html)
    expect(urls).toHaveLength(0)
  })

  it('deduplicates URLs', () => {
    const html = `
      <a href="https://example.com">Link 1</a>
      <a href="https://example.com">Link 2</a>
    `
    const urls = extractUrls(html)
    expect(urls.filter((u) => u === 'https://example.com')).toHaveLength(1)
  })

  it('extracts window.location assignments', () => {
    const html = `
      <script>window.location.href = "https://phish.example.com/login"</script>
    `
    const urls = extractUrls(html)
    expect(urls).toContain('https://phish.example.com/login')
  })
})

describe('extractUrlsFromJs', () => {
  it('extracts URLs from double-quoted strings', () => {
    const js = 'const url = "https://api.example.com/data"'
    const urls = extractUrlsFromJs(js)
    expect(urls).toContain('https://api.example.com/data')
  })

  it('extracts URLs from single-quoted strings', () => {
    const js = "const url = 'https://api.example.com/data'"
    const urls = extractUrlsFromJs(js)
    expect(urls).toContain('https://api.example.com/data')
  })

  it('extracts URLs from template literals', () => {
    const js = 'const url = `https://api.example.com/data`'
    const urls = extractUrlsFromJs(js)
    expect(urls).toContain('https://api.example.com/data')
  })

  it('extracts URLs from fetch calls', () => {
    const js = 'fetch("https://api.example.com/endpoint")'
    const urls = extractUrlsFromJs(js)
    expect(urls).toContain('https://api.example.com/endpoint')
  })

  it('returns empty array for code without URLs', () => {
    const js = 'const x = 42; function foo() { return x; }'
    const urls = extractUrlsFromJs(js)
    expect(urls).toHaveLength(0)
  })
})
