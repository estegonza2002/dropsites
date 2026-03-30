/**
 * Uptime Check — Edge Function
 *
 * Runs every 60 seconds via Supabase Edge Functions cron.
 * Checks the DropSites health endpoint and records the result
 * in the audit log for uptime tracking.
 *
 * Deployment: `supabase functions deploy uptime-check`
 * Cron: configure via supabase dashboard — schedule: "* * * * *"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://dropsites.io'
const HEALTH_ENDPOINT = `${APP_URL}/api/health`

/** Timeout for the health check request (10 seconds) */
const CHECK_TIMEOUT_MS = 10_000

interface HealthResponse {
  status: string
  services: {
    database: string
    storage: string
  }
}

Deno.serve(async (_req: Request) => {
  const checkedAt = new Date().toISOString()
  let healthy = false
  let responseTimeMs = 0
  let statusCode = 0
  let healthData: HealthResponse | null = null
  let errorMessage: string | null = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)

    const start = performance.now()
    const res = await fetch(HEALTH_ENDPOINT, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'DropSites-UptimeCheck/1.0' },
    })
    responseTimeMs = Math.round(performance.now() - start)
    clearTimeout(timeout)

    statusCode = res.status

    if (res.ok) {
      try {
        healthData = await res.json()
        // Consider healthy only if the overall status is 'healthy'
        healthy = healthData?.status === 'healthy'
      } catch {
        healthy = false
        errorMessage = 'Failed to parse health response JSON'
      }
    } else {
      healthy = false
      errorMessage = `Health endpoint returned HTTP ${statusCode}`
    }
  } catch (err) {
    healthy = false
    errorMessage = err instanceof Error ? err.message : String(err)
    if (errorMessage.includes('abort')) {
      errorMessage = `Health check timed out after ${CHECK_TIMEOUT_MS}ms`
    }
  }

  // Record the check result
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    await supabase.from('audit_log').insert({
      action: 'system.uptime_check',
      actor_id: null,
      target_id: null,
      target_type: 'system',
      details: {
        healthy,
        response_time_ms: responseTimeMs,
        status_code: statusCode,
        checked_at: checkedAt,
        services: healthData?.services ?? null,
        error: errorMessage,
      },
    })
  } catch (dbErr) {
    console.error('[uptime-check] Failed to record check:', dbErr)
  }

  const result = {
    healthy,
    response_time_ms: responseTimeMs,
    status_code: statusCode,
    checked_at: checkedAt,
    error: errorMessage,
  }

  console.log(
    `[uptime-check] ${healthy ? 'HEALTHY' : 'UNHEALTHY'} — ${responseTimeMs}ms — HTTP ${statusCode}`,
  )

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
