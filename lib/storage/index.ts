import { Readable } from 'stream'
import * as s3 from './s3-client'
import { localBackend } from './local-backend'

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

const s3Backend: StorageBackend = {
  upload: s3.uploadObject,
  get: s3.getObject,
  delete: s3.deleteObject,
  deletePrefix: s3.deletePrefix,
  exists: s3.objectExists,
  list: s3.listObjects,
}

/** Supported STORAGE_BACKEND values */
export type StorageBackendType = 'r2' | 's3' | 'gcs' | 'azure' | 'minio' | 'local'

function resolveBackend(): StorageBackend {
  const backend = (process.env.STORAGE_BACKEND ?? 'r2') as string

  // r2, s3, gcs (S3-compatible), azure (via S3 gateway), minio (S3-compatible)
  if (backend === 'r2' || backend === 's3' || backend === 'gcs' || backend === 'azure') {
    return s3Backend
  }

  if (backend === 'minio') {
    // MinIO is S3-compatible — same backend, env vars provide endpoint
    return s3Backend
  }

  if (backend === 'local') {
    return localBackend
  }

  throw new Error(
    `Unsupported STORAGE_BACKEND: "${backend}". Supported values: r2, s3, gcs, azure, minio, local`
  )
}

export const storage: StorageBackend = resolveBackend()
