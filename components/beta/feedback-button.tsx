'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageSquare } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type Category = 'bug' | 'ux' | 'missing-feature' | 'positive'
type Severity = 'p0' | 'p1' | 'p2' | 'p3'

export function BetaFeedbackButton() {
  const [isBeta, setIsBeta] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [category, setCategory] = useState<Category | ''>('')
  const [severity, setSeverity] = useState<Severity | ''>('')
  const [body, setBody] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/v1/beta/status')
      .then((r) => r.json())
      .then((json: { isBeta?: boolean }) => setIsBeta(Boolean(json.isBeta)))
      .catch(() => {
        /* silently ignore */
      })
  }, [])

  useEffect(() => {
    if (dialogOpen) {
      setPageUrl(window.location.href)
    }
  }, [dialogOpen])

  if (!isBeta) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category || !body.trim()) return

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        category,
        body: body.trim(),
        page_url: pageUrl || undefined,
      }
      if (category === 'bug' && severity) {
        payload.severity = severity
      }

      const res = await fetch('/api/v1/beta/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success('Thanks for your feedback!')
        setDialogOpen(false)
        setCategory('')
        setSeverity('')
        setBody('')
      } else {
        const json = await res.json() as { error?: string }
        toast.error(json.error ?? 'Failed to submit feedback')
      }
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-6 right-6 z-50">
        <Tooltip>
          <TooltipTrigger>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-sm text-white"
              style={{ background: 'var(--color-accent)' }}
              onClick={() => setDialogOpen(true)}
            >
              <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Give feedback</TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share your feedback</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="feedback-category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as Category)}
              >
                <SelectTrigger id="feedback-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="ux">UX / Design</SelectItem>
                  <SelectItem value="missing-feature">Missing feature</SelectItem>
                  <SelectItem value="positive">Positive feedback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {category === 'bug' && (
              <div className="space-y-1.5">
                <Label htmlFor="feedback-severity">Severity</Label>
                <Select
                  value={severity}
                  onValueChange={(v) => setSeverity(v as Severity)}
                >
                  <SelectTrigger id="feedback-severity">
                    <SelectValue placeholder="How bad is it?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p0">P0 — Blocking, can&apos;t use the app</SelectItem>
                    <SelectItem value="p1">P1 — Major feature broken</SelectItem>
                    <SelectItem value="p2">P2 — Degraded experience</SelectItem>
                    <SelectItem value="p3">P3 — Minor / cosmetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="feedback-body">Description</Label>
              <Textarea
                id="feedback-body"
                placeholder="Tell us what's on your mind…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !category || !body.trim()}
                className="text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
