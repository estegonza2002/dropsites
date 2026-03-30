// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/storage/s3-client', () => ({
  uploadObject: vi.fn().mockResolvedValue(undefined),
  getObject: vi.fn().mockResolvedValue({
    body: { pipe: vi.fn() },
    contentType: 'text/html',
    contentLength: 100,
  }),
  deleteObject: vi.fn().mockResolvedValue(undefined),
  deletePrefix: vi.fn().mockResolvedValue(undefined),
  objectExists: vi.fn().mockResolvedValue(true),
  listObjects: vi.fn().mockResolvedValue(['file1.html']),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import * as s3 from '@/lib/storage/s3-client'

// ---------------------------------------------------------------------------
// Tests: getStorageRegion
// ---------------------------------------------------------------------------

describe('getStorageRegion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns "us" for workspace with data_region = "us"', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { data_region: 'us' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const { getStorageRegion } = await import('@/lib/storage/region')
    const region = await getStorageRegion('ws-123')

    expect(region).toBe('us')
    expect(mockFrom).toHaveBeenCalledWith('workspaces')
    expect(mockEq).toHaveBeenCalledWith('id', 'ws-123')
  })

  it('returns "eu" for workspace with data_region = "eu"', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { data_region: 'eu' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const { getStorageRegion } = await import('@/lib/storage/region')
    const region = await getStorageRegion('ws-eu')

    expect(region).toBe('eu')
  })

  it('defaults to "us" when workspace not found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const { getStorageRegion } = await import('@/lib/storage/region')
    const region = await getStorageRegion('nonexistent')

    expect(region).toBe('us')
  })

  it('defaults to "us" for unknown region value', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { data_region: 'ap-southeast' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const { getStorageRegion } = await import('@/lib/storage/region')
    const region = await getStorageRegion('ws-asia')

    expect(region).toBe('us')
  })
})

// ---------------------------------------------------------------------------
// Tests: getRegionBucket
// ---------------------------------------------------------------------------

describe('getRegionBucket', () => {
  it('returns US bucket for "us" region', async () => {
    const { getRegionBucket } = await import('@/lib/storage/region')
    const bucket = getRegionBucket('us')
    expect(bucket).toBe('dropsites-us')
  })

  it('returns EU bucket for "eu" region', async () => {
    const { getRegionBucket } = await import('@/lib/storage/region')
    const bucket = getRegionBucket('eu')
    expect(bucket).toBe('dropsites-eu')
  })
})

// ---------------------------------------------------------------------------
// Tests: Multi-region storage routing
// ---------------------------------------------------------------------------

describe('createMultiRegionStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockWorkspaceRegion(region: string) {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { data_region: region },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)
  }

  it('routes uploads to the correct regional bucket (US)', async () => {
    mockWorkspaceRegion('us')

    const { createMultiRegionStorage } = await import('@/lib/storage/multi-region')
    const storage = createMultiRegionStorage('ws-us')

    await storage.upload('key.html', Buffer.from('hello'), 'text/html')

    expect(s3.uploadObject).toHaveBeenCalledWith(
      'dropsites-us',
      'key.html',
      expect.any(Buffer),
      'text/html',
    )
  })

  it('routes uploads to the correct regional bucket (EU)', async () => {
    mockWorkspaceRegion('eu')

    const { createMultiRegionStorage } = await import('@/lib/storage/multi-region')
    const storage = createMultiRegionStorage('ws-eu')

    await storage.upload('key.html', Buffer.from('hello'), 'text/html')

    expect(s3.uploadObject).toHaveBeenCalledWith(
      'dropsites-eu',
      'key.html',
      expect.any(Buffer),
      'text/html',
    )
  })

  it('routes get() to the correct regional bucket', async () => {
    mockWorkspaceRegion('eu')

    const { createMultiRegionStorage } = await import('@/lib/storage/multi-region')
    const storage = createMultiRegionStorage('ws-eu')

    await storage.get('file.html')

    expect(s3.getObject).toHaveBeenCalledWith('dropsites-eu', 'file.html')
  })

  it('routes delete() to the correct regional bucket', async () => {
    mockWorkspaceRegion('us')

    const { createMultiRegionStorage } = await import('@/lib/storage/multi-region')
    const storage = createMultiRegionStorage('ws-us')

    await storage.delete('old-file.html')

    expect(s3.deleteObject).toHaveBeenCalledWith('dropsites-us', 'old-file.html')
  })

  it('caches region after first lookup', async () => {
    mockWorkspaceRegion('eu')

    const { createMultiRegionStorage } = await import('@/lib/storage/multi-region')
    const storage = createMultiRegionStorage('ws-eu')

    await storage.upload('a.html', Buffer.from('a'), 'text/html')
    await storage.upload('b.html', Buffer.from('b'), 'text/html')

    // createAdminClient should only be called once (region cached)
    expect(createAdminClient).toHaveBeenCalledTimes(1)
  })

  it('getRegion() returns the workspace region', async () => {
    mockWorkspaceRegion('eu')

    const { createMultiRegionStorage } = await import('@/lib/storage/multi-region')
    const storage = createMultiRegionStorage('ws-eu')

    const region = await storage.getRegion()
    expect(region).toBe('eu')
  })

  it('getBucket() returns the correct bucket name', async () => {
    mockWorkspaceRegion('us')

    const { createMultiRegionStorage } = await import('@/lib/storage/multi-region')
    const storage = createMultiRegionStorage('ws-us')

    const bucket = await storage.getBucket()
    expect(bucket).toBe('dropsites-us')
  })
})

// ---------------------------------------------------------------------------
// Tests: Multi-region StorageBackend wrapper
// ---------------------------------------------------------------------------

describe('createMultiRegionBackend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('implements StorageBackend interface ignoring bucket param', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { data_region: 'eu' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as never)

    const { createMultiRegionBackend } = await import('@/lib/storage/multi-region')
    const backend = createMultiRegionBackend('ws-eu')

    // The bucket param "ignored-bucket" should be overridden by region routing
    await backend.upload('ignored-bucket', 'key.html', Buffer.from('x'), 'text/html')
    expect(s3.uploadObject).toHaveBeenCalledWith(
      'dropsites-eu',
      'key.html',
      expect.any(Buffer),
      'text/html',
    )
  })
})
