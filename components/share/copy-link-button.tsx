'use client'

import { useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface CopyLinkButtonProps {
  url: string
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [url])

  return (
    <div className="flex items-center gap-2">
      <Input
        readOnly
        value={url}
        className="flex-1 text-sm font-mono"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy link'}
          >
            {copied ? (
              <Check size={16} strokeWidth={1.5} className="text-[var(--color-success)]" />
            ) : (
              <Copy size={16} strokeWidth={1.5} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copied!' : 'Copy link'}</TooltipContent>
      </Tooltip>
    </div>
  )
}
