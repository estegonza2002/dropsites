"use client"

import { useEffect, useRef, useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SlugInputProps {
  value: string
  onChange: (value: string) => void
  baseUrl: string
}

type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function SlugInput({ value, onChange, baseUrl }: SlugInputProps) {
  const [checkState, setCheckState] = useState<CheckState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const delay = value ? 400 : 0

    timerRef.current = setTimeout(async () => {
      if (!value) {
        setCheckState('idle')
        setErrorMessage('')
        return
      }

      setCheckState('checking')
      try {
        const res = await fetch(`/api/v1/slug/check?slug=${encodeURIComponent(value)}`)
        const data = await res.json()
        if (!data.valid) {
          setCheckState('invalid')
          setErrorMessage(data.error ?? 'Invalid slug')
        } else if (data.available) {
          setCheckState('available')
          setErrorMessage('')
        } else {
          setCheckState('taken')
          setErrorMessage('Slug is already taken')
        }
      } catch {
        setCheckState('idle')
      }
    }, delay)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value])

  const displayUrl = value ? `${baseUrl}/${value}` : `${baseUrl}/your-slug`

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Label htmlFor="custom-slug" className="text-xs text-muted-foreground">
        Custom slug (optional)
      </Label>
      <div className="relative">
        <Input
          id="custom-slug"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="my-project"
          className="pr-8"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
          {checkState === 'checking' && (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-muted-foreground" />
          )}
          {checkState === 'available' && (
            <Check size={14} strokeWidth={1.5} className="text-[var(--color-success)]" />
          )}
          {(checkState === 'taken' || checkState === 'invalid') && (
            <X size={14} strokeWidth={1.5} className="text-destructive" />
          )}
        </div>
      </div>
      <p className="text-xs truncate text-muted-foreground">{displayUrl}</p>
      {(checkState === 'taken' || checkState === 'invalid') && errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
