import type { ReactNode } from 'react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <span className="text-xl font-medium tracking-tight text-foreground">
              Drop<span style={{ color: 'var(--color-accent)' }}>Sites</span>
            </span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
