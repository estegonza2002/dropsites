"use client"

import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadErrorProps {
  message: string
  onRetry: () => void
}

export function UploadError({ message, onRetry }: UploadErrorProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive">
        <AlertCircle size={20} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Upload failed</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RotateCcw size={16} strokeWidth={1.5} />
        Try again
      </Button>
    </div>
  )
}
