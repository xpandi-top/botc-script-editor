/**
 * The storyteller's wake list for tonight: the global night order narrowed to
 * the characters in play, with the seats to wake, their state (dead, drunk,
 * poisoned) and the reminder text. Players who believe they are another
 * character (the Drunk, Lunatic, Marionette…) are listed under the character
 * they think they are, flagged `perceived`, so the ST wakes them at that step.
 */
import type { DayState, StorytellerSeat } from '../types/game'
import { parseSeatTag } from './events'

export type NightScriptLookup = {
  /** The global order for that night, including placeholders such as DUSK / MINION_INFO / DEMON_INFO / DAWN. */
  order: readonly string[]
  name(id: string): string | undefined
  reminder(id: string): string | undefined
}

export type NightScriptSeat = {
  seat: number
  name: string
  alive: boolean
  /** Woken because they believe they are this character. */
  perceived: boolean
  /** Their true character when `perceived` (for the storyteller only). */
  actualCharacter?: string
  impaired: Array<'drunk' | 'poisoned'>
}

export type NightScriptStep =
  | { kind: 'placeholder'; id: string }
  | { kind: 'character'; id: string; name: string; reminder?: string; seats: NightScriptSeat[] }

/** Minion and Demon info is only given in games of 7+ players (not counting travellers). */
export const MIN_PLAYERS_FOR_EVIL_INFO = 7

const IMPAIRMENT_PATTERNS: Array<[NightScriptSeat['impaired'][number], RegExp]> = [
  ['drunk', /drunk|醉/i],
  ['poisoned', /poison|中毒/i],
]

export function impairmentsOf(seat: Pick<StorytellerSeat, 'characterId' | 'stTags'>): NightScriptSeat['impaired'] {
  const labels = (seat.stTags ?? []).map((t) => parseSeatTag(t, 'st').label)
  const found = new Set<NightScriptSeat['impaired'][number]>()
  if (seat.characterId === 'drunk') found.add('drunk')
  for (const [kind, pattern] of IMPAIRMENT_PATTERNS) if (labels.some((l) => pattern.test(l))) found.add(kind)
  return [...found]
}

export function buildNightScript(day: Pick<DayState, 'seats'>, lookup: NightScriptLookup, opts: { includeDead?: boolean } = {}): NightScriptStep[] {
  const regularPlayers = day.seats.filter((s) => !s.isTraveler).length
  const steps: NightScriptStep[] = []
  for (const id of lookup.order) {
    if (/^[A-Z_]+$/.test(id)) {
      if ((id === 'MINION_INFO' || id === 'DEMON_INFO') && regularPlayers < MIN_PLAYERS_FOR_EVIL_INFO) continue
      steps.push({ kind: 'placeholder', id })
      continue
    }
    const seats: NightScriptSeat[] = []
    for (const s of day.seats) {
      const actual = s.characterId === id
      const believes = !actual && s.userCharacterId === id
      if (!actual && !believes) continue
      // A seat whose own role is replaced by a belief wakes as the believed character only.
      if (actual && s.userCharacterId && s.userCharacterId !== id) continue
      if (!s.alive && !opts.includeDead) continue
      seats.push({
        seat: s.seat,
        name: s.name,
        alive: s.alive,
        perceived: believes,
        ...(believes && s.characterId ? { actualCharacter: s.characterId } : {}),
        impaired: impairmentsOf(s),
      })
    }
    if (seats.length === 0) continue
    const reminder = lookup.reminder(id)
    steps.push({ kind: 'character', id, name: lookup.name(id) ?? id, ...(reminder ? { reminder } : {}), seats })
  }
  return steps
}
