import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'DMCA Policy — DropSites',
}

export default function DmcaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-8">
      <div>
        <h1 className="text-2xl font-medium">DMCA Takedown Policy</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: March 2026</p>
      </div>

      <div className="prose prose-sm text-muted-foreground space-y-6">
        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Overview</h2>
          <p>
            DropSites respects the intellectual property rights of others and expects users to do the same. In accordance with the Digital Millennium Copyright Act (DMCA), we will respond expeditiously to claims of copyright infringement committed using the DropSites platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Filing a DMCA takedown notice</h2>
          <p>
            If you believe that content hosted on DropSites infringes your copyright, please submit a DMCA takedown notice containing the following information:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>A physical or electronic signature of the copyright owner or a person authorized to act on their behalf.</li>
            <li>Identification of the copyrighted work claimed to have been infringed.</li>
            <li>Identification of the material that is claimed to be infringing, including its URL on DropSites.</li>
            <li>Your contact information, including your address, telephone number, and email address.</li>
            <li>A statement that you have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law.</li>
            <li>A statement, under penalty of perjury, that the information in the notification is accurate and that you are authorized to act on behalf of the copyright owner.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">How to submit</h2>
          <p>
            Send your DMCA takedown notice to our designated agent via email at{' '}
            <a href="mailto:dmca@dropsites.app" className="underline underline-offset-2 text-foreground">
              dmca@dropsites.app
            </a>{' '}
            or use our{' '}
            <Link href="/compromise" className="underline underline-offset-2 text-foreground">
              abuse report form
            </Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Counter-notification</h2>
          <p>
            If you believe that your content was removed in error, you may file a counter-notification with the same information requirements as above, including a statement under penalty of perjury that you have a good faith belief that the material was removed as a result of mistake or misidentification.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-foreground">Repeat infringers</h2>
          <p>
            DropSites will, in appropriate circumstances, terminate the accounts of users who are repeat infringers. An account that receives 3 or more confirmed DMCA takedowns may be automatically suspended.
          </p>
        </section>
      </div>
    </div>
  )
}
