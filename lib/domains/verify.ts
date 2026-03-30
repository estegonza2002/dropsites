import { createAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

const DROPSITES_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'dropsites.app'
const CNAME_TARGET = process.env.CNAME_TARGET ?? `proxy.${DROPSITES_DOMAIN}`

/**
 * Reserved domains that cannot be used as custom domains.
 */
const RESERVED_DOMAINS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
])

const RESERVED_SUFFIXES = [
  `.${DROPSITES_DOMAIN}`,
  '.localhost',
  '.local',
  '.internal',
  '.example.com',
  '.test',
  '.invalid',
]

function isReservedDomain(domain: string): boolean {
  const lower = domain.toLowerCase()
  if (RESERVED_DOMAINS.has(lower)) return true
  for (const suffix of RESERVED_SUFFIXES) {
    if (lower.endsWith(suffix)) return true
  }
  if (lower === DROPSITES_DOMAIN) return true
  return false
}

function isValidDomain(domain: string): boolean {
  // Basic domain validation
  if (!domain || domain.length > 253) return false
  const labels = domain.split('.')
  if (labels.length < 2) return false
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) return false
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label)) return false
  }
  return true
}

/**
 * Initiate domain verification for a deployment.
 * Returns the CNAME target and TXT verification record value.
 */
export async function initiateDomainVerification(
  domain: string,
  deploymentId: string,
  workspaceId: string,
): Promise<{ domainId: string; cnameTarget: string; txtRecord: string }> {
  const normalizedDomain = domain.toLowerCase().trim()

  if (!isValidDomain(normalizedDomain)) {
    throw new DomainError('Invalid domain format', 400)
  }

  if (isReservedDomain(normalizedDomain)) {
    throw new DomainError('This domain cannot be used as a custom domain', 400)
  }

  const admin = createAdminClient()

  // Check if domain is already registered
  const { data: existing } = await admin
    .from('custom_domains')
    .select('id')
    .eq('domain', normalizedDomain)
    .limit(1)
    .maybeSingle()

  if (existing) {
    throw new DomainError('Domain is already registered', 409)
  }

  // Generate verification TXT record value
  const txtRecord = `dropsites-verify=${randomBytes(16).toString('hex')}`

  const { data: domainRecord, error } = await admin
    .from('custom_domains')
    .insert({
      deployment_id: deploymentId,
      workspace_id: workspaceId,
      domain: normalizedDomain,
      cname_target: CNAME_TARGET,
      txt_record: txtRecord,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !domainRecord) {
    throw new DomainError(`Failed to create domain record: ${error?.message}`, 500)
  }

  return {
    domainId: domainRecord.id,
    cnameTarget: CNAME_TARGET,
    txtRecord,
  }
}

/**
 * Check domain verification status by performing DNS lookups.
 * In production this would use actual DNS resolution; here we provide
 * the verification logic structure.
 */
export async function checkDomainVerification(
  domainId: string,
): Promise<'pending' | 'verified' | 'error'> {
  const admin = createAdminClient()

  const { data: domainRecord, error } = await admin
    .from('custom_domains')
    .select('domain, cname_target, txt_record, status')
    .eq('id', domainId)
    .single()

  if (error || !domainRecord) {
    throw new DomainError('Domain not found', 404)
  }

  // In production, perform DNS CNAME + TXT lookup here:
  // 1. dns.resolveCname(domain) should point to cname_target
  // 2. dns.resolveTxt(`_dropsites.${domain}`) should contain txt_record
  //
  // For now, we check if the domain record is already verified.
  // The actual DNS check would be:
  try {
    const dns = await import('dns')
    const { promisify } = await import('util')
    const resolveCname = promisify(dns.resolveCname)
    const resolveTxt = promisify(dns.resolveTxt)

    let cnameVerified = false
    let txtVerified = false

    try {
      const cnameRecords = await resolveCname(domainRecord.domain)
      cnameVerified = cnameRecords.some(
        (r) => r.toLowerCase() === domainRecord.cname_target.toLowerCase(),
      )
    } catch {
      // CNAME lookup failed — not yet configured
    }

    try {
      const txtRecords = await resolveTxt(`_dropsites.${domainRecord.domain}`)
      const flatTxt = txtRecords.flat()
      txtVerified = flatTxt.some((r) => r === domainRecord.txt_record)
    } catch {
      // TXT lookup failed — not yet configured
    }

    if (cnameVerified && txtVerified) {
      await admin
        .from('custom_domains')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId)
      return 'verified'
    }

    const errors: string[] = []
    if (!cnameVerified) errors.push('CNAME record not found or incorrect')
    if (!txtVerified) errors.push('TXT verification record not found')

    await admin
      .from('custom_domains')
      .update({
        status: 'pending',
        error_message: errors.join('; '),
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainId)

    return 'pending'
  } catch {
    await admin
      .from('custom_domains')
      .update({
        status: 'error',
        error_message: 'DNS verification check failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', domainId)
    return 'error'
  }
}

/**
 * Resolve a custom domain to its deployment ID.
 * Used by the serving middleware.
 */
export async function resolveCustomDomain(
  hostname: string,
): Promise<{ deploymentId: string; domain: string } | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('custom_domains')
    .select('deployment_id, domain')
    .eq('domain', hostname.toLowerCase())
    .eq('status', 'verified')
    .single()

  if (error || !data) return null
  return { deploymentId: data.deployment_id, domain: data.domain }
}

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}
