import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkLicence } from '@/lib/licence/checker'
import { apiSuccess, apiError } from '@/lib/api/response'

/**
 * GET /api/v1/admin/licence
 *
 * Returns the current licence status. Only accessible to admin users.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return apiError('Unauthorized', 'unauthorized', 401)
  }

  // Check admin status via user metadata
  const isAdmin = user.app_metadata?.role === 'admin'
  if (!isAdmin) {
    return apiError('Forbidden — admin access required', 'forbidden', 403)
  }

  // Refresh the licence check and return state
  const state = checkLicence()

  return apiSuccess({
    status: state.status,
    customer: state.customer,
    expiresAt: state.expiresAt?.toISOString() ?? null,
    features: state.features,
    deploymentLimit: state.deploymentLimit,
    lastChecked: state.lastChecked?.toISOString() ?? null,
  })
}
