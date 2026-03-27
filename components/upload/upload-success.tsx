"use client"

import { Check, Copy, ExternalLink, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface UploadSuccessProps {
  url: string
  slug: string
  onReset: () => void
}

export function UploadSuccess({ url, slug, onReset }: UploadSuccessProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)]">
        <Check size={20} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Deployed successfully</p>
        <p className="text-xs text-muted-foreground mt-0.5">/{slug}</p>
      </div>

      <div className="flex items-center gap-1.5 w-full max-w-sm bg-muted rounded-lg px-3 py-2">
        <span className="flex-1 text-sm truncate text-left">{url}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCopy}
                aria-label="Copy link"
              />
            }
          >
            {copied ? (
              <Check size={16} strokeWidth={1.5} className="text-[var(--color-success)]" />
            ) : (
              <Copy size={16} strokeWidth={1.5} />
            )}
          </TooltipTrigger>
          <TooltipContent>{copied ? 'Copied!' : 'Copy link'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open in new tab"
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7 shrink-0')}
              />
            }
          >
            <ExternalLink size={16} strokeWidth={1.5} />
          </TooltipTrigger>
          <TooltipContent>Open in new tab</TooltipContent>
        </Tooltip>
      </div>

      <Button variant="ghost" size="sm" onClick={onReset} className="gap-2 text-muted-foreground">
        <RotateCcw size={16} strokeWidth={1.5} />
        Upload another
      </Button>
    </div>
  )
}
