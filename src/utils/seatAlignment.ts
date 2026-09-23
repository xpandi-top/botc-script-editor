import { getCharacterById } from '../catalog'
import type { Phase, StorytellerSeat } from '../components/StorytellerSub/types'

export type Alignment = 'good' | 'evil'

export function defaultAlignment(characterId: string | null): Alignment | null {
  const team = characterId ? getCharacterById(characterId)?.team : undefined
  if (team === 'minion' || team === 'demon') return 'evil'
  if (team === 'townsfolk' || team === 'outsider') return 'good'
  return null // Travellers require an explicit storyteller decision.
}

export function seatAlignment(seat: Pick<StorytellerSeat, 'characterId' | 'teamTag'>): Alignment | null {
  return seat.teamTag ?? defaultAlignment(seat.characterId)
}

export function canViewSecrets(phase: Phase, showCharacters: boolean, privateView = false): boolean {
  return privateView || (phase === 'night' && showCharacters)
}

/** Freeze the current alignment before changing role, including legacy seats. */
export function preserveAlignment(before: StorytellerSeat, after: StorytellerSeat): StorytellerSeat {
  if (before.characterId === after.characterId || before.teamTag !== after.teamTag) return after
  return { ...after, teamTag: seatAlignment(before) ?? defaultAlignment(after.characterId) }
}
