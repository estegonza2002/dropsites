import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Changelog — DropSites',
  description: 'See what is new in DropSites.',
}

interface ChangelogEntry {
  date: string
  version: string
  title: string
  items: string[]
}

const entries: ChangelogEntry[] = [
  {
    date: '2026-03-29',
    version: '1.0.0',
    title: 'Launch',
    items: [
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
    ],
  },
]

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-medium tracking-tight">Changelog</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        New features, improvements, and fixes.
      </p>

      <div className="mt-10 space-y-12">
        {entries.map((entry) => (
          <article key={entry.version} className="relative">
            <div className="flex items-baseline gap-3">
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
                {entry.version}
              </span>
              <time className="text-xs text-muted-foreground" dateTime={entry.date}>
                {new Date(entry.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
            </div>
            <h2 className="mt-2 text-lg font-medium">{entry.title}</h2>
            <ul className="mt-3 space-y-1.5">
              {entry.items.map((item, i) => (
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
