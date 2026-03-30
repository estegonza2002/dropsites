import { Readable } from 'stream'
import type { StorageBackend } from './index'
import { getStorageRegion, getRegionBucket, type DataRegion } from './region'
import * as s3 from './s3-client'

/**
 * Multi-region storage backend.
 *
 * Wraps the standard StorageBackend interface but routes all operations
 * to the correct regional bucket based on the workspace's data_region setting.
 *
 * Usage:
 *   const storage = createMultiRegionStorage(workspaceId)
 *   await storage.upload(key, body, contentType)
 */
export type MultiRegionStorage = {
  upload(key: string, body: Buffer | Readable, contentType: string): Promise<void>
  get(key: string): Promise<{ body: Readable; contentType: string; contentLength: number }>
  delete(key: string): Promise<void>
  deletePrefix(prefix: string): Promise<void>
  exists(key: string): Promise<boolean>
  list(prefix: string): Promise<string[]>
  getRegion(): Promise<DataRegion>
  getBucket(): Promise<string>
}

/**
 * Creates a multi-region storage instance that routes to the correct
 * regional bucket based on the workspace's configured data region.
 */
export function createMultiRegionStorage(workspaceId: string): MultiRegionStorage {
  let cachedRegion: DataRegion | null = null
  let cachedBucket: string | null = null

  async function resolveBucket(): Promise<string> {
    if (cachedBucket) return cachedBucket
    const region = await getStorageRegion(workspaceId)
    cachedRegion = region
    cachedBucket = getRegionBucket(region)
    return cachedBucket
  }

  return {
    async upload(key, body, contentType) {
      const bucket = await resolveBucket()
      await s3.uploadObject(bucket, key, body, contentType)
    },

    async get(key) {
      const bucket = await resolveBucket()
      return s3.getObject(bucket, key)
    },

    async delete(key) {
      const bucket = await resolveBucket()
      await s3.deleteObject(bucket, key)
    },

    async deletePrefix(prefix) {
      const bucket = await resolveBucket()
      await s3.deletePrefix(bucket, prefix)
    },

    async exists(key) {
      const bucket = await resolveBucket()
      return s3.objectExists(bucket, key)
    },

    async list(prefix) {
      const bucket = await resolveBucket()
      return s3.listObjects(bucket, prefix)
    },

    async getRegion() {
      if (cachedRegion) return cachedRegion
      cachedRegion = await getStorageRegion(workspaceId)
      return cachedRegion
    },

    async getBucket() {
      return resolveBucket()
    },
  }
}

/**
 * Creates a StorageBackend-compatible wrapper that uses workspace-based
 * region routing. The `bucket` parameter in each call is ignored — the
 * actual bucket is determined by the workspace's data_region setting.
 */
export function createMultiRegionBackend(workspaceId: string): StorageBackend {
  const regionStorage = createMultiRegionStorage(workspaceId)

  return {
    async upload(_bucket, key, body, contentType) {
      await regionStorage.upload(key, body, contentType)
    },

    async get(_bucket, key) {
      return regionStorage.get(key)
    },

    async delete(_bucket, key) {
      await regionStorage.delete(key)
    },

    async deletePrefix(_bucket, prefix) {
      await regionStorage.deletePrefix(prefix)
    },

    async exists(_bucket, key) {
      return regionStorage.exists(key)
    },

    async list(_bucket, prefix) {
      return regionStorage.list(prefix)
    },
  }
}
