import { createAdminClient } from '@/lib/supabase/admin'
import { signPayload } from './sign'

export type WebhookEventType =
  | 'deployment.created'
  | 'deployment.updated'
  | 'deployment.deleted'
  | 'deployment.disabled'
  | 'deployment.reactivated'
  | 'test.ping'

export type WebhookEvent = {
  event: WebhookEventType
  slug: string
  url: string
  timestamp: string
  actor: string | null
  deployment: {
    id: string
    name: string
    version: number | null
  }
  content_hash?: string | null
}

/** Retry delays in milliseconds: 5s, 30s, 120s */
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000]
const MAX_ATTEMPTS = 3
const DELIVERY_TIMEOUT_MS = 10_000

/**
 * Dispatch a webhook event to a specific endpoint.
 * Retries up to 3 times with exponential backoff.
 * Logs each delivery attempt to the webhook_deliveries table.
 */
export async function dispatchWebhook(
  endpointId: string,
  event: WebhookEvent,
): Promise<void> {
  const supabase = createAdminClient()

  // Fetch endpoint details
  const { data: endpoint } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret, events, is_active')
    .eq('id', endpointId)
    .single()

  if (!endpoint || !endpoint.is_active) return

  // Check if endpoint subscribes to this event type
  const subscribedEvents = endpoint.events as string[]
  if (!subscribedEvents.includes(event.event) && event.event !== 'test.ping') {
    return
  }

  const payload = event
  const signature = signPayload(payload, endpoint.secret)
  const body = JSON.stringify(payload)

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const startTime = Date.now()
    let statusCode: number | null = null
    let responseBody: string | null = null
    let errorMessage: string | null = null

    try {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(),
        DELIVERY_TIMEOUT_MS,
      )

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DropSites-Signature': signature,
          'X-DropSites-Event': event.event,
          'X-DropSites-Delivery': `${endpointId}-${Date.now()}`,
          'User-Agent': 'DropSites-Webhook/1.0',
        },
        body,
        signal: controller.signal,
      })

      clearTimeout(timeout)
      statusCode = response.status
      responseBody = await response.text().catch(() => null)

      const responseTimeMs = Date.now() - startTime

      // Log delivery
      await supabase.from('webhook_deliveries').insert({
        endpoint_id: endpointId,
        event_type: event.event,
        status_code: statusCode,
        response_body: responseBody?.slice(0, 1024) ?? null,
        response_time_ms: responseTimeMs,
        attempt_number: attempt,
        success: statusCode >= 200 && statusCode < 300,
        error: null,
      })

      // Success — stop retrying
      if (statusCode >= 200 && statusCode < 300) return
    } catch (err) {
      errorMessage =
        err instanceof Error ? err.message : 'Unknown delivery error'
      const responseTimeMs = Date.now() - startTime

      await supabase.from('webhook_deliveries').insert({
        endpoint_id: endpointId,
        event_type: event.event,
        status_code: null,
        response_body: null,
        response_time_ms: responseTimeMs,
        attempt_number: attempt,
        success: false,
        error: errorMessage,
      })
    }

    // Wait before retry (unless this was the last attempt)
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]),
      )
    }
  }
}

/**
 * Dispatch a webhook event to all active endpoints in a workspace
 * that subscribe to the given event type.
 */
export async function dispatchWebhooksForWorkspace(
  workspaceId: string,
  event: WebhookEvent,
): Promise<void> {
  const supabase = createAdminClient()

  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  if (!endpoints?.length) return

  // Fire all dispatches in parallel (non-blocking)
  await Promise.allSettled(
    endpoints.map((ep) => dispatchWebhook(ep.id, event)),
  )
}
