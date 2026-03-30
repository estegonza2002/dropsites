import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock storage
vi.mock('@/lib/storage', () => {
  const stored = new Map<string, { body: Buffer; contentType: string }>()
  return {
    storage: {
      upload: vi.fn(async (_bucket: string, key: string, body: Buffer, contentType: string) => {
        stored.set(key, { body, contentType })
      }),
      get: vi.fn(async (_bucket: string, key: string) => {
        const entry = stored.get(key)
        if (!entry) throw new Error('Not found')
        const { Readable } = await import('stream')
        return {
          body: Readable.from(entry.body),
          contentType: entry.contentType,
          contentLength: entry.body.length,
        }
      }),
      exists: vi.fn(async (_bucket: string, key: string) => stored.has(key)),
      delete: vi.fn(async (_bucket: string, key: string) => {
        stored.delete(key)
      }),
      deletePrefix: vi.fn(),
      list: vi.fn(async () => []),
    },
  }
})

import { storeThumbnail, getThumbnailUrl, getThumbnailBuffer, deleteThumbnail } from '@/lib/thumbnails/storage'
import { enqueueThumbnailGeneration, isJobInflight, getInflightCount } from '@/lib/thumbnails/queue'

describe('Thumbnail storage', () => {
  it('should store and retrieve a thumbnail', async () => {
    const deploymentId = 'test-deployment-1'
    const thumbnail = Buffer.from('fake-image-data')

    const key = await storeThumbnail(deploymentId, thumbnail)
    expect(key).toContain(deploymentId)

    const url = await getThumbnailUrl(deploymentId)
    expect(url).toBe(`/api/v1/thumbnails/${deploymentId}`)

    const buffer = await getThumbnailBuffer(deploymentId)
    expect(buffer).toBeTruthy()
    expect(buffer!.toString()).toBe('fake-image-data')
  })

  it('should return null for non-existent thumbnail', async () => {
    const url = await getThumbnailUrl('nonexistent')
    expect(url).toBeNull()

    const buffer = await getThumbnailBuffer('nonexistent')
    expect(buffer).toBeNull()
  })

  it('should delete a thumbnail', async () => {
    const deploymentId = 'test-deployment-delete'
    const thumbnail = Buffer.from('delete-me')

    await storeThumbnail(deploymentId, thumbnail)
    const urlBefore = await getThumbnailUrl(deploymentId)
    expect(urlBefore).toBeTruthy()

    await deleteThumbnail(deploymentId)
    // After delete, exists returns false (mocked delete removes from map)
    const urlAfter = await getThumbnailUrl(deploymentId)
    expect(urlAfter).toBeNull()
  })

  it('should throw if deploymentId is empty', async () => {
    await expect(storeThumbnail('', Buffer.from('x'))).rejects.toThrow(
      'deploymentId is required',
    )
  })

  it('should throw if thumbnail buffer is empty', async () => {
    await expect(storeThumbnail('dep-1', Buffer.alloc(0))).rejects.toThrow(
      'Thumbnail buffer is empty',
    )
  })
})

describe('Thumbnail queue', () => {
  beforeEach(() => {
    // Reset state between tests
  })

  it('should track inflight count', () => {
    expect(typeof getInflightCount()).toBe('number')
  })

  it('should report job inflight status', () => {
    expect(isJobInflight('nonexistent')).toBe(false)
  })

  it('should handle enqueue without throwing', () => {
    // The generator will fail (no real browser) but should not throw
    expect(() =>
      enqueueThumbnailGeneration({
        deploymentId: 'queue-test',
        deploymentUrl: 'http://localhost:3000/test',
      }),
    ).not.toThrow()
  })
})

describe('Thumbnail generator', () => {
  it('should export generateThumbnail function', async () => {
    const { generateThumbnail } = await import('@/lib/thumbnails/generator')
    expect(typeof generateThumbnail).toBe('function')
  })

  it('should reject invalid URL', async () => {
    const { generateThumbnail } = await import('@/lib/thumbnails/generator')
    await expect(generateThumbnail('')).rejects.toThrow('Invalid deployment URL')
  })
})
