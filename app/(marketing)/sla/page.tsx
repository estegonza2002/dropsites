import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Service Level Agreement | DropSites',
  description: 'DropSites SLA — 99.9% uptime commitment, measurement methodology, exclusions, and service credits.',
}

export default function SLAPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg, #fafafa)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--color-border, #e5e7eb)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-lg font-medium"
            style={{ color: 'var(--color-text-primary, #18181b)' }}
          >
            Drop<span style={{ color: 'var(--color-accent)' }}>Sites</span>
          </Link>
          <span
            className="text-sm"
            style={{ color: 'var(--color-text-secondary, #71717a)' }}
          >
            Service Level Agreement
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1
          className="mb-2 text-2xl font-medium"
          style={{ color: 'var(--color-text-primary, #18181b)' }}
        >
          Service Level Agreement
        </h1>
        <p
          className="mb-8 text-sm"
          style={{ color: 'var(--color-text-secondary, #71717a)' }}
        >
          Effective date: March 29, 2026 | Last updated: March 29, 2026
        </p>

        <div className="space-y-8">
          <Section title="1. Uptime Commitment">
            <p>
              DropSites commits to <strong>99.9% monthly uptime</strong> for all
              paid plans (Pro and Enterprise). This means no more than 43 minutes
              and 28 seconds of downtime per calendar month.
            </p>
            <p className="mt-2">
              Free-tier workspaces receive best-effort availability with no
              uptime guarantee or service credit eligibility.
            </p>
          </Section>

          <Section title="2. Uptime Measurement">
            <p>Uptime is measured as:</p>
            <div
              className="mt-3 rounded-lg p-4 font-mono text-sm"
              style={{
                background: 'var(--color-bg-card, #ffffff)',
                border: '1px solid var(--color-border, #e5e7eb)',
              }}
            >
              Uptime % = ((Total Minutes - Downtime Minutes) / Total Minutes) * 100
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>
                <strong>Total Minutes</strong> — all minutes in the calendar month.
              </li>
              <li>
                <strong>Downtime</strong> — any period of 5 or more consecutive
                minutes where the DropSites health endpoint
                (<code>/api/health</code>) returns a non-healthy status or is
                unreachable, as measured by our automated monitoring system
                checking every 60 seconds.
              </li>
              <li>
                Partial degradation (e.g., slow responses under 5 seconds) is
                not counted as downtime.
              </li>
            </ul>
          </Section>

          <Section title="3. Exclusions">
            <p>The following are excluded from downtime calculations:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>
                <strong>Scheduled maintenance</strong> — announced at least 72
                hours in advance via email and the status page. Limited to 4
                hours per month.
              </li>
              <li>
                <strong>Force majeure</strong> — natural disasters, government
                actions, wars, pandemics, or other events beyond reasonable
                control.
              </li>
              <li>
                <strong>Third-party failures</strong> — outages of upstream
                providers (Cloudflare, Supabase, DNS providers) that are outside
                DropSites infrastructure.
              </li>
              <li>
                <strong>Customer-caused issues</strong> — misconfiguration,
                exceeded rate limits, or abuse-triggered suspensions.
              </li>
              <li>
                <strong>Beta or preview features</strong> — features explicitly
                marked as beta or preview.
              </li>
            </ul>
          </Section>

          <Section title="4. Service Credits">
            <p>
              If monthly uptime falls below 99.9%, paid-plan customers are
              eligible for service credits applied to the next billing cycle:
            </p>
            <div className="mt-3 overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ color: 'var(--color-text-primary, #18181b)' }}
              >
                <thead>
                  <tr
                    className="border-b text-left"
                    style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
                  >
                    <th className="pb-2 pr-4 font-medium">Monthly Uptime</th>
                    <th className="pb-2 font-medium">Service Credit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    className="border-b"
                    style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
                  >
                    <td className="py-2 pr-4">99.0% - 99.9%</td>
                    <td className="py-2">10% of monthly fee</td>
                  </tr>
                  <tr
                    className="border-b"
                    style={{ borderColor: 'var(--color-border, #e5e7eb)' }}
                  >
                    <td className="py-2 pr-4">95.0% - 99.0%</td>
                    <td className="py-2">25% of monthly fee</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Below 95.0%</td>
                    <td className="py-2">50% of monthly fee</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="5. How to Request Credits">
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              <li>
                Submit a request within 30 days of the affected month via email
                to <code>support@dropsites.io</code>.
              </li>
              <li>
                Include your workspace ID, the affected dates, and a description
                of the impact.
              </li>
              <li>
                DropSites will verify the claim against monitoring records and
                respond within 5 business days.
              </li>
              <li>
                Approved credits are applied to the next invoice. Credits are
                non-refundable and non-transferable.
              </li>
            </ol>
          </Section>

          <Section title="6. Credit Limits">
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>
                Maximum service credit per month: <strong>50%</strong> of that
                month&apos;s subscription fee.
              </li>
              <li>Credits do not apply to one-time fees or overages.</li>
              <li>
                Credits cannot be exchanged for cash or carried over beyond one
                billing cycle.
              </li>
            </ul>
          </Section>

          <Section title="7. Monitoring and Transparency">
            <ul className="mt-3 list-disc space-y-1 pl-5">
              <li>
                Real-time system status is available at{' '}
                <a
                  href="/status"
                  style={{ color: 'var(--color-accent)' }}
                  className="underline"
                >
                  dropsites.io/status
                </a>.
              </li>
              <li>
                90-day uptime history is displayed on the status page.
              </li>
              <li>
                Automated health checks run every 60 seconds against all
                critical services (database, storage, application).
              </li>
              <li>
                Incident reports are published within 48 hours of resolution for
                any downtime exceeding 15 minutes.
              </li>
            </ul>
          </Section>

          <Section title="8. Changes to This SLA">
            <p>
              DropSites may update this SLA with 30 days&apos; advance notice.
              Changes will be communicated via email to workspace owners and
              posted on this page. Continued use of the service after the
              effective date constitutes acceptance of the updated terms.
            </p>
          </Section>
        </div>

        <div
          className="mt-12 border-t pt-6 text-center text-xs"
          style={{
            borderColor: 'var(--color-border, #e5e7eb)',
            color: 'var(--color-text-tertiary, #a1a1aa)',
          }}
        >
          Questions about our SLA? Contact{' '}
          <a
            href="mailto:support@dropsites.io"
            style={{ color: 'var(--color-accent)' }}
            className="underline"
          >
            support@dropsites.io
          </a>
        </div>
      </main>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2
        className="mb-3 text-lg font-medium"
        style={{ color: 'var(--color-text-primary, #18181b)' }}
      >
        {title}
      </h2>
      <div
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-text-secondary, #71717a)' }}
      >
        {children}
      </div>
    </section>
  )
}
