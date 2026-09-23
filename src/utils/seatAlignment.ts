import { getCharacterById } from '../catalog'
import type { Phase, StorytellerSeat } from '../components/StorytellerSub/types'
import { defaultAlignmentWith, preserveAlignmentWith, seatAlignmentWith, type Alignment, type TeamLookup } from '../core/engine/alignment'

export type { Alignment } from '../core/engine/alignment'

/** Team lookup over the live catalog (bundled + custom characters). */
export const catalogTeamOf: TeamLookup = (characterId) => getCharacterById(characterId)?.team

export function defaultAlignment(characterId: string | null): Alignment | null {
  // Travellers require an explicit storyteller decision (null).
  return defaultAlignmentWith(catalogTeamOf, characterId)
}

export function seatAlignment(seat: Pick<StorytellerSeat, 'characterId' | 'teamTag'>): Alignment | null {
  return seatAlignmentWith(catalogTeamOf, seat)
}

export function canViewSecrets(phase: Phase, showCharacters: boolean): boolean {
  return phase === 'night' && showCharacters
}

/** Freeze the current alignment before changing role, including legacy seats. */
export function preserveAlignment(before: StorytellerSeat, after: StorytellerSeat): StorytellerSeat {
  return preserveAlignmentWith(catalogTeamOf, before, after)
}
