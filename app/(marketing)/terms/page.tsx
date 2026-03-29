import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — DropSites',
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-8">
      <div>
        <h1 className="text-2xl font-medium">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: March 2026</p>
      </div>

      <div className="prose prose-sm text-muted-foreground space-y-6">
        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">1. Acceptance of terms</h2>
          <p>
            By accessing or using DropSites ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">2. Description of service</h2>
          <p>
            DropSites is a static site publishing platform that allows users to upload and share static content via unique URLs. The Service supports HTML, JavaScript, CSS, PDF, and other browser-renderable content.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">3. User accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate information and update it as needed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">4. Acceptable use</h2>
          <p>
            Your use of the Service is subject to our{' '}
            <Link href="/acceptable-use" className="underline underline-offset-2 text-foreground">
              Acceptable Use Policy
            </Link>. Content that violates the AUP may be removed without notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">5. Content ownership</h2>
          <p>
            You retain ownership of all content you upload to DropSites. By uploading content, you grant DropSites a limited license to store, serve, and distribute that content as necessary to provide the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">6. DMCA and intellectual property</h2>
          <p>
            DropSites respects intellectual property rights and will respond to valid takedown notices. See our{' '}
            <Link href="/dmca" className="underline underline-offset-2 text-foreground">
              DMCA Policy
            </Link>{' '}
            for details.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">7. Termination</h2>
          <p>
            We may suspend or terminate your account at any time for violations of these Terms or the Acceptable Use Policy. You may delete your account at any time through your dashboard settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">8. Limitation of liability</h2>
          <p>
            DropSites is provided "as is" without warranty of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">9. Changes to terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the revised Terms. Material changes will be communicated via email or in-app notification.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">10. Contact</h2>
          <p>
            For questions about these Terms, contact us at{' '}
            <a href="mailto:legal@dropsites.app" className="underline underline-offset-2 text-foreground">
              legal@dropsites.app
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
