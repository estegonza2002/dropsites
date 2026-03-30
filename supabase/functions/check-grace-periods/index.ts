// Deno Edge Function — runs daily via cron to downgrade workspaces
// whose payment grace period has expired.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FREE_PROFILE = 'free'

Deno.serve(async (req: Request) => {
  try {
    // Verify the request is authorized (cron or admin bearer token)
    const authHeader = req.headers.get('Authorization')
    const expectedToken = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!authHeader || !authHeader.includes(expectedToken ?? '')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const now = new Date().toISOString()

    // Find workspaces with expired grace periods
    const { data: expired, error: queryError } = await supabase
      .from('workspaces')
      .select('id')
      .not('grace_period_ends_at', 'is', null)
      .lt('grace_period_ends_at', now)

    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`)
    }

    let downgraded = 0

    if (expired && expired.length > 0) {
      for (const workspace of expired) {
        const { error: updateError } = await supabase
          .from('workspaces')
          .update({
            limit_profile: FREE_PROFILE,
            grace_period_ends_at: null,
            previous_limit_profile: null,
          })
          .eq('id', workspace.id)

        if (updateError) {
          console.error(
            `Failed to downgrade workspace ${workspace.id}: ${updateError.message}`
          )
        } else {
          downgraded++
        }
      }
    }

    return new Response(
      JSON.stringify({
        checked: expired?.length ?? 0,
        downgraded,
        timestamp: now,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
