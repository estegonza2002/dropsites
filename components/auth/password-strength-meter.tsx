'use client'

type PasswordStrengthMeterProps = {
  score: 0 | 1 | 2 | 3 | 4
  feedback: string[]
}

const STRENGTH_LABELS: Record<number, string> = {
  0: 'Very weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Strong',
  4: 'Very strong',
}

const STRENGTH_COLORS: Record<number, string> = {
  0: 'var(--color-danger)',
  1: 'var(--color-danger)',
  2: 'var(--color-warning)',
  3: 'var(--color-success)',
  4: 'var(--color-success)',
}

export function PasswordStrengthMeter({ score, feedback }: PasswordStrengthMeterProps) {
  const label = STRENGTH_LABELS[score]
  const color = STRENGTH_COLORS[score]
  const percentage = ((score + 1) / 5) * 100

  return (
    <div className="space-y-1.5" role="status" aria-label={`Password strength: ${label}`}>
      {/* Strength bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Label */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium"
          style={{ color }}
        >
          {label}
        </span>
      </div>

      {/* Feedback */}
      {feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {feedback.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
