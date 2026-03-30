/**
 * VirusTotal API v3 integration.
 *
 * Checks file hashes and URLs against VirusTotal's database.
 * Requires VIRUSTOTAL_API_KEY env var.
 */

export interface VirusTotalResult {
  /** The hash or URL that was checked */
  target: string
  isMalicious: boolean
  /** Number of engines that flagged the target */
  positives: number
  /** Total number of engines that scanned */
  total: number
  /** Permalink to the VirusTotal report, if available */
  permalink: string | null
}

interface VTAnalysisStats {
  malicious: number
  suspicious: number
  undetected: number
  harmless: number
  timeout: number
  [key: string]: number
}

interface VTFileResponse {
  data?: {
    attributes?: {
      last_analysis_stats?: VTAnalysisStats
    }
    links?: {
      self?: string
    }
  }
}

interface VTUrlAnalysis {
  data?: {
    id?: string
  }
}

interface VTUrlResult {
  data?: {
    attributes?: {
      stats?: VTAnalysisStats
    }
    links?: {
      self?: string
    }
  }
}

const API_BASE = 'https://www.virustotal.com/api/v3'

/** Malicious + suspicious threshold for flagging */
const MALICIOUS_THRESHOLD = 1

function getApiKey(): string {
  const key = process.env.VIRUSTOTAL_API_KEY
  if (!key) {
    throw new Error('VIRUSTOTAL_API_KEY environment variable is required')
  }
  return key
}

function buildHeaders(): Record<string, string> {
  return {
    'x-apikey': getApiKey(),
    'Content-Type': 'application/json',
  }
}

/**
 * Check a file hash (SHA-256, SHA-1, or MD5) against VirusTotal.
 */
export async function scanFile(hash: string): Promise<VirusTotalResult> {
  const response = await fetch(`${API_BASE}/files/${hash}`, {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (response.status === 404) {
    // File not in VirusTotal database — treat as clean
    return {
      target: hash,
      isMalicious: false,
      positives: 0,
      total: 0,
      permalink: null,
    }
  }

  if (!response.ok) {
    throw new Error(
      `VirusTotal API error: ${response.status} ${response.statusText}`,
    )
  }

  const data: VTFileResponse = await response.json()
  const stats = data.data?.attributes?.last_analysis_stats

  if (!stats) {
    return {
      target: hash,
      isMalicious: false,
      positives: 0,
      total: 0,
      permalink: data.data?.links?.self ?? null,
    }
  }

  const positives = (stats.malicious ?? 0) + (stats.suspicious ?? 0)
  const total = Object.values(stats).reduce((sum, v) => sum + v, 0)

  return {
    target: hash,
    isMalicious: positives >= MALICIOUS_THRESHOLD,
    positives,
    total,
    permalink: data.data?.links?.self ?? null,
  }
}

/**
 * Submit a URL to VirusTotal for scanning and retrieve the result.
 *
 * Note: VirusTotal URL scanning is async — we submit the URL, then
 * poll the analysis endpoint. For simplicity we do a single poll
 * after a short delay. In production, consider a queue-based approach.
 */
export async function scanUrl(url: string): Promise<VirusTotalResult> {
  // Submit URL for analysis
  const submitResponse = await fetch(`${API_BASE}/urls`, {
    method: 'POST',
    headers: {
      'x-apikey': getApiKey(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ url }),
  })

  if (!submitResponse.ok) {
    throw new Error(
      `VirusTotal URL submit error: ${submitResponse.status} ${submitResponse.statusText}`,
    )
  }

  const submitData: VTUrlAnalysis = await submitResponse.json()
  const analysisId = submitData.data?.id

  if (!analysisId) {
    throw new Error('VirusTotal did not return an analysis ID')
  }

  // Poll for result after a brief delay
  await new Promise((resolve) => setTimeout(resolve, 3000))

  const resultResponse = await fetch(`${API_BASE}/analyses/${analysisId}`, {
    method: 'GET',
    headers: buildHeaders(),
  })

  if (!resultResponse.ok) {
    throw new Error(
      `VirusTotal analysis error: ${resultResponse.status} ${resultResponse.statusText}`,
    )
  }

  const resultData: VTUrlResult = await resultResponse.json()
  const stats = resultData.data?.attributes?.stats

  if (!stats) {
    return {
      target: url,
      isMalicious: false,
      positives: 0,
      total: 0,
      permalink: resultData.data?.links?.self ?? null,
    }
  }

  const positives = (stats.malicious ?? 0) + (stats.suspicious ?? 0)
  const total = Object.values(stats).reduce((sum, v) => sum + v, 0)

  return {
    target: url,
    isMalicious: positives >= MALICIOUS_THRESHOLD,
    positives,
    total,
    permalink: resultData.data?.links?.self ?? null,
  }
}
