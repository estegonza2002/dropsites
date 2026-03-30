/**
 * Async thumbnail generation queue.
 * Fire-and-forget: errors are logged but never thrown to the caller.
 */

import { generateThumbnail } from './generator'
import { storeThumbnail } from './storage'

export interface ThumbnailJob {
  deploymentId: string
  deploymentUrl: string
}

/** In-flight jobs, keyed by deploymentId — prevents duplicate work. */
const inflightJobs = new Set<string>()

/**
 * Enqueue a thumbnail generation job.
 * This is fire-and-forget — the caller does not await the result.
 * Duplicate jobs for the same deployment are de-duplicated.
 */
export function enqueueThumbnailGeneration(job: ThumbnailJob): void {
  if (inflightJobs.has(job.deploymentId)) return

  inflightJobs.add(job.deploymentId)

  // Fire and forget — intentionally not awaited
  void processThumbnailJob(job).finally(() => {
    inflightJobs.delete(job.deploymentId)
  })
}

async function processThumbnailJob(job: ThumbnailJob): Promise<void> {
  try {
    const thumbnail = await generateThumbnail(job.deploymentUrl)
    await storeThumbnail(job.deploymentId, thumbnail)
  } catch (error) {
    // Log but do not throw — thumbnails are best-effort
    console.error(
      `[thumbnails] Failed to generate thumbnail for ${job.deploymentId}:`,
      error instanceof Error ? error.message : error,
    )
  }
}

/**
 * Check if a thumbnail job is currently in flight.
 */
export function isJobInflight(deploymentId: string): boolean {
  return inflightJobs.has(deploymentId)
}

/**
 * Get the number of currently in-flight jobs.
 */
export function getInflightCount(): number {
  return inflightJobs.size
}
