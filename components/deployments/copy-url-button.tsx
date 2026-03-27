'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface CopyUrlButtonProps {
  url: string
}

export function CopyUrlButton({ url }: CopyUrlButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
          {copied ? (
            <Check size={16} strokeWidth={1.5} className="text-[var(--color-success)]" />
          ) : (
            <Copy size={16} strokeWidth={1.5} />
          )}
          {copied ? 'Copied' : 'Copy URL'}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy public URL to clipboard</TooltipContent>
    </Tooltip>
  )
}
