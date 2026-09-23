import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { DEAL_SESSION_CHANGED_EVENT, GAME_DEAL_KEY, subscribeSeatClaims } from '../lib/DealSession'
import type { DealSeatClaim } from '../lib/DealSession'
import type { DayState } from '../components/StorytellerSub/types'

function subscribeSessionChange(notify: () => void) {
  window.addEventListener('storage', notify)
  window.addEventListener(DEAL_SESSION_CHANGED_EVENT, notify)
  return () => {
    window.removeEventListener('storage', notify)
    window.removeEventListener(DEAL_SESSION_CHANGED_EVENT, notify)
  }
}

export function syncClaimedNames(days: DayState[], claims: DealSeatClaim[]): DayState[] {
  const names = new Map(claims.filter(c => c.claimedByToken && c.playerName?.trim()).map(c => [c.seatNumber, c.playerName!.trim()]))
  let changed = false
  const updated = days.map(day => {
    let dayChanged = false
    const seats = day.seats.map(seat => {
      const name = names.get(seat.seat)
      if (!name || name === seat.name) return seat
      dayChanged = changed = true
      return { ...seat, name }
    })
    return dayChanged ? { ...day, seats } : day
  })
  return changed ? updated : days
}

/** Subscribe outside the assignment dialog so claims keep syncing after it closes. */
export function useDealRoster(gameId: string, setDays: Dispatch<SetStateAction<DayState[]>>) {
  const stored = useSyncExternalStore(subscribeSessionChange, () => {
    try { return localStorage.getItem(GAME_DEAL_KEY(gameId)) } catch { return null }
  })
  const session = useMemo(() => {
    try {
      const value = JSON.parse(stored ?? 'null')
      return typeof value?.sessionId === 'string' ? value as { sessionId: string; hostToken: string } : null
    } catch { return null }
  }, [stored])

  useEffect(() => {
    if (!session) return
    let active = true
    const unsubscribe = subscribeSeatClaims(session.sessionId, claims => {
      if (active) setDays(days => syncClaimedNames(days, claims))
    })
    return () => { active = false; unsubscribe() }
  }, [gameId, session?.sessionId, setDays])
  return session
}
