'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, X, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const STORAGE_KEY = 'dropsites:trial-prompt-dismissed'
const TRIAL_PROMPT_DAY = 7

interface TrialPromptProps {
  /** Number of days since the trial started (0-indexed: day 0 = trial start) */
  trialDayNumber: number
  /** Whether the user is currently on a trial */
  isTrialActive: boolean
}

/**
 * Day-7 in-product trial prompt.
 * Shown once when the user reaches day 7 of their trial.
 * Dismissible and persisted via localStorage.
 */
export function TrialPrompt({ trialDayNumber, isTrialActive }: TrialPromptProps) {
  const [dismissed, setDismissed] = useState(true) // default to hidden for SSR
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      setDismissed(stored === 'true')
    } catch {
      setDismissed(false)
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // localStorage unavailable
    }
  }

  // Only show on or after trial day 7, while trial is active, and not dismissed
  if (!mounted || dismissed || !isTrialActive || trialDayNumber < TRIAL_PROMPT_DAY) {
    return null
  }

  return (
    <Card
      className="relative overflow-hidden"
      role="region"
      aria-label="Trial upgrade prompt"
    >
      {/* Accent stripe */}
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: 'var(--color-accent)' }}
        aria-hidden="true"
      />

      <CardContent className="flex flex-col gap-4 py-4 pl-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              color: 'var(--color-accent)',
            }}
          >
            <Sparkles size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Enjoying DropSites Pro?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your trial is halfway through. Upgrade now to keep all Pro features,
              including unlimited deployments and team workspaces.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/settings/billing">
            <Button size="sm" className="h-8 text-xs">
              Upgrade now
              <ArrowUpRight size={14} strokeWidth={1.5} className="ml-1" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={dismiss}
            aria-label="Dismiss upgrade prompt"
          >
            <X size={16} strokeWidth={1.5} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
