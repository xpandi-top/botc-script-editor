/**
 * Who sees what (decision D7 in docs/ARCHITECTURE-API.md). The storyteller
 * view is the whole game; the public view is what the town knows; a seat
 * view adds that player's own character as they believe it to be.
 *
 * Public data is built from an allow-list, so new fields stay private until
 * someone decides they are public.
 */
import type { DayState, EventLogEntry, StorytellerSeat, VoteRecord } from '../types/game'
import type { EngineGame } from './commands'
import { currentDayOf, describeEvent } from './commands'
import type { GameEvent } from './events'

/** Event codes whose entries are public knowledge. Everything else (and all free-text notes) stays with the storyteller. */
export const PUBLIC_EVENT_CODES: ReadonlySet<string> = new Set([
  'seat.alive', 'seat.died', 'seat.executed', 'seat.unexecuted',
  'seat.traveler', 'seat.untraveler', 'seat.noVote', 'seat.voteRestored',
  'seat.publicTag.added', 'seat.publicTag.removed',
  'nomination.failed', 'vote.recorded',
])

export type PublicSeat = Pick<StorytellerSeat, 'seat' | 'name' | 'alive' | 'isTraveler' | 'isExecuted' | 'hasNoVote'> & {
  voteTokens?: number
  /** Public reminder tags (the 📝 prefix and source character are stripped). */
  tags: string[]
}

export type PublicEvent = { id: string; timestamp: number; day: number; phase: string; code: string; params: EventLogEntry['params']; detail: string }

export type PublicDay = {
  day: number
  phase: DayState['phase']
  nominationStep: DayState['nominationStep']
  seats: PublicSeat[]
  nomination: { actor: number | null; target: number | null; isExile: boolean } | null
  voting: { order: number[]; index: number; votes: Record<number, boolean> } | null
  votes: Array<Pick<VoteRecord, 'actor' | 'target' | 'voters' | 'voteCount' | 'requiredVotes' | 'passed'> & { failed?: boolean; isExile?: boolean }>
  gameEnded: boolean
}

export type PublicGameView = { version: number; day: PublicDay; events: PublicEvent[] }

export type SeatGameView = PublicGameView & {
  seat: number
  /** The character this player was told they are (for the Drunk etc. this differs from the truth). */
  character: string | null
}

const publicTag = (tag: string) => {
  const body = tag.startsWith('📝') ? tag.slice(2) : tag
  const sep = body.indexOf('::')
  return sep === -1 ? body : body.slice(0, sep)
}

export function publicSeat(seat: StorytellerSeat): PublicSeat {
  return {
    seat: seat.seat,
    name: seat.name,
    alive: seat.alive,
    isTraveler: seat.isTraveler,
    isExecuted: seat.isExecuted,
    hasNoVote: seat.hasNoVote,
    ...(seat.voteTokens !== undefined ? { voteTokens: seat.voteTokens } : {}),
    tags: seat.customTags.map(publicTag),
  }
}

function publicDay(day: DayState): PublicDay {
  const inNomination = day.phase === 'nomination' && (day.voteDraft.actor !== null || day.voteDraft.target !== null)
  return {
    day: day.day,
    phase: day.phase,
    nominationStep: day.nominationStep,
    seats: day.seats.map(publicSeat),
    nomination: inNomination ? { actor: day.voteDraft.actor, target: day.voteDraft.target, isExile: day.voteDraft.isExile } : null,
    voting: day.votingState ? { order: day.votingState.votingOrder, index: day.votingState.votingIndex, votes: day.votingState.votes } : null,
    votes: day.voteHistory.map((v) => ({
      actor: v.actor, target: v.target, voters: v.voters, voteCount: v.voteCount, requiredVotes: v.requiredVotes, passed: v.passed,
      ...(v.failed ? { failed: true } : {}), ...(v.isExile ? { isExile: true } : {}),
    })),
    gameEnded: day.gameEnded,
  }
}

/** Tag events keep only the seat and label; the source character stays private. */
function publicParams(e: EventLogEntry): EventLogEntry['params'] {
  if (e.code?.startsWith('seat.publicTag.') && e.params) return { seat: e.params.seat ?? null, label: e.params.label ?? null }
  return e.params
}

export function publicEvents(game: EngineGame): PublicEvent[] {
  return game.days.flatMap((d) => d.eventLog
    .filter((e) => e.code && PUBLIC_EVENT_CODES.has(e.code) && e.visibility !== 'st-only')
    .map((e) => {
      const params = publicParams(e)
      // Text is regenerated from the public code/params: stored text may name private details.
      const detail = describeEvent({ code: e.code, params } as GameEvent).detail
      return { id: e.id, timestamp: e.timestamp, day: d.day, phase: e.phase, code: e.code!, params, detail }
    }))
}

export function publicView(game: EngineGame): PublicGameView {
  return { version: game.version, day: publicDay(currentDayOf(game)), events: publicEvents(game) }
}

export function seatView(game: EngineGame, seatNumber: number): SeatGameView | null {
  const seat = currentDayOf(game).seats.find((s) => s.seat === seatNumber)
  if (!seat) return null
  return { ...publicView(game), seat: seatNumber, character: seat.userCharacterId ?? seat.characterId }
}
