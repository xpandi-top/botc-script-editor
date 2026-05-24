/**
 * useShareParam — URL-param driven navigation + share decoding.
 *
 * Params handled:
 *  ?t=<tab>      — active tab (scripts|characters|storyteller|analytics|...)
 *  ?s=<slug>     — open a specific built-in script on scripts tab
 *  ?ss=<shortId> — decode a custom script from Firebase short link
 *  ?ar=<encoded> — analytics share (long encoded URL)
 *  ?sl=<shortId> — analytics share (Firebase short link)
 *  ?deal=<id>    — card-deal session
 *  ?host=<token> — deal host token
 */

import { useEffect, useState } from 'react'
import { decodeShareParam } from '../lib/shareUrl'
import { resolveShortLink } from '../lib/firebaseShortUrl'
import type { GameRecord } from '../components/StorytellerSub/types'
import type { EditableScript } from '../types'

export type TabKey = 'scripts' | 'characters' | 'storyteller' | 'printstudio' | 'analytics' | 'settings'

const ACTIVE_TAB_KEY = 'botc-active-tab'
const PENDING_AR_KEY = 'BOTC_PENDING_AR'
const PENDING_SL_KEY = 'BOTC_PENDING_SL'
const PENDING_SS_KEY = 'BOTC_PENDING_SS'

const VALID_TABS = new Set<TabKey>(['scripts', 'characters', 'storyteller', 'printstudio', 'analytics', 'settings'])

function isValidTab(v: string | null): v is TabKey {
  return !!v && VALID_TABS.has(v as TabKey)
}

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
  /** ?s=<slug> — slug of built-in script to open on load */
  initialScriptSlug: string | null
  /** Decoded custom script from ?ss= short link */
  sharedScript: EditableScript | null
  sharedScriptError: string | null
  clearSharedScript: () => void
}

/** Update URL without navigation, preserving unrelated params. */
export function updateUrlParams(updates: Record<string, string | null>) {
  try {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) url.searchParams.delete(k)
      else url.searchParams.set(k, v)
    }
    window.history.replaceState({}, '', url.toString())
  } catch {
    // Non-standard origin (capacitor, file://) — skip URL update silently
  }
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

  // ?s= initial script slug (built-in only, stable)
  const initialScriptSlug = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('s')
  })[0]

  const [activeTab, setActiveTabState] = useState<TabKey>(() => {
    const params = new URLSearchParams(window.location.search)
    // ?deal= takes over the whole page — keep last saved tab
    if (params.has('deal')) {
      try { return (localStorage.getItem(ACTIVE_TAB_KEY) as TabKey) ?? 'scripts' } catch { return 'scripts' }
    }
    // Explicit ?t= param takes highest priority
    const tParam = params.get('t')
    if (isValidTab(tParam)) return tParam
    // Legacy: ?ar=/?sl= always opens analytics
    if (params.has('ar') || params.has('sl') || sessionStorage.getItem(PENDING_AR_KEY) || sessionStorage.getItem(PENDING_SL_KEY)) return 'analytics'
    // ?s= or ?ss= opens scripts tab
    if (params.has('s') || params.has('ss') || sessionStorage.getItem(PENDING_SS_KEY)) return 'scripts'
    try { return (localStorage.getItem(ACTIVE_TAB_KEY) as TabKey) ?? 'scripts' } catch { return 'scripts' }
  })

  const [sharedAnalyticsRecords, setSharedAnalyticsRecords] = useState<GameRecord[] | null>(null)
  const [shareDecodeError, setShareDecodeError] = useState<string | null>(null)
  const [sharedScript, setSharedScript] = useState<EditableScript | null>(null)
  const [sharedScriptError, setSharedScriptError] = useState<string | null>(null)

  // Persist active tab to localStorage
  const setActiveTab = (tab: TabKey) => {
    setActiveTabState(tab)
    try { localStorage.setItem(ACTIVE_TAB_KEY, tab) } catch {}
  }

  useEffect(() => {
    try { localStorage.setItem(ACTIVE_TAB_KEY, activeTab) } catch {}
  }, [activeTab])

  // Decode share params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    function cleanUrl(param: string) {
      const clean = new URL(window.location.href)
      clean.searchParams.delete(param)
      window.history.replaceState({}, '', clean.toString())
    }

    function decodeAndSetAnalytics(ar: string, pendingKey: string) {
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

    // ── ?ss= custom script short link ─────────────────────────────────────────
    const ssFromUrl = params.get('ss')
    const ssPending = ssFromUrl ?? sessionStorage.getItem(PENDING_SS_KEY)
    if (ssPending) {
      sessionStorage.setItem(PENDING_SS_KEY, ssPending)
      if (ssFromUrl) cleanUrl('ss')
      resolveShortLink(ssPending)
        .then(async (encoded) => {
          if (!encoded) {
            setSharedScriptError('Script share link expired or not found.')
            sessionStorage.removeItem(PENDING_SS_KEY)
            return
          }
          try {
            const script = await decodeShareParam<EditableScript>(encoded)
            if (!script || typeof script.slug !== 'string') throw new Error('Invalid script data')
            setSharedScript(script)
          } catch (e: unknown) {
            setSharedScriptError(e instanceof Error ? e.message : String(e))
          }
          sessionStorage.removeItem(PENDING_SS_KEY)
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e)
          setSharedScriptError(`Failed to load script link: ${msg}`)
          sessionStorage.removeItem(PENDING_SS_KEY)
        })
      return  // processed, skip analytics params below
    }

    // ── ?sl= analytics short link ─────────────────────────────────────────────
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
          return decodeAndSetAnalytics(encoded, PENDING_SL_KEY)
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e)
          setShareDecodeError(`Failed to load short link: ${msg}`)
          sessionStorage.removeItem(PENDING_SL_KEY)
        })
      return
    }

    // ── ?ar= analytics long URL ───────────────────────────────────────────────
    const arFromUrl = params.get('ar')
    const ar = arFromUrl ?? sessionStorage.getItem(PENDING_AR_KEY)
    if (!ar) return
    sessionStorage.setItem(PENDING_AR_KEY, ar)
    if (arFromUrl) cleanUrl('ar')
    decodeAndSetAnalytics(ar, PENDING_AR_KEY)
  }, [])

  const clearSharedRecords = () => {
    setSharedAnalyticsRecords(null)
    setShareDecodeError(null)
    sessionStorage.removeItem(PENDING_AR_KEY)
    sessionStorage.removeItem(PENDING_SL_KEY)
  }

  const clearSharedScript = () => {
    setSharedScript(null)
    setSharedScriptError(null)
    sessionStorage.removeItem(PENDING_SS_KEY)
  }

  return {
    activeTab,
    setActiveTab,
    sharedAnalyticsRecords,
    shareDecodeError,
    clearSharedRecords,
    dealSessionId,
    dealHostToken,
    initialScriptSlug,
    sharedScript,
    sharedScriptError,
    clearSharedScript,
  }
}
