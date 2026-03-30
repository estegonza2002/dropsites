/**
 * Thumbnail storage — persists and retrieves deployment preview thumbnails
 * via the project's storage abstraction layer.
 */

import { storage } from '@/lib/storage'
import { Readable } from 'stream'

const THUMBNAIL_BUCKET = process.env.THUMBNAIL_BUCKET ?? 'dropsites-thumbnails'
const THUMBNAIL_PREFIX = 'thumbnails/'

function thumbnailKey(deploymentId: string): string {
  return `${THUMBNAIL_PREFIX}${deploymentId}.webp`
}

/**
 * Store a thumbnail image for a deployment.
 * Returns the storage key.
 */
export async function storeThumbnail(
  deploymentId: string,
  thumbnail: Buffer,
): Promise<string> {
  if (!deploymentId) throw new Error('deploymentId is required')
  if (!thumbnail || thumbnail.length === 0) throw new Error('Thumbnail buffer is empty')

  const key = thumbnailKey(deploymentId)
  await storage.upload(THUMBNAIL_BUCKET, key, thumbnail, 'image/webp')
  return key
}

/**
 * Get the thumbnail URL for a deployment.
 * Returns null if no thumbnail exists.
 */
export async function getThumbnailUrl(
  deploymentId: string,
): Promise<string | null> {
  if (!deploymentId) return null

  const key = thumbnailKey(deploymentId)
  const exists = await storage.exists(THUMBNAIL_BUCKET, key)

  if (!exists) return null

  // Return a relative API path that can serve the thumbnail
  return `/api/v1/thumbnails/${deploymentId}`
}

/**
 * Retrieve the raw thumbnail buffer from storage.
 * Returns null if not found.
 */
export async function getThumbnailBuffer(
  deploymentId: string,
): Promise<Buffer | null> {
  const key = thumbnailKey(deploymentId)
  const exists = await storage.exists(THUMBNAIL_BUCKET, key)

  if (!exists) return null

  const { body } = await storage.get(THUMBNAIL_BUCKET, key)

  // Convert Readable stream to Buffer
  const chunks: Buffer[] = []
  for await (const chunk of body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

/**
 * Delete a deployment's thumbnail from storage.
 */
export async function deleteThumbnail(deploymentId: string): Promise<void> {
  const key = thumbnailKey(deploymentId)
  await storage.delete(THUMBNAIL_BUCKET, key)
}
