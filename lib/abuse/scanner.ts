/**
 * Deployment scanner — orchestrates automated abuse detection.
 *
 * Steps:
 * 1. Fetch file hashes for the deployment
 * 2. Check hashes against VirusTotal
 * 3. Download HTML/JS files and extract URLs
 * 4. Check extracted URLs against Google Safe Browsing
 * 5. If threats found, quarantine the deployment
 *
 * This runs asynchronously and does not block the upload flow.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { storage } from '@/lib/storage'
import { scanFile as vtScanFile } from './virustotal'
import { checkUrls } from './safe-browsing'
import { extractUrls, extractUrlsFromJs } from './url-extractor'
import { quarantineDeployment } from './quarantine'
import type { VirusTotalResult } from './virustotal'
import type { SafeBrowsingResult } from './safe-browsing'

export interface ScanResult {
  deploymentId: string
  scannedAt: string
  fileHashes: number
  virusTotalFlags: VirusTotalResult[]
  urlsExtracted: number
  safeBrowsingFlags: SafeBrowsingResult[]
  quarantined: boolean
  error?: string
}

/** MIME types we inspect for URL extraction */
const SCANNABLE_MIMES = new Set([
  'text/html',
  'application/xhtml+xml',
  'text/javascript',
  'application/javascript',
  'text/css',
])

/** Storage bucket for deployment files */
const DEPLOYMENT_BUCKET = 'deployments'

/**
 * Scan a deployment for threats. Intended to run async after upload completes.
 */
export async function scanDeployment(
  deploymentId: string,
): Promise<ScanResult> {
  const result: ScanResult = {
    deploymentId,
    scannedAt: new Date().toISOString(),
    fileHashes: 0,
    virusTotalFlags: [],
    urlsExtracted: 0,
    safeBrowsingFlags: [],
    quarantined: false,
  }

  try {
    const admin = createAdminClient()

    // Fetch deployment files
    const { data: files, error: filesError } = await admin
      .from('deployment_files')
      .select('sha256_hash, file_path, mime_type, storage_key')
      .eq('deployment_id', deploymentId)

    if (filesError) {
      throw new Error(`Failed to fetch deployment files: ${filesError.message}`)
    }

    if (!files || files.length === 0) {
      return result
    }

    result.fileHashes = files.length

    // Step 1: Check file hashes against VirusTotal
    const uniqueHashes = [...new Set(files.map((f) => f.sha256_hash))]
    const vtResults = await checkVirusTotal(uniqueHashes)
    result.virusTotalFlags = vtResults.filter((r) => r.isMalicious)

    // Step 2: Extract URLs from scannable files
    const allUrls: string[] = []
    const scannableFiles = files.filter((f) => SCANNABLE_MIMES.has(f.mime_type))

    for (const file of scannableFiles) {
      try {
        const { body } = await storage.get(DEPLOYMENT_BUCKET, file.storage_key)
        const content = await streamToString(body)

        if (
          file.mime_type === 'text/html' ||
          file.mime_type === 'application/xhtml+xml'
        ) {
          allUrls.push(...extractUrls(content))
        } else if (
          file.mime_type === 'text/javascript' ||
          file.mime_type === 'application/javascript'
        ) {
          allUrls.push(...extractUrlsFromJs(content))
        }
      } catch {
        // Skip files that fail to download — non-blocking
        console.warn(`Scanner: failed to download ${file.storage_key}`)
      }
    }

    const uniqueUrls = [...new Set(allUrls)]
    result.urlsExtracted = uniqueUrls.length

    // Step 3: Check extracted URLs against Safe Browsing
    if (uniqueUrls.length > 0) {
      // Safe Browsing supports up to 500 URLs per request
      const batchSize = 500
      for (let i = 0; i < uniqueUrls.length; i += batchSize) {
        const batch = uniqueUrls.slice(i, i + batchSize)
        const sbResults = await checkUrls(batch)
        const threats = sbResults.filter((r) => r.isThreat)
        result.safeBrowsingFlags.push(...threats)
      }
    }

    // Step 4: Quarantine if any threats detected
    const hasThreat =
      result.virusTotalFlags.length > 0 || result.safeBrowsingFlags.length > 0

    if (hasThreat) {
      const reasons: string[] = []
      if (result.virusTotalFlags.length > 0) {
        reasons.push(
          `VirusTotal flagged ${result.virusTotalFlags.length} file(s)`,
        )
      }
      if (result.safeBrowsingFlags.length > 0) {
        reasons.push(
          `Safe Browsing flagged ${result.safeBrowsingFlags.length} URL(s)`,
        )
      }

      await quarantineDeployment(deploymentId, reasons.join('; '))
      result.quarantined = true
    }

    // Update health status after scan
    await admin
      .from('deployments')
      .update({
        health_checked_at: result.scannedAt,
        ...(hasThreat
          ? {}
          : { health_status: 'healthy', health_details: null }),
      })
      .eq('id', deploymentId)

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Scanner error for deployment ${deploymentId}:`, message)
    result.error = message
    return result
  }
}

/**
 * Check a list of hashes against VirusTotal, with rate-limit handling.
 * VirusTotal free tier allows 4 requests/minute.
 */
async function checkVirusTotal(
  hashes: string[],
): Promise<VirusTotalResult[]> {
  const results: VirusTotalResult[] = []

  for (const hash of hashes) {
    try {
      const result = await vtScanFile(hash)
      results.push(result)
    } catch (err) {
      // Log but continue — don't let a single failure block the scan
      console.warn(`VirusTotal check failed for hash ${hash}:`, err)
    }

    // Rate limit: brief delay between requests
    if (hashes.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  return results
}

/**
 * Convert a Readable stream to a string.
 */
async function streamToString(
  stream: import('stream').Readable,
): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}
