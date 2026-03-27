import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { Readable } from 'stream'

function createS3Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  return new S3Client({
    region: 'auto',
    endpoint: accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
  })
}

let _client: S3Client | null = null

function getClient(): S3Client {
  if (!_client) {
    _client = createS3Client()
  }
  return _client
}

export async function uploadObject(
  bucket: string,
  key: string,
  body: Buffer | Readable,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
}

export async function getObject(
  bucket: string,
  key: string
): Promise<{ body: Readable; contentType: string; contentLength: number }> {
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  )

  if (!response.Body) {
    throw new Error(`Object not found: ${key}`)
  }

  return {
    body: response.Body as Readable,
    contentType: response.ContentType ?? 'application/octet-stream',
    contentLength: response.ContentLength ?? 0,
  }
}

export async function deleteObject(
  bucket: string,
  key: string
): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  )
}

export async function deletePrefix(
  bucket: string,
  prefix: string
): Promise<void> {
  let continuationToken: string | undefined

  do {
    const listResponse = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )

    const objects = listResponse.Contents ?? []

    if (objects.length > 0) {
      await getClient().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key! })),
            Quiet: true,
          },
        })
      )
    }

    continuationToken = listResponse.IsTruncated
      ? listResponse.NextContinuationToken
      : undefined
  } while (continuationToken)
}

export async function objectExists(
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    await getClient().send(
      new HeadObjectCommand({ Bucket: bucket, Key: key })
    )
    return true
  } catch {
    return false
  }
}

export async function listObjects(
  bucket: string,
  prefix: string
): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )

    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key)
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined
  } while (continuationToken)

  return keys
}

/** Reset the singleton — only for tests */
export function _resetClientForTesting(): void {
  _client = null
}
