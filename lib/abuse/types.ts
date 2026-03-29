/**
 * Abuse report types and constants.
 */

export const ABUSE_REASONS = [
  'phishing',
  'malware',
  'csam',
  'copyright',
  'other',
] as const

export type AbuseReason = (typeof ABUSE_REASONS)[number]

export const ABUSE_REASON_LABELS: Record<AbuseReason, string> = {
  phishing: 'Phishing / Scam',
  malware: 'Malware / Virus',
  csam: 'Child exploitation material',
  copyright: 'Copyright infringement',
  other: 'Other violation',
}

export type AbuseReportStatus = 'pending' | 'confirmed' | 'dismissed'

export interface AbuseReport {
  id: string
  deployment_url: string
  deployment_slug: string | null
  reporter_email: string
  reason: AbuseReason
  description: string
  status: AbuseReportStatus
  resolved_by: string | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}
