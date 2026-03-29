'use client'

import { useMemo } from 'react'
import {
  FileText,
  FileCode,
  FileImage,
  FolderOpen,
  Folder,
  File,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface FileEntry {
  path: string
  size: number
  mimeType: string
}

interface FileTreeSidebarProps {
  files: FileEntry[]
  activeFilePath: string | null
  onFileSelect: (path: string) => void
  changedFiles?: Set<string>
  className?: string
}

function getFileIcon(path: string, mimeType: string) {
  const iconProps = { size: 16, strokeWidth: 1.5, className: 'shrink-0' }

  if (mimeType.startsWith('image/')) {
    return <FileImage {...iconProps} className="shrink-0 text-[var(--color-accent)]" />
  }
  if (mimeType.includes('html')) {
    return <FileCode {...iconProps} className="shrink-0 text-[var(--color-warning)]" />
  }
  if (mimeType.includes('css')) {
    return <FileCode {...iconProps} className="shrink-0 text-[var(--color-success)]" />
  }
  if (mimeType.includes('javascript') || mimeType.includes('json')) {
    return <FileCode {...iconProps} className="shrink-0 text-[var(--color-expiring)]" />
  }
  return <FileText {...iconProps} className="shrink-0 text-muted-foreground" />
}

interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  children: TreeNode[]
  file?: FileEntry
}

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', isDirectory: true, children: [] }

  for (const file of files) {
    const parts = file.path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join('/')

      if (isLast) {
        current.children.push({
          name: part,
          path: currentPath,
          isDirectory: false,
          children: [],
          file,
        })
      } else {
        let dir = current.children.find((c) => c.isDirectory && c.name === part)
        if (!dir) {
          dir = { name: part, path: currentPath, isDirectory: true, children: [] }
          current.children.push(dir)
        }
        current = dir
      }
    }
  }

  // Sort: directories first, then alphabetical
  function sortTree(nodes: TreeNode[]): TreeNode[] {
    return nodes
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map((node) => ({
        ...node,
        children: sortTree(node.children),
      }))
  }

  return sortTree(root.children)
}

function TreeNodeItem({
  node,
  depth,
  activeFilePath,
  onFileSelect,
  changedFiles,
}: {
  node: TreeNode
  depth: number
  activeFilePath: string | null
  onFileSelect: (path: string) => void
  changedFiles?: Set<string>
}) {
  const isActive = !node.isDirectory && node.path === activeFilePath
  const hasChanges = changedFiles?.has(node.path)

  if (node.isDirectory) {
    return (
      <div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {node.children.length > 0 ? (
            <FolderOpen size={16} strokeWidth={1.5} className="shrink-0" />
          ) : (
            <Folder size={16} strokeWidth={1.5} className="shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </div>
        {node.children.map((child) => (
          <TreeNodeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFilePath={activeFilePath}
            onFileSelect={onFileSelect}
            changedFiles={changedFiles}
          />
        ))}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onFileSelect(node.path)}
      className={cn(
        'flex w-full items-center gap-1.5 px-2 py-1 text-xs transition-colors hover:bg-muted',
        isActive && 'bg-muted font-medium text-foreground',
        !isActive && 'text-muted-foreground'
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {node.file ? getFileIcon(node.path, node.file.mimeType) : <File size={16} strokeWidth={1.5} className="shrink-0" />}
      <span className="truncate">{node.name}</span>
      {hasChanges && (
        <span className="ml-auto inline-block size-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
      )}
    </button>
  )
}

export function FileTreeSidebar({
  files,
  activeFilePath,
  onFileSelect,
  changedFiles,
  className,
}: FileTreeSidebarProps) {
  const tree = useMemo(() => buildTree(files), [files])

  return (
    <div className={cn('flex flex-col border-r bg-muted/30', className)}>
      <div className="border-b px-3 py-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Files
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {tree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              activeFilePath={activeFilePath}
              onFileSelect={onFileSelect}
              changedFiles={changedFiles}
            />
          ))}
          {files.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground">No files found</p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
