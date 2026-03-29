'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import { CodeEditor, type EditorLanguage } from '@/components/editor/code-editor'
import { FileTreeSidebar, type FileEntry } from '@/components/editor/file-tree-sidebar'
import { EditorToolbar } from '@/components/editor/editor-toolbar'
import { DiffSummary } from '@/components/editor/diff-summary'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const DRAFT_STORAGE_PREFIX = 'dropsites-editor-draft:'

interface EditorPageClientProps {
  slug: string
}

function detectLanguage(path: string): EditorLanguage {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html'
    case 'css':
      return 'css'
    case 'js':
    case 'mjs':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'javascript'
    case 'json':
      return 'json'
    default:
      return 'text'
  }
}

function isTextMimeType(mimeType: string): boolean {
  return (
    mimeType.startsWith('text/') ||
    mimeType.includes('json') ||
    mimeType.includes('javascript') ||
    mimeType.includes('xml') ||
    mimeType.includes('svg')
  )
}

export function EditorPageClient({ slug }: EditorPageClientProps) {
  const router = useRouter()

  const [files, setFiles] = useState<FileEntry[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [fileContents, setFileContents] = useState<Record<string, string>>({})
  const [originalContents, setOriginalContents] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingFile, setLoadingFile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Compute changed files
  const changedFiles = new Set<string>()
  for (const [path, content] of Object.entries(fileContents)) {
    if (originalContents[path] !== undefined && originalContents[path] !== content) {
      changedFiles.add(path)
    }
  }

  // Load file list
  useEffect(() => {
    async function loadFiles() {
      try {
        const res = await fetch(`/api/v1/deployments/${slug}/files`)
        if (!res.ok) {
          setError('Failed to load deployment files')
          return
        }
        const data = await res.json()
        setFiles(data.files)

        // Select the entry file or first text file
        const textFiles = data.files.filter((f: FileEntry) => isTextMimeType(f.mimeType))
        const entryFile = textFiles.find((f: FileEntry) => f.path === data.entryPath)
        const firstFile = entryFile ?? textFiles[0]
        if (firstFile) {
          setActiveFilePath(firstFile.path)
        }
      } catch {
        setError('Failed to load deployment files')
      } finally {
        setLoading(false)
      }
    }

    loadFiles()
  }, [slug])

  // Load file content when active file changes
  useEffect(() => {
    if (!activeFilePath) return

    // Already loaded
    if (fileContents[activeFilePath] !== undefined) return

    // Check for draft in localStorage
    const draftKey = `${DRAFT_STORAGE_PREFIX}${slug}:${activeFilePath}`
    const draft = typeof window !== 'undefined' ? localStorage.getItem(draftKey) : null

    async function loadFileContent() {
      setLoadingFile(true)
      try {
        const res = await fetch(`/api/v1/deployments/${slug}/files/${activeFilePath}`)
        if (!res.ok) {
          setError(`Failed to load file: ${activeFilePath}`)
          return
        }
        const text = await res.text()
        setOriginalContents((prev) => ({ ...prev, [activeFilePath!]: text }))

        // Use draft if it exists and differs from original
        if (draft !== null && draft !== text) {
          setFileContents((prev) => ({ ...prev, [activeFilePath!]: draft }))
        } else {
          setFileContents((prev) => ({ ...prev, [activeFilePath!]: text }))
        }
      } catch {
        setError(`Failed to load file: ${activeFilePath}`)
      } finally {
        setLoadingFile(false)
      }
    }

    loadFileContent()
  }, [activeFilePath, slug, fileContents])

  // Auto-save drafts to localStorage
  const saveDraft = useCallback(
    (path: string, content: string) => {
      if (typeof window === 'undefined') return
      const draftKey = `${DRAFT_STORAGE_PREFIX}${slug}:${path}`
      const original = originalContents[path]
      if (original !== undefined && content !== original) {
        localStorage.setItem(draftKey, content)
      } else {
        localStorage.removeItem(draftKey)
      }
    },
    [slug, originalContents]
  )

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (!activeFilePath) return
      setFileContents((prev) => ({ ...prev, [activeFilePath]: newContent }))

      // Debounced draft save
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => {
        saveDraft(activeFilePath, newContent)
      }, 500)
    },
    [activeFilePath, saveDraft]
  )

  const handleFileSelect = useCallback((path: string) => {
    const file = files.find((f) => f.path === path)
    if (file && !isTextMimeType(file.mimeType)) return // skip binary files
    setActiveFilePath(path)
  }, [files])

  const handleDiscard = useCallback(() => {
    if (changedFiles.size === 0) return
    setShowDiscardDialog(true)
  }, [changedFiles.size])

  const confirmDiscard = useCallback(() => {
    // Reset all changed files to original content
    const restored = { ...fileContents }
    for (const path of changedFiles) {
      if (originalContents[path] !== undefined) {
        restored[path] = originalContents[path]
      }
      // Remove drafts from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${slug}:${path}`)
      }
    }
    setFileContents(restored)
    setShowDiscardDialog(false)
  }, [fileContents, changedFiles, originalContents, slug])

  const handleSavePublish = useCallback(() => {
    if (changedFiles.size === 0) return
    setShowPublishDialog(true)
  }, [changedFiles.size])

  const confirmPublish = useCallback(async () => {
    setShowPublishDialog(false)
    setSaving(true)
    setError(null)

    try {
      const changedPaths = Array.from(changedFiles)

      // Save each changed file
      const results = await Promise.allSettled(
        changedPaths.map((path) =>
          fetch(`/api/v1/deployments/${slug}/files/${path}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: fileContents[path] }),
          }).then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({ error: 'Unknown error' }))
              throw new Error(data.error ?? `Failed to save ${path}`)
            }
            return path
          })
        )
      )

      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        const reason = (failed[0] as PromiseRejectedResult).reason
        setError(`Failed to save some files: ${reason?.message ?? 'Unknown error'}`)
        return
      }

      // Update originals to match current content and clear drafts
      const newOriginals = { ...originalContents }
      for (const path of changedPaths) {
        newOriginals[path] = fileContents[path]
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${slug}:${path}`)
        }
      }
      setOriginalContents(newOriginals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish changes')
    } finally {
      setSaving(false)
    }
  }, [changedFiles, fileContents, originalContents, slug])

  const activeFile = files.find((f) => f.path === activeFilePath)
  const isActiveFileText = activeFile ? isTextMimeType(activeFile.mimeType) : true
  const currentContent = activeFilePath ? fileContents[activeFilePath] ?? '' : ''
  const language = activeFilePath ? detectLanguage(activeFilePath) : 'text'

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} strokeWidth={1.5} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && files.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <AlertTriangle size={32} strokeWidth={1.5} className="text-[var(--color-danger)]" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link href={`/dashboard/deployments/${slug}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} strokeWidth={1.5} data-icon="inline-start" />
            Back to deployment
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <EditorToolbar
        filePath={activeFilePath}
        slug={slug}
        changedFileCount={changedFiles.size}
        isSaving={saving}
        onSavePublish={handleSavePublish}
        onDiscard={handleDiscard}
      />

      {/* Error banner */}
      {error && (
        <div className="border-b bg-[var(--color-danger-subtle)] px-3 py-2 text-xs text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree sidebar */}
        <FileTreeSidebar
          files={files}
          activeFilePath={activeFilePath}
          onFileSelect={handleFileSelect}
          changedFiles={changedFiles}
          className="hidden w-56 sm:flex lg:w-64"
        />

        {/* Editor area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile file selector */}
          <div className="border-b px-3 py-1.5 sm:hidden">
            <select
              value={activeFilePath ?? ''}
              onChange={(e) => handleFileSelect(e.target.value)}
              className="w-full rounded border bg-background px-2 py-1 text-xs"
            >
              {files.filter((f) => isTextMimeType(f.mimeType)).map((f) => (
                <option key={f.path} value={f.path}>
                  {f.path}
                  {changedFiles.has(f.path) ? ' *' : ''}
                </option>
              ))}
            </select>
          </div>

          {loadingFile ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 size={20} strokeWidth={1.5} className="animate-spin text-muted-foreground" />
            </div>
          ) : !isActiveFileText ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Binary files cannot be edited
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                key={activeFilePath}
                value={currentContent}
                onChange={handleContentChange}
                language={language}
              />
            </div>
          )}
        </div>
      </div>

      {/* Discard dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in {changedFiles.size} file{changedFiles.size !== 1 ? 's' : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DiffSummary changedFiles={Array.from(changedFiles)} className="my-2" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard} className="bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger)]/90">
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publish confirmation dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update {changedFiles.size} file{changedFiles.size !== 1 ? 's' : ''} in the live deployment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DiffSummary changedFiles={Array.from(changedFiles)} className="my-2" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPublish}
              className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]"
            >
              Save &amp; Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
