import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { promises as fs } from 'fs'
import { Readable } from 'stream'
import {
  uploadObject,
  getObject,
  deleteObject,
  deletePrefix,
  objectExists,
  listObjects,
} from '@/lib/storage/local-backend'

const TEST_ROOT = join(process.cwd(), 'storage')
const TEST_BUCKET = '__test_bucket__'

/** Collect a Readable stream into a string */
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}

describe('Local storage backend', () => {
  beforeEach(async () => {
    // Clean test bucket before each test
    const bucketPath = join(TEST_ROOT, TEST_BUCKET)
    await fs.rm(bucketPath, { recursive: true, force: true })
  })

  afterEach(async () => {
    const bucketPath = join(TEST_ROOT, TEST_BUCKET)
    await fs.rm(bucketPath, { recursive: true, force: true })
  })

  it('upload and get a Buffer', async () => {
    const content = 'Hello, local storage!'
    await uploadObject(TEST_BUCKET, 'test.txt', Buffer.from(content), 'text/plain')

    const result = await getObject(TEST_BUCKET, 'test.txt')
    expect(result.contentType).toBe('text/plain')
    expect(result.contentLength).toBe(Buffer.byteLength(content))

    const body = await streamToString(result.body)
    expect(body).toBe(content)
  })

  it('upload a Readable stream', async () => {
    const content = 'stream content here'
    const stream = Readable.from([Buffer.from(content)])
    await uploadObject(TEST_BUCKET, 'stream.txt', stream, 'text/plain')

    const result = await getObject(TEST_BUCKET, 'stream.txt')
    const body = await streamToString(result.body)
    expect(body).toBe(content)
  })

  it('infers content type from extension', async () => {
    await uploadObject(TEST_BUCKET, 'page.html', Buffer.from('<h1>hi</h1>'), 'text/html')
    const result = await getObject(TEST_BUCKET, 'page.html')
    expect(result.contentType).toBe('text/html')
  })

  it('returns application/octet-stream for unknown extensions', async () => {
    await uploadObject(TEST_BUCKET, 'data.xyz', Buffer.from('binary'), 'application/octet-stream')
    const result = await getObject(TEST_BUCKET, 'data.xyz')
    expect(result.contentType).toBe('application/octet-stream')
  })

  it('exists returns false for missing objects', async () => {
    const result = await objectExists(TEST_BUCKET, 'nonexistent.txt')
    expect(result).toBe(false)
  })

  it('exists returns true after upload', async () => {
    await uploadObject(TEST_BUCKET, 'check.txt', Buffer.from('ok'), 'text/plain')
    const result = await objectExists(TEST_BUCKET, 'check.txt')
    expect(result).toBe(true)
  })

  it('delete removes an object', async () => {
    await uploadObject(TEST_BUCKET, 'to-delete.txt', Buffer.from('bye'), 'text/plain')
    expect(await objectExists(TEST_BUCKET, 'to-delete.txt')).toBe(true)

    await deleteObject(TEST_BUCKET, 'to-delete.txt')
    expect(await objectExists(TEST_BUCKET, 'to-delete.txt')).toBe(false)
  })

  it('delete is idempotent for missing objects', async () => {
    // Should not throw
    await deleteObject(TEST_BUCKET, 'never-existed.txt')
  })

  it('list returns keys under a prefix', async () => {
    await uploadObject(TEST_BUCKET, 'site/index.html', Buffer.from('<html>'), 'text/html')
    await uploadObject(TEST_BUCKET, 'site/style.css', Buffer.from('body{}'), 'text/css')
    await uploadObject(TEST_BUCKET, 'other/file.txt', Buffer.from('nope'), 'text/plain')

    const keys = await listObjects(TEST_BUCKET, 'site/')
    expect(keys).toHaveLength(2)
    expect(keys).toContain('site/index.html')
    expect(keys).toContain('site/style.css')
  })

  it('list returns empty for nonexistent prefix', async () => {
    const keys = await listObjects(TEST_BUCKET, 'missing/')
    expect(keys).toHaveLength(0)
  })

  it('deletePrefix removes all objects under prefix', async () => {
    await uploadObject(TEST_BUCKET, 'deploy/v1/a.html', Buffer.from('a'), 'text/html')
    await uploadObject(TEST_BUCKET, 'deploy/v1/b.css', Buffer.from('b'), 'text/css')
    await uploadObject(TEST_BUCKET, 'deploy/v2/c.js', Buffer.from('c'), 'application/javascript')

    await deletePrefix(TEST_BUCKET, 'deploy/v1/')
    expect(await objectExists(TEST_BUCKET, 'deploy/v1/a.html')).toBe(false)
    expect(await objectExists(TEST_BUCKET, 'deploy/v1/b.css')).toBe(false)
    // v2 should still exist
    expect(await objectExists(TEST_BUCKET, 'deploy/v2/c.js')).toBe(true)
  })

  it('deletePrefix is idempotent for missing prefix', async () => {
    // Should not throw
    await deletePrefix(TEST_BUCKET, 'nonexistent/')
  })

  it('handles nested directory structures', async () => {
    await uploadObject(TEST_BUCKET, 'a/b/c/d.txt', Buffer.from('deep'), 'text/plain')
    expect(await objectExists(TEST_BUCKET, 'a/b/c/d.txt')).toBe(true)

    const result = await getObject(TEST_BUCKET, 'a/b/c/d.txt')
    const body = await streamToString(result.body)
    expect(body).toBe('deep')
  })
})
