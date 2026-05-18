/**
 * useShareParam — handles ?ar= analytics share URL decoding.
 *
 * Persists the param through Drive-triggered window.location.reload()
 * via sessionStorage, then decodes and shape-validates the GameRecord array.
 */

import { useEffect, useState } from 'react'
import { decodeShareParam } from '../lib/shareUrl'
import { resolveShortLink } from '../lib/firebaseShortUrl'
import type { GameRecord } from '../components/StorytellerSub/types'

export type TabKey = 'scripts' | 'characters' | 'storyteller' | 'printstudio' | 'analytics' | 'settings'

const ACTIVE_TAB_KEY = 'botc-active-tab'
const PENDING_AR_KEY = 'BOTC_PENDING_AR'
const PENDING_SL_KEY = 'BOTC_PENDING_SL'

export interface ShareParamState {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
  sharedAnalyticsRecords: GameRecord[] | null
  shareDecodeError: string | null
  clearSharedRecords: () => void
  /** ?deal=<id> param — present means render deal page instead of normal UI */
  dealSessionId: string | null
  /** ?host=<token> param — set when ST opens their own host link */
  dealHostToken: string | null
}

export function useShareParam(): ShareParamState {
  // Read deal params once on mount — constant for page lifetime
  const dealSessionId = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('deal')
  })[0]
  const dealHostToken = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('host')
  })[0]

  const [activeTab, setActiveTabState] = useState<TabKey>(() => {
    const params = new URLSearchParams(window.location.search)
    // ?deal= takes over the whole page — keep last saved tab (don't redirect to analytics)
    if (params.has('deal')) {
      try { return (localStorage.getItem(ACTIVE_TAB_KEY) as TabKey) ?? 'scripts' } catch { return 'scripts' }
    }
    if (params.has('ar') || params.has('sl') || sessionStorage.getItem(PENDING_AR_KEY) || sessionStorage.getItem(PENDING_SL_KEY)) return 'analytics'
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

  // Decode share params on mount — handles ?sl= (Firebase short link) and ?ar= (long URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    function cleanUrl(param: string) {
      const clean = new URL(window.location.href)
      clean.searchParams.delete(param)
      window.history.replaceState({}, '', clean.toString())
    }

    function decodeAndSet(ar: string, pendingKey: string) {
      return decodeShareParam<GameRecord[]>(ar)
        .then((decoded) => {
          if (!Array.isArray(decoded)) throw new Error('Decoded data is not an array')
          const valid = decoded.filter(
            (r): r is GameRecord =>
              r !== null &&
              typeof r === 'object' &&
              typeof (r as GameRecord).id === 'string' &&
              typeof (r as GameRecord).endedAt === 'number',
          )
          setSharedAnalyticsRecords(valid)
          sessionStorage.removeItem(pendingKey)
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e)
          setShareDecodeError(`Failed to load shared records: ${msg}`)
          sessionStorage.removeItem(pendingKey)
        })
    }

    // ?sl= short link — resolve via Firestore then decode
    const slFromUrl = params.get('sl')
    const slPending = slFromUrl ?? sessionStorage.getItem(PENDING_SL_KEY)
    if (slPending) {
      sessionStorage.setItem(PENDING_SL_KEY, slPending)
      if (slFromUrl) cleanUrl('sl')
      resolveShortLink(slPending)
        .then((encoded) => {
          if (!encoded) {
            setShareDecodeError('Share link expired or not found.')
            sessionStorage.removeItem(PENDING_SL_KEY)
            return
          }
          return decodeAndSet(encoded, PENDING_SL_KEY)
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e)
          setShareDecodeError(`Failed to load short link: ${msg}`)
          sessionStorage.removeItem(PENDING_SL_KEY)
        })
      return
    }

    // ?ar= long encoded URL — decode directly
    const arFromUrl = params.get('ar')
    const ar = arFromUrl ?? sessionStorage.getItem(PENDING_AR_KEY)
    if (!ar) return
    sessionStorage.setItem(PENDING_AR_KEY, ar)
    if (arFromUrl) cleanUrl('ar')
    decodeAndSet(ar, PENDING_AR_KEY)
  }, [])

  const clearSharedRecords = () => {
    setSharedAnalyticsRecords(null)
    setShareDecodeError(null)
    sessionStorage.removeItem(PENDING_AR_KEY)
    sessionStorage.removeItem(PENDING_SL_KEY)
  }

  return {
    activeTab,
    setActiveTab,
    sharedAnalyticsRecords,
    shareDecodeError,
    clearSharedRecords,
    dealSessionId,
    dealHostToken,
  }
}
