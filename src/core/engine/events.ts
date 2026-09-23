/**
 * Structured game events. Each event-log entry keeps its localized `detail`
 * text for display, and — for the events below — also carries a stable
 * `code` plus `params`, so agents and the API can read the log without
 * parsing prose (docs/ARCHITECTURE-API.md, decision D3).
 */
import type { StorytellerSeat } from '../types/game'
import { preserveAlignmentWith, seatAlignmentWith, type Alignment, type TeamLookup } from './alignment'
import { voteTokensAfterLifeChange } from './votes'

export type SeatFlagEventCode =
  | 'seat.alive'
  | 'seat.died'
  | 'seat.executed'
  | 'seat.unexecuted'
  | 'seat.traveler'
  | 'seat.untraveler'
  | 'seat.noVote'
  | 'seat.voteRestored'

export type TagEventCode = 'seat.publicTag.added' | 'seat.publicTag.removed' | 'seat.stTag.added' | 'seat.stTag.removed'

export type GameEvent =
  | { code: SeatFlagEventCode; params: { seat: number } }
  | { code: 'seat.character'; params: { seat: number; from: string | null; to: string | null } }
  | { code: 'seat.alignment'; params: { seat: number; from: Alignment | null; to: Alignment | null } }
  | { code: 'seat.perceived'; params: { seat: number; from: string | null; to: string | null } }
  | { code: TagEventCode; params: { seat: number; tag: string; label: string; sourceCharId: string | null } }
  | { code: 'setup.character'; params: { seat: number; from: string | null; to: string | null } }
  | { code: 'nomination.failed'; params: { actor: number | null; target: number | null } }
  | { code: 'vote.recorded'; params: { actor: number; target: number; passed: boolean; voteCount: number; requiredVotes: number } }
  | { code: 'skill.used'; params: { actor: number | null; roleId: string; phase: string } }

export type GameEventCode = GameEvent['code']

/**
 * Split a seat tag into its label and optional source character.
 * Tags look like `label`, `📝label` or `📝label::charId`. Public tags only
 * carry a source when prefixed with 📝; ST tags accept `label::charId` too.
 */
export function parseSeatTag(tag: string, scope: 'public' | 'st'): { label: string; sourceCharId: string | null } {
  if (scope === 'public' && !tag.startsWith('📝')) return { label: tag, sourceCharId: null }
  const body = tag.startsWith('📝') ? tag.slice(2) : tag
  const sep = body.indexOf('::')
  return sep === -1 ? { label: body, sourceCharId: null } : { label: body.slice(0, sep), sourceCharId: body.slice(sep + 2) || null }
}

/**
 * Apply a storyteller edit to a seat: keep the old alignment when only the
 * character changed, and grant an Odyssey vote token on death.
 */
export function applySeatEdit(getTeam: TeamLookup, before: StorytellerSeat, edited: StorytellerSeat): StorytellerSeat {
  const next = preserveAlignmentWith(getTeam, before, edited)
  // Dying grants a vote token (Odyssey). Harmless on official rosters —
  // nothing reads voteTokens there.
  const voteTokens = voteTokensAfterLifeChange(next, before.alive)
  return voteTokens === next.voteTokens ? next : { ...next, voteTokens }
}

/** Events describing how a seat changed, in the order the log has always shown them. */
export function diffSeat(getTeam: TeamLookup, before: StorytellerSeat, after: StorytellerSeat): GameEvent[] {
  const seat = after.seat
  const events: GameEvent[] = []
  const flag = (was: boolean, is: boolean, on: SeatFlagEventCode, off: SeatFlagEventCode) => {
    if (was !== is) events.push({ code: is ? on : off, params: { seat } })
  }
  flag(before.alive, after.alive, 'seat.alive', 'seat.died')
  flag(before.isExecuted, after.isExecuted, 'seat.executed', 'seat.unexecuted')
  flag(before.isTraveler, after.isTraveler, 'seat.traveler', 'seat.untraveler')
  flag(before.hasNoVote, after.hasNoVote, 'seat.noVote', 'seat.voteRestored')
  if (before.characterId !== after.characterId && (before.characterId || after.characterId)) {
    events.push({ code: 'seat.character', params: { seat, from: before.characterId, to: after.characterId } })
  }
  const alignBefore = seatAlignmentWith(getTeam, before)
  const alignAfter = seatAlignmentWith(getTeam, after)
  if (alignBefore !== alignAfter) events.push({ code: 'seat.alignment', params: { seat, from: alignBefore, to: alignAfter } })
  if (before.userCharacterId !== after.userCharacterId) {
    events.push({ code: 'seat.perceived', params: { seat, from: before.userCharacterId, to: after.userCharacterId } })
  }
  const tagEvents = (oldTags: string[], newTags: string[], scope: 'public' | 'st') => {
    const [addedCode, removedCode]: [TagEventCode, TagEventCode] = scope === 'public'
      ? ['seat.publicTag.added', 'seat.publicTag.removed']
      : ['seat.stTag.added', 'seat.stTag.removed']
    for (const tag of newTags.filter((t) => !oldTags.includes(t))) events.push({ code: addedCode, params: { seat, tag, ...parseSeatTag(tag, scope) } })
    for (const tag of oldTags.filter((t) => !newTags.includes(t))) events.push({ code: removedCode, params: { seat, tag, ...parseSeatTag(tag, scope) } })
  }
  tagEvents(before.customTags, after.customTags, 'public')
  tagEvents(before.stTags || [], after.stTags || [], 'st')
  return events
}
