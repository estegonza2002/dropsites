'use client'

import { useState, useCallback, useMemo } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface EmbedSnippetProps {
  url: string
}

export function EmbedSnippet({ url }: EmbedSnippetProps) {
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState('600')
  const [copied, setCopied] = useState(false)

  const snippet = useMemo(() => {
    const h = height.includes('%') ? height : `${height}px`
    return `<iframe src="${url}" width="${width}" height="${h}" style="border:none;" loading="lazy" allowfullscreen></iframe>`
  }, [url, width, height])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silent fallback
    }
  }, [snippet])

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <Label htmlFor="embed-width" className="text-xs text-muted-foreground">
            Width
          </Label>
          <Input
            id="embed-width"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            placeholder="100%"
            className="text-sm"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="embed-height" className="text-xs text-muted-foreground">
            Height
          </Label>
          <Input
            id="embed-height"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            placeholder="600"
            className="text-sm"
          />
        </div>
      </div>

      <div className="relative">
        <pre className="overflow-x-auto rounded-md border border-border bg-muted/50 p-3 text-xs leading-relaxed break-all whitespace-pre-wrap">
          {snippet}
        </pre>
        <div className="absolute top-2 right-2">
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy embed code'}
              >
                {copied ? (
                  <Check size={14} strokeWidth={1.5} className="text-[var(--color-success)]" />
                ) : (
                  <Copy size={14} strokeWidth={1.5} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? 'Copied!' : 'Copy code'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
