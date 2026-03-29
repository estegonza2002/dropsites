'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Upload, Share2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STORAGE_KEY = 'dropsites:onboarding'

interface OnboardingState {
  dismissed: boolean
  uploaded: boolean
  shared: boolean
  invited: boolean
}

const defaultState: OnboardingState = {
  dismissed: false,
  uploaded: false,
  shared: false,
  invited: false,
}

function loadState(): OnboardingState {
  if (typeof window === 'undefined') return defaultState
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultState
    return { ...defaultState, ...(JSON.parse(stored) as Partial<OnboardingState>) }
  } catch {
    return defaultState
  }
}

function saveState(state: OnboardingState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage may be unavailable
  }
}

interface Step {
  key: keyof Omit<OnboardingState, 'dismissed'>
  label: string
  description: string
  icon: typeof Upload
}

const steps: Step[] = [
  {
    key: 'uploaded',
    label: 'Upload your first site',
    description: 'Drag and drop an HTML file or ZIP archive to publish it.',
    icon: Upload,
  },
  {
    key: 'shared',
    label: 'Share a link',
    description: 'Copy the URL or use the share sheet to send it to someone.',
    icon: Share2,
  },
  {
    key: 'invited',
    label: 'Invite a teammate',
    description: 'Add a team member to your workspace for collaboration.',
    icon: Users,
  },
]

interface OnboardingChecklistProps {
  /** Externally mark a step as complete (e.g. after a successful upload). */
  completedSteps?: Partial<Omit<OnboardingState, 'dismissed'>>
}

export function OnboardingChecklist({ completedSteps }: OnboardingChecklistProps) {
  const [state, setState] = useState<OnboardingState>(defaultState)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const loaded = loadState()
    setState(loaded)
    setMounted(true)
  }, [])

  // Merge externally completed steps
  useEffect(() => {
    if (!mounted || !completedSteps) return
    setState((prev) => {
      const next = { ...prev, ...completedSteps }
      if (JSON.stringify(next) !== JSON.stringify(prev)) {
        saveState(next)
        return next
      }
      return prev
    })
  }, [mounted, completedSteps])

  const dismiss = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, dismissed: true }
      saveState(next)
      return next
    })
  }, [])

  const markComplete = useCallback((key: keyof Omit<OnboardingState, 'dismissed'>) => {
    setState((prev) => {
      const next = { ...prev, [key]: true }
      saveState(next)
      return next
    })
  }, [])

  // Don't render during SSR or if dismissed
  if (!mounted || state.dismissed) return null

  const completedCount = steps.filter((s) => state[s.key]).length
  const allComplete = completedCount === steps.length

  // Auto-dismiss when all complete (after a brief delay to show completion)
  if (allComplete) {
    return null
  }

  return (
    <Card className="relative" role="region" aria-label="Getting started checklist">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Getting Started</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -mr-2"
            onClick={dismiss}
            aria-label="Dismiss onboarding checklist"
          >
            <X size={16} strokeWidth={1.5} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {completedCount} of {steps.length} steps complete
        </p>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${(completedCount / steps.length) * 100}%`,
              backgroundColor: 'var(--color-accent)',
            }}
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={steps.length}
            aria-label="Onboarding progress"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {steps.map((step) => {
          const done = state[step.key]
          const Icon = step.icon
          return (
            <button
              key={step.key}
              type="button"
              className="flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/60"
              onClick={() => {
                if (!done) markComplete(step.key)
              }}
              aria-label={`${done ? 'Completed: ' : ''}${step.label}`}
            >
              <div
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors"
                style={
                  done
                    ? {
                        backgroundColor: 'var(--color-success)',
                        borderColor: 'var(--color-success)',
                      }
                    : {
                        borderColor: 'currentColor',
                      }
                }
              >
                {done ? (
                  <Check size={14} strokeWidth={2} className="text-white" />
                ) : (
                  <Icon size={14} strokeWidth={1.5} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={[
                    'text-sm font-medium',
                    done ? 'line-through text-muted-foreground' : 'text-foreground',
                  ].join(' ')}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
