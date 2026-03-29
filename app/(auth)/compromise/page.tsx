'use client'

import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ABUSE_REASONS, ABUSE_REASON_LABELS, type AbuseReason } from '@/lib/abuse/types'

export default function CompromisePage() {
  const searchParams = useSearchParams()
  const prefillUrl = searchParams.get('url') ?? ''

  const [deploymentUrl, setDeploymentUrl] = useState(prefillUrl)
  const [reporterEmail, setReporterEmail] = useState('')
  const [reason, setReason] = useState<AbuseReason>('phishing')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/v1/abuse/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deployment_url: deploymentUrl,
          reporter_email: reporterEmail,
          reason,
          description,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to submit report' }))
        setError(data.error ?? 'Failed to submit report')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Report received</CardTitle>
          <CardDescription>
            Thank you for your report. Our team will review it and take action if necessary. You may receive a follow-up at the email address you provided.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Report abuse</CardTitle>
        <CardDescription>
          If you believe a deployment on DropSites violates our{' '}
          <a href="/acceptable-use" className="underline underline-offset-2">
            Acceptable Use Policy
          </a>{' '}
          or is hosting harmful content, please let us know.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="deployment-url">Deployment URL</Label>
            <Input
              id="deployment-url"
              type="text"
              required
              placeholder="e.g. my-site or https://dropsites.app/p/my-site"
              value={deploymentUrl}
              onChange={(e) => setDeploymentUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reporter-email">Your email</Label>
            <Input
              id="reporter-email"
              type="email"
              required
              placeholder="you@example.com"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <select
              id="reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value as AbuseReason)}
              className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {ABUSE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {ABUSE_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              required
              rows={4}
              placeholder="Please describe the issue in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting...' : 'Submit report'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
