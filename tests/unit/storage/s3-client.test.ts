// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Readable } from 'stream'

const mockSend = vi.fn()

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: vi.fn(function (this: unknown) {
      return { send: mockSend }
    }),
    PutObjectCommand: vi.fn(function (this: unknown, input: unknown) {
      Object.assign(this as object, { _type: 'PutObject', ...(input as object) })
    }),
    GetObjectCommand: vi.fn(function (this: unknown, input: unknown) {
      Object.assign(this as object, { _type: 'GetObject', ...(input as object) })
    }),
    DeleteObjectCommand: vi.fn(function (this: unknown, input: unknown) {
      Object.assign(this as object, { _type: 'DeleteObject', ...(input as object) })
    }),
    DeleteObjectsCommand: vi.fn(function (this: unknown, input: unknown) {
      Object.assign(this as object, { _type: 'DeleteObjects', ...(input as object) })
    }),
    ListObjectsV2Command: vi.fn(function (this: unknown, input: unknown) {
      Object.assign(this as object, { _type: 'ListObjectsV2', ...(input as object) })
    }),
    HeadObjectCommand: vi.fn(function (this: unknown, input: unknown) {
      Object.assign(this as object, { _type: 'HeadObject', ...(input as object) })
    }),
  }
})

import {
  uploadObject,
  getObject,
  deleteObject,
  deletePrefix,
  objectExists,
  listObjects,
  _resetClientForTesting,
} from '@/lib/storage/s3-client'

beforeEach(() => {
  mockSend.mockReset()
  _resetClientForTesting()
})

describe('s3-client', () => {
  describe('uploadObject', () => {
    it('sends PutObjectCommand with correct bucket, key, and content-type', async () => {
      mockSend.mockResolvedValue({})

      const body = Buffer.from('<html></html>')
      await uploadObject('my-bucket', 'deployments/abc/index.html', body, 'text/html')

      expect(mockSend).toHaveBeenCalledOnce()
      const cmd = mockSend.mock.calls[0][0]
      expect(cmd.Bucket).toBe('my-bucket')
      expect(cmd.Key).toBe('deployments/abc/index.html')
      expect(cmd.ContentType).toBe('text/html')
      expect(cmd.Body).toBe(body)
    })
  })

  describe('deleteObject', () => {
    it('sends DeleteObjectCommand with correct bucket and key', async () => {
      mockSend.mockResolvedValue({})

      await deleteObject('my-bucket', 'deployments/abc/index.html')

      expect(mockSend).toHaveBeenCalledOnce()
      const cmd = mockSend.mock.calls[0][0]
      expect(cmd.Bucket).toBe('my-bucket')
      expect(cmd.Key).toBe('deployments/abc/index.html')
    })
  })

  describe('listObjects', () => {
    it('returns all keys under the prefix', async () => {
      mockSend.mockResolvedValue({
        Contents: [
          { Key: 'deployments/abc/index.html' },
          { Key: 'deployments/abc/style.css' },
        ],
        IsTruncated: false,
      })

      const keys = await listObjects('my-bucket', 'deployments/abc/')

      expect(keys).toEqual([
        'deployments/abc/index.html',
        'deployments/abc/style.css',
      ])
    })

    it('paginates when IsTruncated is true', async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [{ Key: 'a/1.html' }],
          IsTruncated: true,
          NextContinuationToken: 'token-1',
        })
        .mockResolvedValueOnce({
          Contents: [{ Key: 'a/2.html' }],
          IsTruncated: false,
        })

      const keys = await listObjects('my-bucket', 'a/')

      expect(keys).toEqual(['a/1.html', 'a/2.html'])
      expect(mockSend).toHaveBeenCalledTimes(2)
    })
  })

  describe('deletePrefix', () => {
    it('batch-deletes all objects under the prefix', async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [
            { Key: 'deployments/abc/index.html' },
            { Key: 'deployments/abc/style.css' },
          ],
          IsTruncated: false,
        })
        .mockResolvedValueOnce({}) // DeleteObjects response

      await deletePrefix('my-bucket', 'deployments/abc/')

      expect(mockSend).toHaveBeenCalledTimes(2)
      const deleteCmd = mockSend.mock.calls[1][0]
      expect(deleteCmd.Delete.Objects).toEqual([
        { Key: 'deployments/abc/index.html' },
        { Key: 'deployments/abc/style.css' },
      ])
    })

    it('does nothing when prefix has no objects', async () => {
      mockSend.mockResolvedValue({
        Contents: [],
        IsTruncated: false,
      })

      await deletePrefix('my-bucket', 'deployments/empty/')

      // Only the list call — no delete call
      expect(mockSend).toHaveBeenCalledTimes(1)
    })
  })

  describe('objectExists', () => {
    it('returns true when HeadObject succeeds', async () => {
      mockSend.mockResolvedValue({})

      expect(await objectExists('my-bucket', 'exists.html')).toBe(true)
    })

    it('returns false when HeadObject throws', async () => {
      mockSend.mockRejectedValue(new Error('NoSuchKey'))

      expect(await objectExists('my-bucket', 'missing.html')).toBe(false)
    })
  })

  describe('getObject', () => {
    it('returns body, contentType, and contentLength', async () => {
      const fakeBody = Readable.from(['<html></html>'])
      mockSend.mockResolvedValue({
        Body: fakeBody,
        ContentType: 'text/html',
        ContentLength: 13,
      })

      const result = await getObject('my-bucket', 'index.html')

      expect(result.body).toBe(fakeBody)
      expect(result.contentType).toBe('text/html')
      expect(result.contentLength).toBe(13)
    })

    it('throws when Body is missing', async () => {
      mockSend.mockResolvedValue({ Body: undefined })

      await expect(getObject('my-bucket', 'missing.html')).rejects.toThrow(
        'Object not found: missing.html'
      )
    })
  })
})
