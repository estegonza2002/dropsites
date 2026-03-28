'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NamespaceInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const NAMESPACE_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/

export function NamespaceInput({ value, onChange, disabled }: NamespaceInputProps) {
  const [touched, setTouched] = useState(false)

  const isValid = !value || NAMESPACE_REGEX.test(value)
  const showError = touched && value && !isValid

  return (
    <div className="space-y-1.5">
      <Label htmlFor="namespace" className="text-sm font-medium">
        Namespace slug
      </Label>
      <Input
        id="namespace"
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
        onBlur={() => setTouched(true)}
        placeholder="my-team"
        disabled={disabled}
        className="h-8 text-sm"
        autoComplete="off"
      />
      <p className="text-xs text-muted-foreground">
        Optional. Used as URL prefix for deployments (e.g. yoursite.dropsites.io/~namespace/slug).
      </p>
      {showError && (
        <p className="text-xs text-[var(--color-danger)]">
          Must be 2-64 characters, lowercase alphanumeric with hyphens.
        </p>
      )}
    </div>
  )
}
