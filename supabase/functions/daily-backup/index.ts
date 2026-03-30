/**
 * Daily Backup — Edge Function
 *
 * Runs daily at 02:00 UTC via Supabase Edge Functions cron.
 * Copies deployment files from primary to backup bucket,
 * enforces 30-day retention, and logs the result.
 *
 * Deployment: `supabase functions deploy daily-backup`
 * Cron: configure via supabase dashboard — schedule: "0 2 * * *"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
} from 'https://esm.sh/@aws-sdk/client-s3@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!
const PRIMARY_BUCKET = Deno.env.get('R2_BUCKET_NAME') ?? 'dropsites-deployments'
const BACKUP_BUCKET = Deno.env.get('R2_BACKUP_BUCKET_NAME') ?? 'dropsites-backups'

const RETENTION_DAYS = 30

function getS3Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
}

async function listAllKeys(client: S3Client, bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )

    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key)
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)

  return keys
}

async function copyObject(
  client: S3Client,
  srcBucket: string,
  srcKey: string,
  dstBucket: string,
  dstKey: string,
): Promise<number> {
  const getResponse = await client.send(
    new GetObjectCommand({ Bucket: srcBucket, Key: srcKey }),
  )

  const body = await getResponse.Body?.transformToByteArray()
  if (!body) throw new Error(`Empty body for ${srcKey}`)

  await client.send(
    new PutObjectCommand({
      Bucket: dstBucket,
      Key: dstKey,
      Body: body,
      ContentType: getResponse.ContentType ?? 'application/octet-stream',
    }),
  )

  return body.length
}

async function cleanOldBackups(client: S3Client): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  let cleaned = 0

  // Check date-prefixed folders beyond retention
  for (let i = RETENTION_DAYS; i <= RETENTION_DAYS + 30; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const prefix = d.toISOString().slice(0, 10) + '/'

    if (prefix.slice(0, 10) <= cutoffStr) {
      const keys = await listAllKeys(client, BACKUP_BUCKET, prefix)
      if (keys.length > 0) {
        // Delete in batches of 1000 (S3 limit)
        for (let j = 0; j < keys.length; j += 1000) {
          const batch = keys.slice(j, j + 1000)
          await client.send(
            new DeleteObjectsCommand({
              Bucket: BACKUP_BUCKET,
              Delete: {
                Objects: batch.map((k) => ({ Key: k })),
                Quiet: true,
              },
            }),
          )
        }
        cleaned += keys.length
      }
    }
  }

  return cleaned
}

Deno.serve(async (_req: Request) => {
  const startedAt = new Date().toISOString()
  const datePrefix = new Date().toISOString().slice(0, 10)

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const s3 = getS3Client()

    // Get all active deployments
    const { data: deployments, error: queryError } = await supabase
      .from('deployments')
      .select('id, slug, workspace_id')
      .is('archived_at', null)

    if (queryError) {
      console.error('Query error:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to query deployments' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    let filesBackedUp = 0
    let filesFailed = 0
    let bytesTransferred = 0
    let deploymentsProcessed = 0

    for (const deployment of deployments ?? []) {
      try {
        const prefix = `${deployment.workspace_id}/${deployment.id}/`
        const keys = await listAllKeys(s3, PRIMARY_BUCKET, prefix)

        for (const key of keys) {
          try {
            const backupKey = `${datePrefix}/${key}`
            const bytes = await copyObject(s3, PRIMARY_BUCKET, key, BACKUP_BUCKET, backupKey)
            filesBackedUp++
            bytesTransferred += bytes
          } catch (err) {
            filesFailed++
            console.error(`Failed to backup ${key}:`, err)
          }
        }

        deploymentsProcessed++
      } catch (err) {
        console.error(`Failed to process deployment ${deployment.id}:`, err)
      }
    }

    // Clean old backups
    const oldBackupsCleaned = await cleanOldBackups(s3)

    // Audit log
    await supabase.from('audit_log').insert({
      action: 'backup.daily_completed',
      actor_id: null,
      target_id: null,
      target_type: 'system',
      details: {
        date_prefix: datePrefix,
        deployments_processed: deploymentsProcessed,
        files_backed_up: filesBackedUp,
        files_failed: filesFailed,
        bytes_transferred: bytesTransferred,
        old_backups_cleaned: oldBackupsCleaned,
      },
    })

    const completedAt = new Date().toISOString()
    console.log(
      `[daily-backup] Done: ${deploymentsProcessed} deployments, ${filesBackedUp} files, ${oldBackupsCleaned} old backups cleaned`,
    )

    return new Response(
      JSON.stringify({
        success: filesFailed === 0,
        deploymentsProcessed,
        filesBackedUp,
        filesFailed,
        bytesTransferred,
        oldBackupsCleaned,
        startedAt,
        completedAt,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Daily backup error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
