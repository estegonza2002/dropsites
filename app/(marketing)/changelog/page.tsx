import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Changelog — DropSites',
  description: 'See what is new in DropSites.',
}

// Revalidate every hour so deploys refresh the page without a full rebuild
export const revalidate = 3600

interface ChangelogEntry {
  id: string
  title: string
  content: string
  is_breaking: boolean
  published_at: string
}

async function getChangelogEntries(): Promise<ChangelogEntry[]> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('changelog_entries')
      .select('id, title, content, is_breaking, published_at')
      .order('published_at', { ascending: false })
      .limit(50)

    if (error || !data) return getFallbackEntries()
    return data.length > 0 ? data : getFallbackEntries()
  } catch {
    return getFallbackEntries()
  }
}

function getFallbackEntries(): ChangelogEntry[] {
  return [
    {
      id: 'v1.0.0-ga',
      title: 'v1.0 — General Availability',
      content: [
        'DropSites is now generally available.',
        'MCP connector (@dropsites/mcp) — deploy static sites directly from Claude Desktop and claude.ai.',
        'New tools: deploy_site, list_sites, delete_site, update_site.',
        'Closed beta feedback system and structured invite flow.',
        'JavaScript SDK (@dropsites/sdk) v1.0.0 published on npm.',
        'Announcement blog post at /blog/mcp-launch.',
        'Full v1.0 changelog: /docs/changelog/v1.0.',
      ].join('\n'),
      is_breaking: false,
      published_at: '2026-03-30T00:00:00Z',
    },
    {
      id: 'v1.0.0',
      title: 'Launch',
      content: [
        'Initial public release of DropSites.',
        'Upload HTML, ZIP, JS, PDF and any static format.',
        'Dashboard with deployment table, search, sort, and filtering.',
        'Workspace model with roles (owner, publisher, viewer) and invitations.',
        'Password protection with brute-force rate limiting.',
        'In-browser code editor with file tree and conflict detection.',
        'Auto-navigation widget for multi-page deployments.',
        'Share sheet with QR code, embed snippet, and email sharing.',
        'Link expiry with one-click reactivation.',
        'Analytics: views, unique visitors, referrers, time-series charts.',
        'Bandwidth tracking with quota alerts and CSV export.',
        'Audit log for all key operations.',
        '14-day Pro trial for new accounts.',
        'OIDC SSO configuration for Team and Enterprise plans.',
        'Self-hosted deployment support with Docker and runbook.',
        'Full REST API with rate limiting.',
      ].join('\n'),
      is_breaking: false,
      published_at: '2026-03-29T00:00:00Z',
    },
  ]
}

export default async function ChangelogPage() {
  const entries = await getChangelogEntries()

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-medium tracking-tight">Changelog</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        New features, improvements, and fixes.
      </p>

      <div className="mt-10 space-y-12">
        {entries.map((entry) => (
          <article key={entry.id} className="relative">
            <div className="flex items-baseline gap-3 flex-wrap">
              <time className="text-xs text-muted-foreground" dateTime={entry.published_at}>
                {new Date(entry.published_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              {entry.is_breaking && (
                <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  Breaking
                </span>
              )}
            </div>
            <h2 className="mt-2 text-lg font-medium">{entry.title}</h2>
            <ul className="mt-3 space-y-1.5">
              {entry.content.split('\n').filter(Boolean).map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
