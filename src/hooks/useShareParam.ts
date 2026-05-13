/**
 * useShareParam — handles ?ar= analytics share URL decoding.
 *
 * Persists the param through Drive-triggered window.location.reload()
 * via sessionStorage, then decodes and shape-validates the GameRecord array.
 */

import { useEffect, useState } from 'react'
import { decodeShareParam } from '../lib/shareUrl'
import type { GameRecord } from '../components/StorytellerSub/types'

export type TabKey = 'scripts' | 'characters' | 'storyteller' | 'printstudio' | 'analytics' | 'settings'

const ACTIVE_TAB_KEY = 'botc-active-tab'
const PENDING_AR_KEY = 'BOTC_PENDING_AR'

export interface ShareParamState {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
  sharedAnalyticsRecords: GameRecord[] | null
  shareDecodeError: string | null
  clearSharedRecords: () => void
}

export function useShareParam(): ShareParamState {
  const [activeTab, setActiveTabState] = useState<TabKey>(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('ar') || sessionStorage.getItem(PENDING_AR_KEY)) return 'analytics'
    try { return (localStorage.getItem(ACTIVE_TAB_KEY) as TabKey) ?? 'scripts' } catch { return 'scripts' }
  })

  const [sharedAnalyticsRecords, setSharedAnalyticsRecords] = useState<GameRecord[] | null>(null)
  const [shareDecodeError, setShareDecodeError] = useState<string | null>(null)

  // Persist active tab
  const setActiveTab = (tab: TabKey) => {
    setActiveTabState(tab)
    try { localStorage.setItem(ACTIVE_TAB_KEY, tab) } catch {}
  }

  useEffect(() => {
    try { localStorage.setItem(ACTIVE_TAB_KEY, activeTab) } catch {}
  }, [activeTab])

  // Decode ?ar= share param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const arFromUrl = params.get('ar')
    const ar = arFromUrl ?? sessionStorage.getItem(PENDING_AR_KEY)
    if (!ar) return

    sessionStorage.setItem(PENDING_AR_KEY, ar)

    if (arFromUrl) {
      const clean = new URL(window.location.href)
      clean.searchParams.delete('ar')
      window.history.replaceState({}, '', clean.toString())
    }

    decodeShareParam<GameRecord[]>(ar)
      .then((decoded) => {
        if (!Array.isArray(decoded)) throw new Error('Decoded data is not an array')
        const valid = decoded.filter(
          (r): r is GameRecord =>
            r !== null &&
            typeof r === 'object' &&
            typeof (r as GameRecord).id === 'string' &&
            typeof (r as GameRecord).endedAt === 'number'
        )
        setSharedAnalyticsRecords(valid)
        sessionStorage.removeItem(PENDING_AR_KEY)
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        setShareDecodeError(`Failed to load shared records: ${msg}`)
        sessionStorage.removeItem(PENDING_AR_KEY)
      })
  }, [])

  const clearSharedRecords = () => {
    setSharedAnalyticsRecords(null)
    setShareDecodeError(null)
    sessionStorage.removeItem(PENDING_AR_KEY)
  }

  return {
    activeTab,
    setActiveTab,
    sharedAnalyticsRecords,
    shareDecodeError,
    clearSharedRecords,
  }
}
