import type { DayState, GameRecord, IdentityHistory, IdentityState, PlayerSummary, StorytellerSeat } from '../components/StorytellerSub/types'
import { seatAlignment } from './seatAlignment'

export type IdentityBasis = 'initial' | 'final'
const identity = (seat: StorytellerSeat): IdentityState => ({ characterId: seat.characterId, team: seatAlignment(seat) })
const differs = (a: IdentityState, b: IdentityState) => a.characterId !== b.characterId || a.team !== b.team

export function createIdentityHistory(seats: StorytellerSeat[], complete = true): IdentityHistory {
  return { complete, initial: seats.map(s => ({ seat: s.seat, ...identity(s) })), changes: [] }
}

/** Called inside the state updater; undo restores history together with the seats. */
export function trackIdentityUpdates(previous: DayState[], next: DayState[]): DayState[] {
  return next.map(day => {
    const before = previous.find(d => d.id === day.id)
    if (!before || before === day) return day
    const changes = day.seats.flatMap(seat => {
      const old = before.seats.find(s => s.seat === seat.seat)
      return old && differs(identity(old), identity(seat))
        ? [{ seat: seat.seat, at: Date.now(), phase: day.phase, from: identity(old), to: identity(seat) }] : []
    })
    const added = day.seats.filter(s => !before.seats.some(old => old.seat === s.seat))
    if (!changes.length && !added.length) return day
    const history = before.identityHistory ?? createIdentityHistory(before.seats, false)
    return { ...day, identityHistory: {
      ...history,
      initial: [...history.initial, ...added.map(s => ({ seat: s.seat, ...identity(s) }))],
      changes: [...history.changes, ...changes],
    } }
  })
}

/** Missing legacy history is unknown, never zero. Initial assignment is not a role change. */
export function summarizeIdentities(days: DayState[]): PlayerSummary[] {
  const ordered = [...days].sort((a, b) => a.day - b.day)
  const seats = new Map<number, StorytellerSeat>()
  ordered.forEach(d => d.seats.forEach(s => seats.set(s.seat, s)))
  return [...seats.values()].map(seat => {
    const relevant = ordered.filter(d => d.seats.some(s => s.seat === seat.seat))
    const complete = relevant.every(d => d.identityHistory?.complete)
    const states: IdentityState[] = []
    relevant.forEach(d => {
      const initial = d.identityHistory?.initial.find(s => s.seat === seat.seat)
      if (initial) states.push(initial)
      d.identityHistory?.changes.filter(c => c.seat === seat.seat).forEach(c => states.push(c.from, c.to))
      states.push(identity(d.seats.find(s => s.seat === seat.seat)!))
    })
    const roles = states.map(s => s.characterId).filter((s): s is string => !!s)
    const teams = states.map(s => s.team).filter((s): s is 'good' | 'evil' => !!s)
    const count = (values: string[]) => values.reduce((n, v, i) => n + (i > 0 && v !== values[i - 1] ? 1 : 0), 0)
    const final = identity(seat)
    return {
      seat: seat.seat, name: seat.name, team: final.team,
      initialCharacterId: complete ? roles[0] ?? null : null,
      initialTeam: complete ? teams[0] ?? null : null,
      finalCharacterId: final.characterId, finalTeam: final.team,
      characterChangeCount: complete ? count(roles) : null,
      alignmentChangeCount: complete ? count(teams) : null,
      historyComplete: complete,
    }
  })
}

export function recordPlayers(record: GameRecord): PlayerSummary[] {
  const derived = record.savedDays?.length ? summarizeIdentities(record.savedDays) : []
  return (record.playerSummaries ?? derived).map(p => ({
    ...derived.find(d => d.seat === p.seat),
    ...p,
    finalCharacterId: p.finalCharacterId !== undefined ? p.finalCharacterId : record.setup?.assignments?.[p.seat] ?? derived.find(d => d.seat === p.seat)?.finalCharacterId ?? null,
    finalTeam: p.finalTeam !== undefined ? p.finalTeam : p.team,
  }))
}

export function identityForBasis(p: PlayerSummary, basis: IdentityBasis): IdentityState {
  return basis === 'initial'
    ? { characterId: p.initialCharacterId ?? null, team: p.initialTeam ?? null }
    : { characterId: p.finalCharacterId ?? null, team: p.finalTeam ?? p.team }
}

export function normalizeIdentityHistory(value: unknown): IdentityHistory | undefined {
  if (!value || typeof value !== 'object') return undefined
  const h = value as IdentityHistory
  const validState = (s: IdentityState) => s && (s.characterId === null || typeof s.characterId === 'string') && (s.team === null || s.team === 'good' || s.team === 'evil')
  if (typeof h.complete !== 'boolean' || !Array.isArray(h.initial) || !Array.isArray(h.changes)) return undefined
  if (!h.initial.every(s => validState(s) && Number.isInteger(s.seat))) return undefined
  if (!h.changes.every(c => c && Number.isInteger(c.seat) && Number.isFinite(c.at) && typeof c.phase === 'string' && validState(c.from) && validState(c.to))) return undefined
  return h
}
