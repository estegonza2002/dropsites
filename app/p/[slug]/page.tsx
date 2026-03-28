import type { Metadata } from 'next'
import { PasswordPromptForm } from '@/components/serving/password-prompt-form'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Password required — ${slug}`,
    robots: { index: false, follow: false },
  }
}

export default async function PasswordPromptPage({ params }: PageProps) {
  const { slug } = await params

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <PasswordPromptForm slug={slug} />
    </main>
  )
}
