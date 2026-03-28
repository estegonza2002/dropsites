'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RoleSelectProps {
  value: 'publisher' | 'viewer'
  onValueChange: (role: 'publisher' | 'viewer') => void
  disabled?: boolean
}

export function RoleSelect({ value, onValueChange, disabled }: RoleSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as 'publisher' | 'viewer')} disabled={disabled}>
      <SelectTrigger className="w-32 h-8 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="publisher">Publisher</SelectItem>
        <SelectItem value="viewer">Viewer</SelectItem>
      </SelectContent>
    </Select>
  )
}
