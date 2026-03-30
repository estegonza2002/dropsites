'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type TwoFactorSettingsProps = {
  enabled: boolean
  onSetup?: () => void
}

export function TwoFactorSettings({ enabled, onSetup }: TwoFactorSettingsProps) {
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [disableConfirm, setDisableConfirm] = useState(false)

  async function handleDisable() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/disable', { method: 'POST' })
      if (res.ok) {
        window.location.reload()
      }
    } catch {
      // Error handled silently — user can retry
    } finally {
      setLoading(false)
      setDisableConfirm(false)
    }
  }

  async function handleShowBackupCodes() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/backup-codes')
      if (res.ok) {
        const data = await res.json()
        setBackupCodes(data.codes ?? [])
        setShowBackupCodes(true)
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerateCodes() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/2fa/backup-codes', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setBackupCodes(data.codes ?? [])
        setShowBackupCodes(true)
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Two-factor authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </div>
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled ? (
          <Button
            onClick={onSetup ?? (() => { window.location.href = '/setup-2fa' })}
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Enable 2FA
          </Button>
        ) : (
          <>
            {/* Backup codes section */}
            {!showBackupCodes ? (
              <Button
                variant="outline"
                onClick={handleShowBackupCodes}
                disabled={loading}
              >
                View backup codes
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">Backup codes</p>
                <div className="bg-muted rounded-lg p-3">
                  {backupCodes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {backupCodes.map((code, i) => (
                        <code
                          key={i}
                          className="text-xs font-mono bg-background px-2 py-1 rounded border text-center"
                        >
                          {code}
                        </code>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No backup codes remaining.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(backupCodes.join('\n'))
                    }}
                    disabled={backupCodes.length === 0}
                  >
                    Copy codes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateCodes}
                    disabled={loading}
                  >
                    Regenerate codes
                  </Button>
                </div>
              </div>
            )}

            {/* Disable 2FA */}
            <div className="pt-2 border-t">
              {!disableConfirm ? (
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setDisableConfirm(true)}
                >
                  Disable 2FA
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    Are you sure? This will remove 2FA from your account.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisable}
                      disabled={loading}
                    >
                      {loading ? 'Disabling...' : 'Yes, disable 2FA'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDisableConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
