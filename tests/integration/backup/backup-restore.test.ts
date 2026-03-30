import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'stream'

// ---------- Storage mock ----------

const mockUpload = vi.fn().mockResolvedValue(undefined)
const mockGet = vi.fn()
const mockDelete = vi.fn().mockResolvedValue(undefined)
const mockDeletePrefix = vi.fn().mockResolvedValue(undefined)
const mockExists = vi.fn().mockResolvedValue(true)
const mockList = vi.fn().mockResolvedValue([])

vi.mock('@/lib/storage', () => ({
  storage: {
    upload: (...args: unknown[]) => mockUpload(...args),
    get: (...args: unknown[]) => mockGet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    deletePrefix: (...args: unknown[]) => mockDeletePrefix(...args),
    exists: (...args: unknown[]) => mockExists(...args),
    list: (...args: unknown[]) => mockList(...args),
  },
}))

// ---------- Supabase admin mock ----------

const mockInsert = vi.fn().mockReturnValue({ error: null })
const mockSelectChain = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'audit_log') {
        return { insert: mockInsert }
      }
      if (table === 'deployments') {
        return {
          select: () => ({
            is: mockSelectChain,
          }),
        }
      }
      if (table === 'deployment_files') {
        return {
          select: () => ({
            data: [
              {
                storage_key: 'ws1/dep1/index.html',
                sha256_hash: 'abc123',
              },
            ],
            error: null,
          }),
        }
      }
      return {
        select: () => ({ eq: () => ({ single: vi.fn() }) }),
        insert: mockInsert,
      }
    },
  }),
}))

// ---------- Helper to create a fake readable stream ----------

function fakeReadable(data: Buffer): Readable {
  return new Readable({
    read() {
      this.push(data)
      this.push(null)
    },
  })
}

// ---------- Tests ----------

describe('Daily Backup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectChain.mockReturnValue({
      data: [
        { id: 'dep1', slug: 'test-site', workspace_id: 'ws1', storage_bytes: 1024 },
      ],
      error: null,
    })
  })

  it('backs up deployment files to backup bucket', async () => {
    const fileContent = Buffer.from('<html>test</html>')

    mockList.mockResolvedValueOnce(['ws1/dep1/index.html'])
    mockGet.mockResolvedValueOnce({
      body: fakeReadable(fileContent),
      contentType: 'text/html',
      contentLength: fileContent.length,
    })

    // For cleanup — no old backups
    mockList.mockResolvedValue([])

    const { runDailyBackup } = await import('@/lib/backup/daily-backup')
    const result = await runDailyBackup()

    expect(result.deploymentsProcessed).toBe(1)
    expect(result.filesBackedUp).toBe(1)
    expect(result.filesFailed).toBe(0)
    expect(result.bytesTransferred).toBe(fileContent.length)
    expect(mockUpload).toHaveBeenCalledWith(
      'dropsites-backups',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}\/ws1\/dep1\/index\.html$/),
      fileContent,
      'text/html',
    )
  })

  it('handles empty deployment list gracefully', async () => {
    mockSelectChain.mockReturnValue({ data: [], error: null })

    const { runDailyBackup } = await import('@/lib/backup/daily-backup')
    const result = await runDailyBackup()

    expect(result.success).toBe(true)
    expect(result.deploymentsProcessed).toBe(0)
    expect(result.filesBackedUp).toBe(0)
  })

  it('reports errors for failed file copies', async () => {
    mockList.mockResolvedValueOnce(['ws1/dep1/index.html'])
    mockGet.mockRejectedValueOnce(new Error('Storage timeout'))
    // For cleanup
    mockList.mockResolvedValue([])

    const { runDailyBackup } = await import('@/lib/backup/daily-backup')
    const result = await runDailyBackup()

    expect(result.filesFailed).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Storage timeout')
  })
})

describe('Restore from Backup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid date format', async () => {
    const { restoreFromBackup } = await import('@/lib/backup/restore')
    const result = await restoreFromBackup('invalid')

    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain('Invalid backup date format')
  })

  it('handles empty backup', async () => {
    mockList.mockResolvedValueOnce([])

    const { restoreFromBackup } = await import('@/lib/backup/restore')
    const result = await restoreFromBackup('2026-03-28')

    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain('No backup found')
  })

  it('restores files and verifies integrity', async () => {
    const fileContent = Buffer.from('<html>restored</html>')

    mockList.mockResolvedValueOnce(['2026-03-28/ws1/dep1/index.html'])
    mockGet.mockResolvedValueOnce({
      body: fakeReadable(fileContent),
      contentType: 'text/html',
      contentLength: fileContent.length,
    })

    const { restoreFromBackup } = await import('@/lib/backup/restore')
    const result = await restoreFromBackup('2026-03-28')

    expect(result.filesRestored).toBe(1)
    expect(result.bytesRestored).toBe(fileContent.length)
    expect(mockUpload).toHaveBeenCalledWith(
      'dropsites-deployments',
      'ws1/dep1/index.html',
      fileContent,
      'text/html',
    )
  })
})

describe('Retention Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes old analytics, bandwidth, and webhook delivery records', async () => {
    const mockDeleteChain = vi.fn().mockReturnValue({
      lt: vi.fn().mockResolvedValue({ count: 5, error: null }),
    })

    // Re-mock admin client for retention-specific calls
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'audit_log') {
            return { insert: vi.fn().mockReturnValue({ error: null }) }
          }
          return {
            delete: mockDeleteChain,
          }
        },
      }),
    }))

    const { enforceRetention } = await import('@/lib/backup/retention')
    const result = await enforceRetention()

    // Should have attempted to delete from analytics, bandwidth, and webhook_deliveries
    expect(result).toBeDefined()
    expect(typeof result.analyticsDeleted).toBe('number')
    expect(typeof result.bandwidthDeleted).toBe('number')
    expect(typeof result.webhookDeliveriesDeleted).toBe('number')
  })
})

describe('computeHash', () => {
  it('returns consistent SHA-256 hash', async () => {
    const { computeHash } = await import('@/lib/backup/daily-backup')
    const data = Buffer.from('test content')
    const hash1 = computeHash(data)
    const hash2 = computeHash(data)

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA-256 hex length
  })
})
