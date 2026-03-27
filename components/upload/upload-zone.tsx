"use client"

import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { UploadProgress } from './upload-progress'
import { UploadSuccess } from './upload-success'
import { UploadError } from './upload-error'
import { SlugInput } from './slug-input'

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error'

interface DeploymentResult {
  deploymentId: string
  slug: string
  url: string
  fileCount: number
  storageBytes: number
}

const ACCEPTED_TYPES = ['.html', '.htm', '.zip']
const ACCEPTED_MIME = ['text/html', 'application/zip', 'application/x-zip-compressed']

interface UploadZoneProps {
  baseUrl?: string
  showSlugInput?: boolean
}

export function UploadZone({ baseUrl = '', showSlugInput = true }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [percent, setPercent] = useState(0)
  const [filename, setFilename] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [result, setResult] = useState<DeploymentResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
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
      if (customSlug.trim()) {
        formData.append('slug', customSlug.trim())
      }

      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setPercent(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        xhrRef.current = null
        if (xhr.status === 201) {
          const data: DeploymentResult = JSON.parse(xhr.responseText)
          setResult(data)
          setState('success')
        } else {
          let msg = 'Upload failed. Please try again.'
          try {
            const body = JSON.parse(xhr.responseText)
            if (body.error) msg = body.error
          } catch {
            // use default message
          }
          setErrorMessage(msg)
          setState('error')
        }
      })

      xhr.addEventListener('error', () => {
        xhrRef.current = null
        setErrorMessage('Network error. Check your connection and try again.')
        setState('error')
      })

      xhr.addEventListener('abort', () => {
        xhrRef.current = null
        setState('idle')
      })

      xhr.open('POST', '/api/v1/deployments')
      xhr.send(formData)
    },
    [customSlug],
  )

  function handleCancel() {
    xhrRef.current?.abort()
  }

  function handleReset() {
    setState('idle')
    setPercent(0)
    setFilename('')
    setCustomSlug('')
    setResult(null)
    setErrorMessage('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (state === 'idle') setState('dragging')
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      if (state === 'dragging') setState('idle')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (state !== 'dragging') return
    setState('idle')
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const isDragging = state === 'dragging'

  return (
    <div className="flex flex-col gap-3 w-full max-w-md">
      <div
        role="button"
        tabIndex={state === 'idle' || state === 'dragging' ? 0 : -1}
        aria-label="Upload zone — drag and drop or click to browse"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (state === 'idle') inputRef.current?.click()
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && state === 'idle') inputRef.current?.click()
        }}
        className={[
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors',
          isDragging
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
            : state === 'idle'
              ? 'border-border bg-muted/40 hover:border-muted-foreground/40 hover:bg-muted/60 cursor-pointer'
              : 'border-border bg-muted/20',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".html,.htm,.zip"
          className="sr-only"
          onChange={handleFileChange}
          tabIndex={-1}
        />

        {(state === 'idle' || state === 'dragging') && (
          <>
            <div
              className={[
                'flex items-center justify-center w-10 h-10 rounded-full transition-colors',
                isDragging ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]' : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              <Upload size={20} strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isDragging ? 'Drop to upload' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">HTML, ZIP, or HTM · max 50 MB</p>
            </div>
          </>
        )}

        {state === 'uploading' && (
          <UploadProgress filename={filename} percent={percent} onCancel={handleCancel} />
        )}

        {state === 'success' && result && (
          <UploadSuccess url={result.url} slug={result.slug} onReset={handleReset} />
        )}

        {state === 'error' && (
          <UploadError message={errorMessage} onRetry={handleReset} />
        )}
      </div>

      {showSlugInput && (state === 'idle' || state === 'dragging') && (
        <SlugInput value={customSlug} onChange={setCustomSlug} baseUrl={baseUrl} />
      )}
    </div>
  )
}
