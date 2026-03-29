import type { Metadata } from 'next'
import { EditorPageClient } from './client'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return { title: `Edit ${slug} — DropSites` }
}

export default async function EditorPage({ params }: PageProps) {
  const { slug } = await params
  return <EditorPageClient slug={slug} />
}
