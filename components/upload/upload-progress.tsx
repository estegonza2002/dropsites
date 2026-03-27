"use client"

import { X } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface UploadProgressProps {
  filename: string
  percent: number
  onCancel: () => void
}

export function UploadProgress({ filename, percent, onCancel }: UploadProgressProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground truncate flex-1">{filename}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={onCancel}
                aria-label="Cancel upload"
              />
            }
          >
            <X size={16} strokeWidth={1.5} />
          </TooltipTrigger>
          <TooltipContent>Cancel upload</TooltipContent>
        </Tooltip>
      </div>
      <Progress value={percent} className="h-1.5" />
      <p className="text-xs text-muted-foreground">
        {percent < 100 ? `Uploading… ${percent}%` : 'Processing…'}
      </p>
    </div>
  )
}
