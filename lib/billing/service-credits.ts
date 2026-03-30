import { createAdminClient } from '@/lib/supabase/admin'
import { calculateMonthlyUptime } from '@/lib/health/uptime-tracker'

/**
 * Service credit tiers based on monthly uptime percentage.
 * See SLA page for full details.
 */
const CREDIT_TIERS = [
  { minUptime: 99.0, maxUptime: 99.9, creditPercent: 10 },
  { minUptime: 95.0, maxUptime: 99.0, creditPercent: 25 },
  { minUptime: 0, maxUptime: 95.0, creditPercent: 50 },
] as const

/** SLA uptime target — 99.9% */
const SLA_TARGET = 99.9

/** Maximum credit as a percentage of monthly fee */
const MAX_CREDIT_PERCENT = 50

export interface CreditAmount {
  eligible: boolean
  uptimePercent: number
  creditPercent: number
  creditAmount: number
  monthlyFee: number
  reason: string
}

/**
 * Calculates the service credit a workspace is eligible for based on
 * the measured uptime for a given month.
 *
 * @param workspaceId - The workspace to check
 * @param month - The month to evaluate, in YYYY-MM format
 * @returns Credit calculation details
 */
export async function calculateServiceCredit(
  workspaceId: string,
  month: string,
): Promise<CreditAmount> {
  // Validate month format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return {
      eligible: false,
      uptimePercent: 0,
      creditPercent: 0,
      creditAmount: 0,
      monthlyFee: 0,
      reason: 'Invalid month format. Expected YYYY-MM.',
    }
  }

  const admin = createAdminClient()

  // Check workspace and plan
  const { data: workspace, error } = await admin
    .from('workspaces')
    .select('id, limit_profile, stripe_subscription_id')
    .eq('id', workspaceId)
    .single()

  if (error || !workspace) {
    return {
      eligible: false,
      uptimePercent: 0,
      creditPercent: 0,
      creditAmount: 0,
      monthlyFee: 0,
      reason: 'Workspace not found.',
    }
  }

  // Free tier is not eligible for service credits
  if (workspace.limit_profile === 'free') {
    return {
      eligible: false,
      uptimePercent: 0,
      creditPercent: 0,
      creditAmount: 0,
      monthlyFee: 0,
      reason: 'Free-tier workspaces are not eligible for SLA credits.',
    }
  }

  // Get monthly uptime
  const uptimePercent = await calculateMonthlyUptime(month)

  // If uptime meets SLA target, no credit
  if (uptimePercent >= SLA_TARGET) {
    return {
      eligible: false,
      uptimePercent,
      creditPercent: 0,
      creditAmount: 0,
      monthlyFee: 0,
      reason: `Uptime ${uptimePercent.toFixed(3)}% meets SLA target of ${SLA_TARGET}%.`,
    }
  }

  // Determine credit tier
  let creditPercent = 0
  for (const tier of CREDIT_TIERS) {
    if (uptimePercent >= tier.minUptime && uptimePercent < tier.maxUptime) {
      creditPercent = tier.creditPercent
      break
    }
  }

  // Cap at maximum
  creditPercent = Math.min(creditPercent, MAX_CREDIT_PERCENT)

  // Determine monthly fee from plan
  const monthlyFee = getMonthlyFeeForProfile(workspace.limit_profile)
  const creditAmount = Math.round((monthlyFee * creditPercent) / 100)

  return {
    eligible: true,
    uptimePercent,
    creditPercent,
    creditAmount,
    monthlyFee,
    reason: `Uptime ${uptimePercent.toFixed(3)}% below SLA target. ${creditPercent}% credit applies.`,
  }
}

/**
 * Applies a service credit to a workspace by recording it in the audit log
 * and marking it for the next billing cycle.
 *
 * @param workspaceId - The workspace receiving the credit
 * @param amount - The credit amount in cents
 */
export async function applyServiceCredit(
  workspaceId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return

  const admin = createAdminClient()

  // Record the credit in the audit log
  await admin.from('audit_log').insert({
    action: 'billing.service_credit_applied',
    actor_id: null,
    target_id: workspaceId,
    target_type: 'workspace',
    details: {
      credit_amount_cents: amount,
      applied_at: new Date().toISOString(),
    },
  })

  // In a production system, this would create a Stripe credit note or
  // coupon. For now, we record the credit for manual processing.
  // TODO: Integrate with Stripe credit notes when billing is fully wired
}

/**
 * Returns the monthly fee in cents for a given limit profile.
 * These values must stay in sync with the pricing page and Stripe products.
 */
function getMonthlyFeeForProfile(profile: string): number {
  switch (profile) {
    case 'pro':
      return 1900 // $19/month
    case 'team':
      return 4900 // $49/month
    default:
      return 0
  }
}
