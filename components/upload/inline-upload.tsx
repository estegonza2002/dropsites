'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

interface InlineUploadProps {
  slug: string
  onSuccess?: () => void
  onCancel?: () => void
}

type UploadState = 'idle' | 'uploading' | 'done'

const ACCEPTED_TYPES = ['.html', '.htm', '.zip']
const ACCEPTED_MIME = ['text/html', 'application/zip', 'application/x-zip-compressed']

export function InlineUpload({ slug, onSuccess, onCancel }: InlineUploadProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [percent, setPercent] = useState(0)
  const [filename, setFilename] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  const upload = useCallback(
    (file: File) => {
      if (!ACCEPTED_MIME.includes(file.type) && !ACCEPTED_TYPES.some((ext) => file.name.endsWith(ext))) {
        toast.error('Only .html, .htm, and .zip files are supported')
        return
      }

      setFilename(file.name)
      setPercent(0)
      setState('uploading')

      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setPercent(Math.round((e.loaded / e.total) * 100))
      })

      xhr.addEventListener('load', () => {
        xhrRef.current = null
        if (xhr.status === 200 || xhr.status === 201) {
          setState('done')
          toast.success('Deployment updated successfully')
          onSuccess?.()
        } else {
          let msg = 'Update failed. Please try again.'
          try {
            const body = JSON.parse(xhr.responseText)
            if (body.error) msg = body.error
          } catch {
            // use default
          }
          toast.error(msg)
          setState('idle')
        }
      })

      xhr.addEventListener('error', () => {
        xhrRef.current = null
        toast.error('Network error. Check your connection and try again.')
        setState('idle')
      })

      xhr.addEventListener('abort', () => {
        xhrRef.current = null
        setState('idle')
      })

      xhr.open('PUT', `/api/v1/deployments/${slug}`)
      xhr.send(formData)
    },
    [slug, onSuccess],
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  return (
    <div className="mt-2 space-y-2">
      {state === 'idle' && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop file to update deployment content"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/60 cursor-pointer transition-colors"
        >
          <Upload size={16} strokeWidth={1.5} className="shrink-0" />
          <span>Drop or click to update content</span>
          <input
            ref={inputRef}
            type="file"
            accept=".html,.htm,.zip"
            className="sr-only"
            onChange={handleFileChange}
            tabIndex={-1}
          />
        </div>
      )}

      {state === 'uploading' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate max-w-[200px]">{filename}</span>
            <button
              type="button"
              onClick={() => xhrRef.current?.abort()}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cancel upload"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
          <Progress value={percent} className="h-1.5" />
        </div>
      )}

      {state === 'idle' && onCancel && (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  )
}
