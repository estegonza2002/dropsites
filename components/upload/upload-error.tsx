"use client"

import { AlertCircle, RotateCcw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadErrorProps {
  message: string
  onRetry: () => void
}

const LIMIT_ERROR_PATTERNS = [
  /limit reached/i,
  /exceeds your plan/i,
  /storage full/i,
  /plan limit/i,
]

function isLimitError(message: string): boolean {
  return LIMIT_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export function UploadError({ message, onRetry }: UploadErrorProps) {
  const limitError = isLimitError(message)

  return (
    <div className="flex flex-col items-center gap-4 w-full text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive">
        <AlertCircle size={20} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Upload failed</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{message}</p>
      </div>
      <div className="flex gap-2">
        {limitError ? (
          <a
            href="/signup?intent=upgrade"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white"
          >
            <Zap size={16} strokeWidth={1.5} />
            Upgrade plan
          </a>
        ) : (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
            <RotateCcw size={16} strokeWidth={1.5} />
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}
