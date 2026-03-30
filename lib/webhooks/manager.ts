import { createAdminClient } from '@/lib/supabase/admin'
import { generateSigningSecret } from './sign'
import { dispatchWebhook, type WebhookEventType } from './dispatch'

export type WebhookEndpoint = {
  id: string
  workspace_id: string
  url: string
  secret: string
  events: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type WebhookDelivery = {
  id: string
  endpoint_id: string
  event_type: string
  status_code: number | null
  response_body: string | null
  response_time_ms: number
  attempt_number: number
  success: boolean
  error: string | null
  created_at: string
}

export type TestResult = {
  success: boolean
  statusCode: number | null
  responseTimeMs: number
  error: string | null
}

const ALLOWED_EVENTS: WebhookEventType[] = [
  'deployment.created',
  'deployment.updated',
  'deployment.deleted',
  'deployment.disabled',
  'deployment.reactivated',
]

/**
 * Register a new webhook endpoint for a workspace.
 */
export async function registerEndpoint(
  workspaceId: string,
  url: string,
  events: string[],
  secret?: string,
): Promise<WebhookEndpoint> {
  // Validate URL
  try {
    const parsed = new URL(url)
    if (!['https:', 'http:'].includes(parsed.protocol)) {
      throw new Error('URL must use HTTPS or HTTP')
    }
  } catch {
    throw new Error('Invalid webhook URL')
  }

  // Validate events
  const validEvents = events.filter((e) =>
    ALLOWED_EVENTS.includes(e as WebhookEventType),
  )
  if (validEvents.length === 0) {
    throw new Error(
      'At least one valid event type is required. Valid types: ' +
        ALLOWED_EVENTS.join(', '),
    )
  }

  const signingSecret = secret ?? generateSigningSecret()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      workspace_id: workspaceId,
      url,
      secret: signingSecret,
      events: validEvents,
      is_active: true,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to register webhook: ${error?.message}`)
  }

  return data as WebhookEndpoint
}

/**
 * List all webhook endpoints for a workspace.
 */
export async function listEndpoints(
  workspaceId: string,
): Promise<WebhookEndpoint[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list webhooks: ${error.message}`)
  }

  return (data ?? []) as WebhookEndpoint[]
}

/**
 * Delete a webhook endpoint.
 */
export async function deleteEndpoint(endpointId: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', endpointId)

  if (error) {
    throw new Error(`Failed to delete webhook: ${error.message}`)
  }
}

/**
 * Get delivery log for an endpoint (last 50 entries).
 */
export async function getDeliveryLog(
  endpointId: string,
  limit = 50,
): Promise<WebhookDelivery[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('endpoint_id', endpointId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch delivery log: ${error.message}`)
  }

  return (data ?? []) as WebhookDelivery[]
}

/**
 * Send a test ping event to a webhook endpoint.
 */
export async function testEndpoint(
  endpointId: string,
): Promise<TestResult> {
  const supabase = createAdminClient()

  const { data: endpoint } = await supabase
    .from('webhook_endpoints')
    .select('id, workspace_id')
    .eq('id', endpointId)
    .single()

  if (!endpoint) {
    throw new Error('Webhook endpoint not found')
  }

  const testEvent = {
    event: 'test.ping' as const,
    slug: 'test-ping',
    url: 'https://example.com/test-ping',
    timestamp: new Date().toISOString(),
    actor: null,
    deployment: {
      id: 'test-00000000',
      name: 'Test Ping',
      version: null,
    },
  }

  const startTime = Date.now()

  try {
    await dispatchWebhook(endpointId, testEvent)
    const responseTimeMs = Date.now() - startTime

    // Check the most recent delivery for this endpoint
    const { data: lastDelivery } = await supabase
      .from('webhook_deliveries')
      .select('status_code, success, error')
      .eq('endpoint_id', endpointId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return {
      success: lastDelivery?.success ?? false,
      statusCode: lastDelivery?.status_code ?? null,
      responseTimeMs,
      error: lastDelivery?.error ?? null,
    }
  } catch (err) {
    return {
      success: false,
      statusCode: null,
      responseTimeMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
