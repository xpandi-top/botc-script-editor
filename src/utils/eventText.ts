/**
 * Localized log text for structured game events (src/core/engine/events.ts).
 * The strings match what the event log has always shown, so switching a call
 * site to structured events changes no visible text.
 */
import { getDisplayName } from '../catalog'
import type { Language } from '../types'
import type { EventLogEntry } from '../components/StorytellerSub/types'
import type { GameEvent } from '../core/engine/events'
import { translateStTag } from '../components/StorytellerSub/Arena/ArenaSeatComponents'
import { logDetail, logPhrase } from './logI18n'

type EventPresentation = { kind: EventLogEntry['kind']; detail: string; visibility?: 'public' | 'st-only' }

const charName = (id: string | null, language: Language) => (id ? getDisplayName(id, language) : '—')

/** Log kind, localized detail and visibility for a seat event. */
export function presentSeatEvent(event: GameEvent, language: Language): EventPresentation | null {
  switch (event.code) {
    case 'seat.alive': return { kind: 'stateChange', detail: logDetail.seatAlive(language, event.params.seat) }
    case 'seat.died': return { kind: 'stateChange', detail: logDetail.seatDead(language, event.params.seat) }
    case 'seat.executed': return { kind: 'stateChange', detail: logDetail.seatExecuted(language, event.params.seat) }
    case 'seat.unexecuted': return { kind: 'stateChange', detail: logDetail.seatUnexecuted(language, event.params.seat) }
    case 'seat.traveler': return { kind: 'stateChange', detail: logDetail.seatTraveler(language, event.params.seat) }
    case 'seat.untraveler': return { kind: 'stateChange', detail: logDetail.seatUntraveler(language, event.params.seat) }
    case 'seat.noVote': return { kind: 'stateChange', detail: logDetail.seatNoVote(language, event.params.seat) }
    case 'seat.voteRestored': return { kind: 'stateChange', detail: logDetail.seatUnNoVote(language, event.params.seat) }
    case 'seat.character': {
      const { seat, from, to } = event.params
      if (from && to) return { kind: 'tagChange', detail: `#${seat} ${logPhrase(language, 'roleChanged')}: ${charName(from, language)} → ${charName(to, language)}` }
      if (to) return { kind: 'tagChange', detail: `#${seat} ${logPhrase(language, 'roleAssigned')}: ${charName(to, language)}` }
      return { kind: 'tagChange', detail: `#${seat} ${logPhrase(language, 'roleCleared')}: ${charName(from, language)}` }
    }
    case 'seat.alignment': {
      const { seat, from, to } = event.params
      const label = (a: 'good' | 'evil' | null) => (a ? logPhrase(language, a) : '—')
      return { kind: 'tagChange', detail: `#${seat} ${logPhrase(language, 'teamPrefix')}: ${label(from)} → ${label(to)}`, visibility: 'st-only' }
    }
    case 'seat.perceived': {
      const { seat, from, to } = event.params
      return { kind: 'tagChange', detail: `#${seat} ${language === 'zh' ? '认知角色' : 'Perceived character'}: ${charName(from, language)} → ${charName(to, language)}`, visibility: 'st-only' }
    }
    case 'seat.publicTag.added':
    case 'seat.publicTag.removed': {
      const { seat, label, sourceCharId } = event.params
      const verb = logPhrase(language, event.code === 'seat.publicTag.added' ? 'addTag' : 'removeTag')
      const translatedLabel = translateStTag(label, language)
      if (sourceCharId) return { kind: 'tagChange', detail: `#${seat} ${verb}: [icon:${sourceCharId}] ${getDisplayName(sourceCharId, language)}:${translatedLabel}` }
      return { kind: 'tagChange', detail: `#${seat} ${verb}: ${translatedLabel}` }
    }
    case 'seat.stTag.added':
    case 'seat.stTag.removed': {
      const { seat, label, sourceCharId } = event.params
      const verb = logPhrase(language, event.code === 'seat.stTag.added' ? 'addST' : 'removeST')
      const iconPart = sourceCharId ? `[icon:${sourceCharId}] ` : ''
      return { kind: 'tagChange', detail: `#${seat} ${verb}: ${iconPart}${translateStTag(label, language)}` }
    }
    default:
      return null
  }
}

/** The structured part stored on an event-log entry. */
export function eventFields(event: GameEvent): Pick<EventLogEntry, 'code' | 'params'> {
  return { code: event.code, params: event.params }
}
