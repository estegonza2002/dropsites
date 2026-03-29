import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — DropSites',
}

export default function AcceptableUsePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-8">
      <div>
        <h1 className="text-2xl font-medium">Acceptable Use Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: March 2026</p>
      </div>

      <div className="prose prose-sm text-muted-foreground space-y-6">
        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Overview</h2>
          <p>
            This Acceptable Use Policy ("AUP") governs the use of DropSites and all content published through the platform. By using DropSites, you agree to comply with this policy. Violations may result in content removal, account suspension, or termination.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Prohibited content</h2>
          <p>You may not use DropSites to host, distribute, or link to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Child sexual abuse material (CSAM) or any content that exploits minors</li>
            <li>Malware, viruses, ransomware, or other malicious software</li>
            <li>Phishing pages, credential harvesting, or social engineering attacks</li>
            <li>Content that infringes on the intellectual property rights of others</li>
            <li>Content that promotes violence, terrorism, or incites harm against individuals or groups</li>
            <li>Non-consensual intimate imagery</li>
            <li>Fraudulent or deceptive content designed to scam users</li>
            <li>Content that violates applicable laws or regulations</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Prohibited activities</h2>
          <p>You may not use DropSites to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Circumvent rate limits, quotas, or other platform restrictions</li>
            <li>Abuse the platform for spam or unsolicited bulk content</li>
            <li>Attempt to access other users' accounts or data without authorization</li>
            <li>Use automated tools to scrape, crawl, or extract data from the platform in a disruptive manner</li>
            <li>Interfere with the operation of the Service or other users' enjoyment of it</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Enforcement</h2>
          <p>
            DropSites reserves the right to review content and take action against violations of this policy, including but not limited to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Removing or disabling access to content</li>
            <li>Suspending or terminating user accounts</li>
            <li>Blocking content hashes to prevent re-upload of prohibited material</li>
            <li>Reporting illegal content to the appropriate authorities</li>
          </ul>
          <p>
            Accounts that receive 3 or more confirmed abuse takedowns will be automatically suspended.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Reporting violations</h2>
          <p>
            If you encounter content on DropSites that violates this policy, please report it using our{' '}
            <Link href="/compromise" className="underline underline-offset-2 text-foreground">
              abuse report form
            </Link>. For DMCA copyright claims, see our{' '}
            <Link href="/dmca" className="underline underline-offset-2 text-foreground">
              DMCA Policy
            </Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Contact</h2>
          <p>
            For questions about this policy, contact us at{' '}
            <a href="mailto:abuse@dropsites.app" className="underline underline-offset-2 text-foreground">
              abuse@dropsites.app
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
