import { Readable } from 'stream'
import * as s3 from './s3-client'

export type StorageBackend = {
  upload(
    bucket: string,
    key: string,
    body: Buffer | Readable,
    contentType: string
  ): Promise<void>
  get(
    bucket: string,
    key: string
  ): Promise<{ body: Readable; contentType: string; contentLength: number }>
  delete(bucket: string, key: string): Promise<void>
  deletePrefix(bucket: string, prefix: string): Promise<void>
  exists(bucket: string, key: string): Promise<boolean>
  list(bucket: string, prefix: string): Promise<string[]>
}

const r2Backend: StorageBackend = {
  upload: s3.uploadObject,
  get: s3.getObject,
  delete: s3.deleteObject,
  deletePrefix: s3.deletePrefix,
  exists: s3.objectExists,
  list: s3.listObjects,
}

function resolveBackend(): StorageBackend {
  const backend = process.env.STORAGE_BACKEND ?? 'r2'

  if (backend === 'r2' || backend === 's3') {
    return r2Backend
  }

  throw new Error(
    `Unsupported STORAGE_BACKEND: "${backend}". Supported values: r2, s3`
  )
}

export const storage: StorageBackend = resolveBackend()
