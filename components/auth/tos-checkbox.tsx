'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface TosCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function TosCheckbox({ checked, onCheckedChange }: TosCheckboxProps) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox
        id="tos"
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className="mt-0.5"
      />
      <Label htmlFor="tos" className="text-sm text-muted-foreground leading-snug cursor-pointer">
        I agree to the{' '}
        <a href="/terms" className="underline underline-offset-4 text-foreground hover:text-foreground/80">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/acceptable-use" className="underline underline-offset-4 text-foreground hover:text-foreground/80">
          Acceptable Use Policy
        </a>
      </Label>
    </div>
  )
}
