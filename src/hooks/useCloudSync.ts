/**
 * useCloudSync — React hook for Google Drive sync state + operations.
 *
 * Responsibilities:
 *  - Detect OAuth callback on mount (code in URL params)
 *  - Expose connect / disconnect / syncNow
 *  - Auto-sync on data change (debounced 2 s)
 *  - Track sync status: idle | syncing | error | offline
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearTokens,
  getStoredTokens,
  getValidToken,
  handleOAuthCallback,
  isConnected,
  startOAuthFlow,
} from '../lib/googleAuth'
import {
  driveIsNewer,
  readAllDriveFiles,
  writeAllDriveFiles,
  type DriveBundle,
} from '../lib/driveSync'
import { storageSync } from '../lib/storage'
import { USER_SCRIPTS_KEY } from '../components/StorytellerSub/constants'
import { CUSTOM_CHARACTERS_KEY, REVISION_OVERRIDES_KEY } from '../catalog'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'pulling' | 'pushing'

export const LAST_SYNC_KEY = 'BOTC_LAST_SYNC'
export const SCRIPT_META_KEY_SYNC = 'BOTC_SCRIPT_META'

export interface CloudSyncState {
  connected: boolean
  status: SyncStatus
  lastSynced: Date | null
  errorMessage: string | null
  /** Call to start OAuth redirect */
  connect: () => Promise<void>
  /** Disconnect and clear tokens */
  disconnect: () => void
  /** Manual full sync */
  syncNow: () => Promise<void>
  /** Call when local data changes to schedule a push */
  scheduleSync: () => void
}

export function useCloudSync(): CloudSyncState {
  const [connected, setConnected] = useState(() => isConnected())
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    const stored = localStorage.getItem(LAST_SYNC_KEY)
    return stored ? new Date(Number(stored)) : null
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSyncing = useRef(false)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const markSynced = () => {
    const now = new Date()
    setLastSynced(now)
    setStatus('idle')
    setErrorMessage(null)
    try { localStorage.setItem(LAST_SYNC_KEY, String(now.getTime())) } catch {}
  }

  const handleError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    setStatus('error')
    setErrorMessage(msg)
    isSyncing.current = false
  }

  // ── Read local data ────────────────────────────────────────────────────────

  const readLocal = (): {
    scripts: unknown
    customCharacters: unknown
    revisionOverrides: unknown
    scriptMeta: unknown
  } => ({
    scripts: (() => {
      try { return JSON.parse(storageSync.getItem(USER_SCRIPTS_KEY) ?? 'null') } catch { return null }
    })(),
    customCharacters: (() => {
      try { return JSON.parse(localStorage.getItem(CUSTOM_CHARACTERS_KEY) ?? 'null') } catch { return null }
    })(),
    revisionOverrides: (() => {
      try { return JSON.parse(localStorage.getItem(REVISION_OVERRIDES_KEY) ?? 'null') } catch { return null }
    })(),
    scriptMeta: (() => {
      try { return JSON.parse(localStorage.getItem(SCRIPT_META_KEY_SYNC) ?? 'null') } catch { return null }
    })(),
  })

  // ── Write Drive data to localStorage ──────────────────────────────────────

  const applyDriveBundle = useCallback((bundle: DriveBundle) => {
    if (bundle.scripts != null)
      try { storageSync.setItem(USER_SCRIPTS_KEY, JSON.stringify(bundle.scripts)) } catch {}
    if (bundle.customCharacters != null)
      try { localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(bundle.customCharacters)) } catch {}
    if (bundle.revisionOverrides != null)
      try { localStorage.setItem(REVISION_OVERRIDES_KEY, JSON.stringify(bundle.revisionOverrides)) } catch {}
    if (bundle.scriptMeta != null)
      try { localStorage.setItem(SCRIPT_META_KEY_SYNC, JSON.stringify(bundle.scriptMeta)) } catch {}
  }, [])

  // ── Core sync ─────────────────────────────────────────────────────────────

  const doSync = useCallback(async (direction?: 'pull' | 'push') => {
    if (isSyncing.current) return
    isSyncing.current = true

    try {
      const token = await getValidToken()
      if (!token) {
        setConnected(false)
        setStatus('offline')
        isSyncing.current = false
        return
      }

      if (direction === 'push') {
        // Push only
        setStatus('pushing')
        await writeAllDriveFiles(token, readLocal())
      } else {
        // Pull or auto-detect
        setStatus('pulling')
        const bundle = await readAllDriveFiles(token)
        const localTs = Number(localStorage.getItem(LAST_SYNC_KEY) ?? '0')
        const driveHasData = bundle.scripts != null || bundle.customCharacters != null ||
          bundle.revisionOverrides != null || bundle.scriptMeta != null

        if (driveHasData && (direction === 'pull' || driveIsNewer(bundle.fileMetas, localTs))) {
          // Drive has data and is newer (or explicit pull) → apply locally and reload
          // IMPORTANT: stamp LAST_SYNC_KEY *before* reloading so the next load's
          // driveIsNewer() check returns false and we don't loop forever.
          applyDriveBundle(bundle)
          try { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())) } catch {}
          window.location.reload()
          return
        } else {
          // Drive is empty or local is newer → push local → Drive
          setStatus('pushing')
          await writeAllDriveFiles(token, readLocal(), bundle.fileMetas)
        }
      }

      markSynced()
    } catch (e) {
      handleError(e)
    } finally {
      isSyncing.current = false
    }
  }, [applyDriveBundle])

  // ── Debounced schedule (called on every local data change) ─────────────────

  const scheduleSync = useCallback(() => {
    if (!isConnected()) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      void doSync('push')
    }, 2000)
  }, [doSync])

  // ── Handle OAuth callback on mount ─────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('code')) return

    setStatus('syncing')
    handleOAuthCallback(params)
      .then(async (result) => {
        if (!result) {
          // Code present but verifier missing — likely PKCE state was lost.
          // Check if we already have valid tokens (e.g. strict-mode double-fire).
          const existing = await getValidToken()
          if (existing) {
            window.history.replaceState({}, '', window.location.pathname)
            setConnected(true)
            await doSync()
          } else {
            setStatus('error')
            setErrorMessage('OAuth callback failed: PKCE verifier missing. Try connecting again.')
          }
          return
        }
        // Clean URL
        window.history.replaceState({}, '', result.cleanUrl)
        setConnected(true)
        // Auto-detect: pull if Drive has data, push if Drive is empty (first connect)
        await doSync()
      })
      .catch(handleError)
  }, [doSync])

  // ── Connectivity detection ─────────────────────────────────────────────────

  useEffect(() => {
    const onOnline = () => { if (isConnected()) void doSync() }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [doSync])

  // ── Initial sync on load (if already connected) ────────────────────────────

  useEffect(() => {
    if (isConnected() && navigator.onLine) {
      void doSync()
    }
  // Only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Public API ─────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    await startOAuthFlow() // navigates away
  }, [])

  const disconnect = useCallback(() => {
    clearTokens()
    setConnected(false)
    setStatus('idle')
    setErrorMessage(null)
  }, [])

  const syncNow = useCallback(async () => {
    if (!getStoredTokens()) return
    await doSync()
  }, [doSync])

  return {
    connected,
    status,
    lastSynced,
    errorMessage,
    connect,
    disconnect,
    syncNow,
    scheduleSync,
  }
}
