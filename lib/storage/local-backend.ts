import { promises as fs } from 'fs'
import { createReadStream, existsSync } from 'fs'
import { join, extname } from 'path'
import { Readable } from 'stream'
import { stat } from 'fs/promises'
import type { StorageBackend } from './index'

/** Root directory for local file storage. Defaults to `./storage` in project root. */
const STORAGE_ROOT = process.env.LOCAL_STORAGE_ROOT ?? join(process.cwd(), 'storage')

/** Minimal extension-to-MIME mapping for common web assets. */
const MIME_MAP: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
}

function inferContentType(key: string): string {
  const ext = extname(key).toLowerCase()
  return MIME_MAP[ext] ?? 'application/octet-stream'
}

function resolvePath(bucket: string, key: string): string {
  return join(STORAGE_ROOT, bucket, key)
}

async function ensureDir(filePath: string): Promise<void> {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'))
  if (dir) {
    await fs.mkdir(dir, { recursive: true })
  }
}

export async function uploadObject(
  bucket: string,
  key: string,
  body: Buffer | Readable,
  _contentType: string,
): Promise<void> {
  const filePath = resolvePath(bucket, key)
  await ensureDir(filePath)

  if (Buffer.isBuffer(body)) {
    await fs.writeFile(filePath, body)
  } else {
    // Readable stream — collect into buffer then write
    const chunks: Buffer[] = []
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    await fs.writeFile(filePath, Buffer.concat(chunks))
  }
}

export async function getObject(
  bucket: string,
  key: string,
): Promise<{ body: Readable; contentType: string; contentLength: number }> {
  const filePath = resolvePath(bucket, key)

  const stats = await stat(filePath)
  const body = createReadStream(filePath) as Readable

  return {
    body,
    contentType: inferContentType(key),
    contentLength: stats.size,
  }
}

export async function deleteObject(
  bucket: string,
  key: string,
): Promise<void> {
  const filePath = resolvePath(bucket, key)
  try {
    await fs.unlink(filePath)
  } catch (err: unknown) {
    // Treat ENOENT as success (already deleted)
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}

export async function deletePrefix(
  bucket: string,
  prefix: string,
): Promise<void> {
  const dirPath = join(STORAGE_ROOT, bucket, prefix)
  try {
    await fs.rm(dirPath, { recursive: true, force: true })
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}

export async function objectExists(
  bucket: string,
  key: string,
): Promise<boolean> {
  const filePath = resolvePath(bucket, key)
  return existsSync(filePath)
}

export async function listObjects(
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const dirPath = join(STORAGE_ROOT, bucket, prefix)
  const results: string[] = []

  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
      throw err
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else {
        // Return key relative to bucket root
        const bucketRoot = join(STORAGE_ROOT, bucket)
        const relativePath = fullPath.substring(bucketRoot.length + 1)
        results.push(relativePath)
      }
    }
  }

  await walk(dirPath)
  return results
}

export const localBackend: StorageBackend = {
  upload: uploadObject,
  get: getObject,
  delete: deleteObject,
  deletePrefix,
  exists: objectExists,
  list: listObjects,
}
