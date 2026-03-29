'use client'

import { useCallback, useEffect, useState } from 'react'
import { PartyPopper, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface CelebrationModalProps {
  /** Whether to show the modal */
  open: boolean
  /** Callback when the modal closes (auto-dismiss or manual) */
  onOpenChange: (open: boolean) => void
  /** The URL of the newly deployed site */
  deploymentUrl: string
  /** The slug of the deployment */
  slug: string
}

/**
 * Celebration modal shown after the user's first deployment.
 * Features a CSS confetti animation and auto-dismisses after 5 seconds.
 */
export function CelebrationModal({
  open,
  onOpenChange,
  deploymentUrl,
  slug,
}: CelebrationModalProps) {
  const [autoDismissTimer, setAutoDismissTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null,
  )

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onOpenChange(false)
      }, 5000)
      setAutoDismissTimer(timer)
      return () => clearTimeout(timer)
    } else if (autoDismissTimer) {
      clearTimeout(autoDismissTimer)
      setAutoDismissTimer(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleVisit = useCallback(() => {
    window.open(deploymentUrl, '_blank', 'noopener,noreferrer')
    onOpenChange(false)
  }, [deploymentUrl, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm text-center overflow-hidden"
        aria-label="First deployment celebration"
      >
        {/* CSS confetti particles */}
        {open && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="confetti-particle"
                style={{
                  // Distribute across the width
                  left: `${(i / 24) * 100}%`,
                  // Stagger animation
                  animationDelay: `${Math.random() * 0.8}s`,
                  // Randomize color from design tokens
                  backgroundColor: [
                    'var(--color-accent)',
                    'var(--color-success)',
                    'var(--color-warning)',
                    '#a78bfa', // purple for visual variety
                  ][i % 4],
                }}
              />
            ))}
          </div>
        )}

        <DialogHeader className="items-center pt-4">
          <div
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              color: 'var(--color-accent)',
            }}
          >
            <PartyPopper size={28} strokeWidth={1.5} />
          </div>
          <DialogTitle className="text-lg font-medium">Your site is live!</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            <strong>{slug}</strong> has been published and is ready to share.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3 pb-2">
          <Button
            className="w-full"
            onClick={handleVisit}
          >
            Visit site
            <ExternalLink size={16} strokeWidth={1.5} className="ml-2" />
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Stay on dashboard
          </Button>
        </div>

        {/* Confetti animation styles */}
        <style jsx>{`
          @keyframes confetti-fall {
            0% {
              transform: translateY(-10px) rotate(0deg) scale(1);
              opacity: 1;
            }
            100% {
              transform: translateY(400px) rotate(720deg) scale(0.3);
              opacity: 0;
            }
          }

          .confetti-particle {
            position: absolute;
            top: -8px;
            width: 8px;
            height: 8px;
            border-radius: 2px;
            animation: confetti-fall 2.5s ease-in forwards;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}
