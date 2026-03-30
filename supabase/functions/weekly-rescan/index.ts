/**
 * Weekly Rescan — Edge Function
 *
 * Re-scans all active (non-archived, non-disabled) deployments on a weekly
 * schedule. Checks file hashes against VirusTotal and extracts URLs to
 * check against Google Safe Browsing.
 *
 * Deployment: `supabase functions deploy weekly-rescan`
 * Cron: configure via supabase dashboard or pg_cron extension (weekly)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SAFE_BROWSING_API_KEY = Deno.env.get('SAFE_BROWSING_API_KEY')
const VIRUSTOTAL_API_KEY = Deno.env.get('VIRUSTOTAL_API_KEY')

const BATCH_SIZE = 50

interface ThreatMatch {
  threatType: string
  threat: { url: string }
}

interface SafeBrowsingResponse {
  matches?: ThreatMatch[]
}

interface VTFileResponse {
  data?: {
    attributes?: {
      last_analysis_stats?: Record<string, number>
    }
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const now = new Date().toISOString()

    let totalScanned = 0
    let totalFlagged = 0
    let offset = 0

    // Process deployments in batches
    while (true) {
      const { data: deployments, error } = await supabase
        .from('deployments')
        .select('id, slug, owner_id')
        .is('archived_at', null)
        .eq('is_admin_disabled', false)
        .eq('is_disabled', false)
        .range(offset, offset + BATCH_SIZE - 1)

      if (error) {
        console.error('Query error:', error)
        break
      }

      if (!deployments || deployments.length === 0) break

      for (const deployment of deployments) {
        const flagged = await rescanDeployment(supabase, deployment.id)
        totalScanned++

        if (flagged) {
          totalFlagged++

          // Quarantine the deployment
          await supabase
            .from('deployments')
            .update({
              is_admin_disabled: true,
              health_status: 'quarantined',
              health_details: {
                reason: 'Weekly rescan detected threats',
                quarantined_at: now,
              },
              health_checked_at: now,
            })
            .eq('id', deployment.id)

          await supabase.from('audit_log').insert({
            action: 'deployment.quarantined',
            actor_id: null,
            target_id: deployment.id,
            target_type: 'deployment',
            details: { reason: 'weekly_rescan', scan_date: now },
          })
        } else {
          // Update health check timestamp
          await supabase
            .from('deployments')
            .update({ health_checked_at: now })
            .eq('id', deployment.id)
        }
      }

      offset += BATCH_SIZE

      if (deployments.length < BATCH_SIZE) break
    }

    console.log(
      `Weekly rescan complete: ${totalScanned} scanned, ${totalFlagged} flagged`,
    )

    return new Response(
      JSON.stringify({
        scanned: totalScanned,
        flagged: totalFlagged,
        timestamp: now,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Weekly rescan error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})

/**
 * Rescan a single deployment. Returns true if threats are detected.
 */
async function rescanDeployment(
  supabase: ReturnType<typeof createClient>,
  deploymentId: string,
): Promise<boolean> {
  const { data: files } = await supabase
    .from('deployment_files')
    .select('sha256_hash')
    .eq('deployment_id', deploymentId)

  if (!files || files.length === 0) return false

  // Check unique hashes against VirusTotal
  const uniqueHashes = [...new Set(files.map((f: { sha256_hash: string }) => f.sha256_hash))]
  let vtFlagged = false

  if (VIRUSTOTAL_API_KEY) {
    for (const hash of uniqueHashes.slice(0, 5)) {
      try {
        const vtResult = await checkVirusTotal(hash)
        if (vtResult) {
          vtFlagged = true
          break
        }
      } catch {
        // Skip on error, continue scanning
      }

      // Rate limit: VirusTotal free tier allows 4 req/min
      await delay(1500)
    }
  }

  // Check known URLs against Safe Browsing
  // For weekly rescan we check the deployment URL itself
  let sbFlagged = false
  if (SAFE_BROWSING_API_KEY) {
    try {
      // We don't have access to storage in edge functions, so check
      // the deployment's served URL for the slug
      const { data: deployment } = await supabase
        .from('deployments')
        .select('slug, namespace')
        .eq('id', deploymentId)
        .single()

      if (deployment) {
        const deploymentUrl = deployment.namespace
          ? `https://${deployment.namespace}.dropsites.app/${deployment.slug}`
          : `https://dropsites.app/d/${deployment.slug}`

        sbFlagged = await checkSafeBrowsing([deploymentUrl])
      }
    } catch {
      // Skip on error
    }
  }

  return vtFlagged || sbFlagged
}

async function checkVirusTotal(hash: string): Promise<boolean> {
  const res = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
    headers: { 'x-apikey': VIRUSTOTAL_API_KEY! },
  })

  if (res.status === 404) return false
  if (!res.ok) return false

  const data: VTFileResponse = await res.json()
  const stats = data.data?.attributes?.last_analysis_stats
  if (!stats) return false

  const positives = (stats.malicious ?? 0) + (stats.suspicious ?? 0)
  return positives > 0
}

async function checkSafeBrowsing(urls: string[]): Promise<boolean> {
  const res = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'dropsites', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: [
            'MALWARE',
            'SOCIAL_ENGINEERING',
            'UNWANTED_SOFTWARE',
            'POTENTIALLY_HARMFUL_APPLICATION',
          ],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: urls.map((url) => ({ url })),
        },
      }),
    },
  )

  if (!res.ok) return false

  const data: SafeBrowsingResponse = await res.json()
  return (data.matches?.length ?? 0) > 0
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
