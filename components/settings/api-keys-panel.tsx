'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Trash2 } from 'lucide-react'
import { ApiKeyCreateDialog } from './api-key-create-dialog'

interface ApiKeyItem {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function keyStatus(key: ApiKeyItem): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (key.revoked_at) return { label: 'Revoked', variant: 'destructive' }
  if (key.expires_at && new Date(key.expires_at) <= new Date()) {
    return { label: 'Expired', variant: 'secondary' }
  }
  return { label: 'Active', variant: 'default' }
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await fetch('/api/v1/api-keys')
      const json = await resp.json()
      setKeys(json.data ?? [])
    } catch {
      // Silently handle — table will be empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  async function handleRevoke(keyId: string) {
    try {
      await fetch(`/api/v1/api-keys/${keyId}`, { method: 'DELETE' })
      await fetchKeys()
    } catch {
      // Silently handle
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">API Keys</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage API keys for programmatic access to your workspace.
          </p>
        </div>
        <ApiKeyCreateDialog onCreated={fetchKeys} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No API keys yet. Generate one to get started.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="hidden sm:table-cell">Last used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => {
              const status = keyStatus(key)
              return (
                <TableRow key={key.id}>
                  <TableCell className="font-medium text-sm">
                    {key.name}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">
                      {key.prefix}
                    </code>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {formatDate(key.created_at)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {formatDate(key.last_used_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {!key.revoked_at && (
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <AlertDialogTrigger
                                render={
                                  <Button variant="ghost" size="icon-sm" />
                                }
                              />
                            }
                          >
                            <Trash2
                              className="size-4 text-[var(--color-danger)]"
                              strokeWidth={1.5}
                            />
                            <span className="sr-only">Revoke</span>
                          </TooltipTrigger>
                          <TooltipContent>Revoke key</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Revoke API Key
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently revoke the key &ldquo;
                              {key.name}&rdquo;. Any integrations using this key
                              will stop working immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevoke(key.id)}
                            >
                              Revoke key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
