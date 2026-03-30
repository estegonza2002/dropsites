/**
 * TLS certificate provisioning stub.
 *
 * In production, this would integrate with Let's Encrypt (ACME protocol)
 * to provision and renew TLS certificates for custom domains.
 * Currently implemented as a stub that records intent in the database.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type TlsProvisionResult = {
  domain: string
  status: 'provisioning' | 'active' | 'error'
  expiresAt: Date | null
}

/**
 * Provision a TLS certificate for a verified custom domain.
 * Stub: In production, this initiates an ACME challenge with Let's Encrypt.
 */
export async function provisionCertificate(
  domainId: string,
): Promise<TlsProvisionResult> {
  const admin = createAdminClient()

  const { data: domain, error } = await admin
    .from('custom_domains')
    .select('domain, status')
    .eq('id', domainId)
    .single()

  if (error || !domain) {
    throw new Error('Domain not found')
  }

  if (domain.status !== 'verified') {
    throw new Error('Domain must be verified before provisioning TLS')
  }

  // Stub: mark TLS as provisioning
  // In production, this would:
  // 1. Create an ACME order
  // 2. Respond to HTTP-01 or DNS-01 challenge
  // 3. Download the certificate
  // 4. Store cert + key in the custom_domains table
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 90) // Let's Encrypt certs are 90 days

  await admin
    .from('custom_domains')
    .update({
      tls_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', domainId)

  return {
    domain: domain.domain,
    status: 'provisioning',
    expiresAt,
  }
}

/**
 * Renew an expiring TLS certificate.
 * Stub: In production, this re-runs the ACME flow.
 */
export async function renewCertificate(
  domainId: string,
): Promise<void> {
  await provisionCertificate(domainId)
}
