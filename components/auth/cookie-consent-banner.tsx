'use client'

import { useState, useEffect, startTransition } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const CONSENT_KEY = 'ds-cookie-consent'

type ConsentValue = 'accepted' | 'declined'

function getStoredConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(CONSENT_KEY)
  if (value === 'accepted' || value === 'declined') return value
  return null
}

function setStoredConsent(value: ConsentValue) {
  localStorage.setItem(CONSENT_KEY, value)
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    startTransition(() => {
      const consent = getStoredConsent()
      if (!consent) {
        setVisible(true)
      }
    })
  }, [])

  if (!visible) return null

  function recordConsent(decision: 'accepted' | 'declined') {
    fetch('/api/v1/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    }).catch(() => {})
  }

  function handleAccept() {
    setStoredConsent('accepted')
    recordConsent('accepted')
    setVisible(false)
  }

  function handleDecline() {
    setStoredConsent('declined')
    recordConsent('declined')
    setVisible(false)
  }

  return (
    <div
      role="banner"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background px-4 py-3 shadow-sm sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Cookie className="mt-0.5 shrink-0" size={20} strokeWidth={1.5} />
          <p>
            We use cookies to keep you signed in and improve your experience.{' '}
            <Link
              href="/cookies"
              className="underline underline-offset-2 text-foreground"
            >
              Learn more
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white"
          >
            Accept
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={handleDecline}
                    className="ml-1 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                    aria-label="Dismiss cookie banner"
                  />
                }
              >
                <X size={16} strokeWidth={1.5} />
              </TooltipTrigger>
              <TooltipContent>Dismiss</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
