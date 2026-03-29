/**
 * Trial Expiry — Edge Function (concept)
 *
 * Intended to run on a cron schedule (e.g., daily) via
 * Supabase Edge Functions or an external scheduler.
 *
 * Finds workspaces where the Pro trial has expired (trial_ends_at <= now
 * and limit_profile is still 'pro'), reverts them to 'free', and logs
 * the change in the audit log.
 *
 * Deployment: `supabase functions deploy trial-expiry`
 * Cron: configure via supabase dashboard or pg_cron extension
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'DropSites <notifications@dropsites.io>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://dropsites.io'

interface ExpiredWorkspace {
  id: string
  name: string
  owner_id: string
  trial_ends_at: string
}

async function sendTrialExpiredEmail(email: string, workspaceName: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[trial-expiry] No RESEND_API_KEY — skipping email to ${email}`)
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: email,
        subject: `Your Pro trial for "${workspaceName}" has ended`,
        html: `
          <p>Hi there,</p>
          <p>Your 14-day Pro trial for the workspace <strong>${workspaceName}</strong> has ended.
          Your workspace has been reverted to the Free plan.</p>
          <p>To continue using Pro features, upgrade your plan:</p>
          <p><a href="${APP_URL}/settings/billing">Upgrade to Pro</a></p>
          <p>Thanks,<br/>The DropSites Team</p>
        `,
        text: `Your 14-day Pro trial for "${workspaceName}" has ended. Your workspace has been reverted to the Free plan. Upgrade at ${APP_URL}/settings/billing`,
      }),
    })

    if (!res.ok) {
      console.error(`[trial-expiry] Failed to send email: HTTP ${res.status}`)
    }
  } catch (err) {
    console.error('[trial-expiry] Email send error:', err)
  }
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const now = new Date().toISOString()

    // Find workspaces with expired trials still on 'pro'
    const { data: expired, error: queryError } = await supabase
      .from('workspaces')
      .select('id, name, owner_id, trial_ends_at')
      .eq('limit_profile', 'pro')
      .not('trial_ends_at', 'is', null)
      .lte('trial_ends_at', now)
      .is('deleted_at', null)

    if (queryError) {
      console.error('Query error:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to query expired trials' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (!expired || expired.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const expiredIds = expired.map((w: ExpiredWorkspace) => w.id)

    // Revert all expired workspaces to free plan
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ limit_profile: 'free' })
      .in('id', expiredIds)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to revert expired trials' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Write audit log entries
    const auditEntries = expired.map((w: ExpiredWorkspace) => ({
      action: 'workspace.trial_expired',
      actor_id: null,
      target_id: w.id,
      target_type: 'workspace',
      details: { workspace_name: w.name, trial_ends_at: w.trial_ends_at },
    }))

    await supabase.from('audit_log').insert(auditEntries)

    // Send notification emails to workspace owners
    const ownerIds = [...new Set(expired.map((w: ExpiredWorkspace) => w.owner_id))]
    const { data: owners } = await supabase
      .from('users')
      .select('id, email')
      .in('id', ownerIds)

    const ownerEmails = new Map(
      (owners ?? []).map((o: { id: string; email: string }) => [o.id, o.email]),
    )

    for (const workspace of expired) {
      const email = ownerEmails.get(workspace.owner_id)
      if (email) {
        await sendTrialExpiredEmail(email, workspace.name)
      }
    }

    console.log(`Reverted ${expiredIds.length} expired trial(s) to free plan`)

    return new Response(
      JSON.stringify({ processed: expiredIds.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Trial expiry processor error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
