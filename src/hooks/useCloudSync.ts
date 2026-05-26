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
import { Capacitor } from '@capacitor/core'
import {
  clearTokens,
  fetchGoogleUserInfo,
  getStoredTokens,
  getValidToken,
  handleOAuthCallback,
  isConnected,
  isElectron,
  startOAuthFlow,
  type GoogleUserInfo,
} from '../lib/googleAuth'
import {
  driveIsNewer,
  readAllDriveFiles,
  writeAllDriveFiles,
  type DriveBundle,
} from '../lib/driveSync'
import { storageSync } from '../lib/storage'
import { USER_SCRIPTS_KEY, STORAGE_KEY, SCRIPT_META_KEY } from '../components/StorytellerSub/constants'
import { CUSTOM_CHARACTERS_KEY, REVISION_OVERRIDES_KEY } from '../catalog'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'pulling' | 'pushing'

export const LAST_SYNC_KEY = 'BOTC_LAST_SYNC'
export const USER_INFO_KEY = 'BOTC_GOOGLE_USER_INFO'

export interface CloudSyncState {
  connected: boolean
  status: SyncStatus
  lastSynced: Date | null
  errorMessage: string | null
  userInfo: GoogleUserInfo | null
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
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_INFO_KEY) ?? 'null') } catch { return null }
  })

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
    gameRecords: unknown
  } => {
    // Game records live inside the full storyteller state — extract just the array
    const gameRecords = (() => {
      try {
        const raw = storageSync.getItem(STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as { gameRecords?: unknown }
        return parsed.gameRecords ?? null
      } catch { return null }
    })()
    return {
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
        try { return JSON.parse(localStorage.getItem(SCRIPT_META_KEY) ?? 'null') } catch { return null }
      })(),
      gameRecords,
    }
  }

  // ── Write Drive data to localStorage ──────────────────────────────────────

  const applyDriveBundle = useCallback((bundle: DriveBundle) => {
    if (bundle.scripts != null)
      try { storageSync.setItem(USER_SCRIPTS_KEY, JSON.stringify(bundle.scripts)) } catch {}
    if (bundle.customCharacters != null)
      try { localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(bundle.customCharacters)) } catch {}
    if (bundle.revisionOverrides != null)
      try { localStorage.setItem(REVISION_OVERRIDES_KEY, JSON.stringify(bundle.revisionOverrides)) } catch {}
    if (bundle.scriptMeta != null)
      try { localStorage.setItem(SCRIPT_META_KEY, JSON.stringify(bundle.scriptMeta)) } catch {}
    if (bundle.gameRecords != null) {
      try {
        // Merge into existing storyteller state — preserve active game, just replace gameRecords
        const raw = storageSync.getItem(STORAGE_KEY)
        const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
        storageSync.setItem(STORAGE_KEY, JSON.stringify({ ...existing, gameRecords: bundle.gameRecords }))
      } catch {}
    }
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

      // Fetch account info if not yet loaded
      if (!userInfo) {
        fetchGoogleUserInfo(token).then((info) => {
          setUserInfo(info)
          try { localStorage.setItem(USER_INFO_KEY, JSON.stringify(info)) } catch {}
        }).catch(() => {})
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
    try {
      setStatus('idle')
      setErrorMessage(null)
      await startOAuthFlow() // web: navigates away; native/electron: completes inline
      // On native (Android) and Electron, startOAuthFlow() returns with tokens stored.
      // On web it navigates away — code below never runs.
      if ((Capacitor.isNativePlatform() || isElectron()) && isConnected()) {
        setConnected(true)
        await doSync()
      }
    } catch (e) {
      handleError(e)
    }
  }, [doSync])

  const disconnect = useCallback(() => {
    clearTokens()
    setConnected(false)
    setStatus('idle')
    setErrorMessage(null)
    setUserInfo(null)
    try { localStorage.removeItem(USER_INFO_KEY) } catch {}
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
    userInfo,
    connect,
    disconnect,
    syncNow,
    scheduleSync,
  }
}
