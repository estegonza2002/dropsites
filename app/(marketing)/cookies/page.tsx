import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy — DropSites',
}

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-8">
      <div>
        <h1 className="text-2xl font-medium">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: March 2026</p>
      </div>

      <div className="prose prose-sm text-muted-foreground space-y-6">
        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">1. What are cookies</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website.
            They help the site remember your preferences and improve your experience.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">2. Cookies we use</h2>
          <p>DropSites uses a minimal set of cookies, all essential for core functionality:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Authentication cookies</strong> — Session tokens
              managed by Supabase Auth to keep you signed in. These are strictly necessary and
              cannot be disabled.
            </li>
            <li>
              <strong className="text-foreground">Workspace preference</strong> — A cookie
              (<code className="text-xs bg-muted px-1 py-0.5 rounded">ds-workspace</code>) that
              remembers your last-selected workspace. Essential for navigation.
            </li>
            <li>
              <strong className="text-foreground">Password-protected site access</strong> — Per-deployment
              session tokens (<code className="text-xs bg-muted px-1 py-0.5 rounded">ds-auth-*</code>)
              that verify you have entered the correct password for a protected deployment.
            </li>
            <li>
              <strong className="text-foreground">Cookie consent</strong> — A localStorage entry
              (<code className="text-xs bg-muted px-1 py-0.5 rounded">ds-cookie-consent</code>) that
              records whether you accepted or declined cookies.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">3. Third-party cookies</h2>
          <p>
            DropSites does not use any third-party tracking cookies, advertising cookies, or
            analytics cookies. We do not share cookie data with third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">4. Managing cookies</h2>
          <p>
            You can manage cookies through your browser settings. Note that disabling essential
            cookies may prevent you from signing in or using certain features. You can also
            use the cookie consent banner to accept or decline non-essential cookies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">5. Changes to this policy</h2>
          <p>
            We may update this Cookie Policy from time to time. Changes will be posted on this page
            with an updated date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">6. Contact</h2>
          <p>
            For questions about this policy, contact us at{' '}
            <a href="mailto:legal@dropsites.app" className="underline underline-offset-2 text-foreground">
              legal@dropsites.app
            </a>{' '}
            or see our{' '}
            <Link href="/terms" className="underline underline-offset-2 text-foreground">
              Terms of Service
            </Link>.
          </p>
        </section>
      </div>
    </div>
  )
}
