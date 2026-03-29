/**
 * Expiry Processor — Edge Function (concept)
 *
 * Intended to run on a cron schedule (e.g., every 5 minutes) via
 * Supabase Edge Functions or an external scheduler.
 *
 * Queries deployments where expires_at <= now() and archived_at IS NULL,
 * then sets archived_at = now() for each expired deployment.
 *
 * Deployment: `supabase functions deploy expiry-processor`
 * Cron: configure via supabase dashboard or pg_cron extension
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const now = new Date().toISOString()

    // Find all deployments that have expired but are not yet archived
    const { data: expired, error: queryError } = await supabase
      .from('deployments')
      .select('id, slug')
      .lte('expires_at', now)
      .is('archived_at', null)

    if (queryError) {
      console.error('Query error:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to query expired deployments' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!expired || expired.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const expiredIds = expired.map((d: { id: string }) => d.id)

    // Archive all expired deployments in one batch
    const { error: updateError } = await supabase
      .from('deployments')
      .update({ archived_at: now })
      .in('id', expiredIds)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to archive expired deployments' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Write audit log entries for each archived deployment
    const auditEntries = expired.map((d: { id: string; slug: string }) => ({
      action: 'deployment.expired',
      actor_id: null,
      target_id: d.id,
      target_type: 'deployment',
      details: { slug: d.slug, reason: 'link_expiry' },
    }))

    await supabase.from('audit_log').insert(auditEntries)

    console.log(`Archived ${expiredIds.length} expired deployment(s)`)

    return new Response(
      JSON.stringify({ processed: expiredIds.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Expiry processor error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
