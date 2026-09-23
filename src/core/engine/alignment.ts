/**
 * Good/evil alignment rules. The character catalog is injected as a
 * TeamLookup so the rules run without the web app's catalog module.
 */
import type { Team } from '../types/catalog'
import type { StorytellerSeat } from '../types/game'

export type Alignment = 'good' | 'evil'

/** Team of a character id, or undefined when the id is unknown. */
export type TeamLookup = (characterId: string) => Team | undefined

/** Alignment a character starts with; travellers (and unknown ids) need an explicit ST decision. */
export function alignmentForTeam(team: Team | undefined): Alignment | null {
  if (team === 'minion' || team === 'demon') return 'evil'
  if (team === 'townsfolk' || team === 'outsider') return 'good'
  return null
}

export function defaultAlignmentWith(getTeam: TeamLookup, characterId: string | null): Alignment | null {
  return alignmentForTeam(characterId ? getTeam(characterId) : undefined)
}

/** The seat's explicit team tag, else the default for its character. */
export function seatAlignmentWith(getTeam: TeamLookup, seat: Pick<StorytellerSeat, 'characterId' | 'teamTag'>): Alignment | null {
  return seat.teamTag ?? defaultAlignmentWith(getTeam, seat.characterId)
}

/**
 * Team tag set when a character is dealt at game setup: evil for minions and
 * demons, good for every other known character (including travellers and
 * fabled), null for unknown ids. Deliberately broader than alignmentForTeam —
 * this matches how new games have always been dealt.
 */
export function dealtTeamTag(getTeam: TeamLookup, characterId: string | null): Alignment | null {
  const team = characterId ? getTeam(characterId) : undefined
  if (!team) return null
  return team === 'minion' || team === 'demon' ? 'evil' : 'good'
}

/** Freeze the current alignment before changing role, including legacy seats. */
export function preserveAlignmentWith(getTeam: TeamLookup, before: StorytellerSeat, after: StorytellerSeat): StorytellerSeat {
  if (before.characterId === after.characterId || before.teamTag !== after.teamTag) return after
  return { ...after, teamTag: seatAlignmentWith(getTeam, before) ?? defaultAlignmentWith(getTeam, after.characterId) }
}
