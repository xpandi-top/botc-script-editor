/**
 * Command engine: `applyCommand(game, command, ctx)` → next game + events +
 * UI effects. This is the single write path the API / MCP layer (and a
 * server-authoritative game room) will use; it composes the same pure
 * transitions the web hooks call, so both produce the same state.
 *
 * Pure apart from what `ctx` injects (clock, ids, catalog team lookup, text).
 */
import type { DayState, EventLogEntry, Phase, SkillRecord, StorytellerSeat, TimerDefaults } from '../types/game'
import type { TeamLookup } from './alignment'
import { applySeatEdit, diffSeat, type GameEvent } from './events'
import { applyPhase, createNextDay, nextPhase } from './lifecycle'
import { applyVoteRecord, buildVoteRecord, canStartActorSpeech, canStartTargetSpeech, canStartVoting, castVote, openNominations, rejectNomination, startActorSpeech, startTargetSpeech, startVoting } from './nomination'
import { buildVotingOrder } from './factories'
import { exileThreshold, nominationThreshold } from './seats'
import { computeVotePassed, computeYesCount } from './votes'

export type EngineGame = {
  days: DayState[]
  currentDayId: string
  timers: TimerDefaults
  /** Incremented by every applied command; clients send it back for optimistic concurrency. */
  version: number
}

export type SeatChanges = Partial<Pick<StorytellerSeat, 'name' | 'alive' | 'isExecuted' | 'hasNoVote' | 'isTraveler' | 'characterId' | 'userCharacterId' | 'teamTag' | 'note' | 'voteTokens'>>

export type GameCommand =
  | { type: 'phase.set'; phase: Phase }
  | { type: 'phase.next' }
  | { type: 'day.next' }
  | { type: 'seat.update'; seat: number; changes: SeatChanges }
  | { type: 'seat.tag.add' | 'seat.tag.remove'; seat: number; tag: string; scope: 'public' | 'st' }
  | { type: 'nomination.open' }
  | { type: 'nomination.set'; actor: number | null; target: number | null; isExile?: boolean; note?: string }
  | { type: 'nomination.confirm' }
  | { type: 'nomination.reject' }
  | { type: 'speech.target' }
  | { type: 'vote.start' }
  | { type: 'vote.cast'; seat: number; yes: boolean; weight?: number }
  | { type: 'vote.record'; passed?: boolean; voteCount?: number }
  | { type: 'skill.record'; actor: number; roleId: string; targets?: number[]; statement?: string; note?: string; result?: 'success' | 'failure' | null; visibility?: 'public' | 'st-only' }
  | { type: 'note.log'; text: string; visibility?: 'public' | 'st-only' }
  | { type: 'game.end'; ended?: boolean }

export type GameCommandType = GameCommand['type']

export type EngineEffect = { type: 'timer'; running: boolean }

export type EngineErrorCode = 'unknown_command' | 'unknown_seat' | 'not_allowed' | 'invalid_argument' | 'game_ended'

export type CommandResult =
  | { ok: true; game: EngineGame; events: GameEvent[]; effects: EngineEffect[] }
  | { ok: false; error: { code: EngineErrorCode; message: string } }

export type EventText = { kind: EventLogEntry['kind']; detail: string; visibility?: 'public' | 'st-only' }

export type EngineContext = {
  now: number
  getTeam: TeamLookup
  /** Unique id for log entries and records; defaults to `${now}-${counter}`. */
  makeId?: () => string
  /** Localized text for an event; defaults to terse English (describeEvent). */
  describe?: (event: GameEvent) => EventText
}

/** Terse English log text, used when no localized renderer is injected (API, tests). */
export function describeEvent(event: GameEvent): EventText {
  const p = event.params as Record<string, unknown>
  const seat = `#${p.seat}`
  switch (event.code) {
    case 'seat.alive': return { kind: 'stateChange', detail: `${seat} revived` }
    case 'seat.died': return { kind: 'stateChange', detail: `${seat} died` }
    case 'seat.executed': return { kind: 'stateChange', detail: `${seat} marked executed` }
    case 'seat.unexecuted': return { kind: 'stateChange', detail: `${seat} execution cleared` }
    case 'seat.traveler': return { kind: 'stateChange', detail: `${seat} became traveler` }
    case 'seat.untraveler': return { kind: 'stateChange', detail: `${seat} traveler removed` }
    case 'seat.noVote': return { kind: 'stateChange', detail: `${seat} lost vote token` }
    case 'seat.voteRestored': return { kind: 'stateChange', detail: `${seat} regained vote token` }
    case 'seat.character': return { kind: 'tagChange', detail: `${seat} role: ${p.from ?? '—'} → ${p.to ?? '—'}` }
    case 'setup.character': return { kind: 'tagChange', detail: `${seat}: ${p.from ?? '—'} → ${p.to ?? '—'}` }
    case 'seat.alignment': return { kind: 'tagChange', detail: `${seat} team: ${p.from ?? '—'} → ${p.to ?? '—'}`, visibility: 'st-only' }
    case 'seat.perceived': return { kind: 'tagChange', detail: `${seat} perceived character: ${p.from ?? '—'} → ${p.to ?? '—'}`, visibility: 'st-only' }
    case 'seat.publicTag.added': return { kind: 'tagChange', detail: `${seat} tagged: ${p.label}` }
    case 'seat.publicTag.removed': return { kind: 'tagChange', detail: `${seat} tag removed: ${p.label}` }
    case 'seat.stTag.added': return { kind: 'tagChange', detail: `${seat} ST tag: ${p.label}` }
    case 'seat.stTag.removed': return { kind: 'tagChange', detail: `${seat} ST tag removed: ${p.label}` }
    case 'nomination.failed': return { kind: 'stateChange', detail: `Nomination failed: #${p.actor ?? '?'} → #${p.target ?? '?'}` }
    case 'vote.recorded': return { kind: 'vote', detail: `#${p.actor} nominated #${p.target} — ${p.passed ? 'passed' : 'failed'} (${p.voteCount}/${p.requiredVotes})` }
    case 'skill.used': return { kind: 'skill', detail: `#${p.actor} ${p.roleId} — ${p.phase}`, visibility: 'st-only' }
  }
}

/** The day commands act on. */
export function currentDayOf(game: EngineGame): DayState {
  return game.days.find((d) => d.id === game.currentDayId) ?? game.days[game.days.length - 1]
}

/** Required votes for the current draft (exile uses all seats). */
export function requiredVotesFor(day: DayState): number {
  return day.voteDraft.isExile ? exileThreshold(day.seats) : nominationThreshold(day.seats)
}

export function applyCommand(game: EngineGame, command: GameCommand, ctx: EngineContext): CommandResult {
  let counter = 0
  const makeId = ctx.makeId ?? (() => `${ctx.now}-${++counter}`)
  const describe = ctx.describe ?? describeEvent
  const events: GameEvent[] = []
  const effects: EngineEffect[] = []
  const fail = (code: EngineErrorCode, message: string): CommandResult => ({ ok: false, error: { code, message } })
  const timer = (running: boolean) => effects.push({ type: 'timer', running })

  const log = (d: DayState, event: GameEvent): DayState => {
    events.push(event)
    const text = describe(event)
    const entry: EventLogEntry = { id: makeId(), timestamp: ctx.now, phase: d.phase, kind: text.kind, detail: text.detail, visibility: text.visibility, code: event.code, params: event.params as EventLogEntry['params'] }
    return { ...d, eventLog: [...d.eventLog, entry] }
  }

  let days = game.days
  let currentDayId = game.currentDayId
  const day = currentDayOf(game)
  if (!day) return fail('invalid_argument', 'Game has no days.')
  const replaceDay = (next: DayState) => { days = days.map((d) => (d.id === day.id ? next : d)) }
  const findSeat = (n: number) => day.seats.find((s) => s.seat === n)
  const editSeat = (seatNumber: number, edit: (s: StorytellerSeat) => StorytellerSeat): CommandResult | null => {
    const before = findSeat(seatNumber)
    if (!before) return fail('unknown_seat', `Seat ${seatNumber} does not exist.`)
    const after = applySeatEdit(ctx.getTeam, before, edit(before))
    let next: DayState = { ...day, seats: day.seats.map((s) => (s.seat === seatNumber ? after : s)) }
    for (const event of diffSeat(ctx.getTeam, before, after)) next = log(next, event)
    replaceDay(next)
    return null
  }

  switch (command.type) {
    case 'phase.set':
    case 'phase.next': {
      const phase = command.type === 'phase.set' ? command.phase : nextPhase(day.phase)
      if (!phase) return applyCommand(game, { type: 'day.next' }, ctx)
      replaceDay(applyPhase(day, phase, game.timers))
      timer(false)
      break
    }
    case 'day.next': {
      if (day.gameEnded) return fail('game_ended', 'The game has ended.')
      const next = createNextDay(game.days.length, day, game.timers, `day-${game.days.length + 1}-${makeId()}`)
      days = [...days, next]
      currentDayId = next.id
      timer(false)
      break
    }
    case 'seat.update': {
      const error = editSeat(command.seat, (s) => ({ ...s, ...command.changes }))
      if (error) return error
      break
    }
    case 'seat.tag.add':
    case 'seat.tag.remove': {
      const key = command.scope === 'public' ? 'customTags' : 'stTags'
      const add = command.type === 'seat.tag.add'
      const error = editSeat(command.seat, (s) => {
        const tags = s[key] ?? []
        return { ...s, [key]: add ? [...new Set([...tags, command.tag])] : tags.filter((t) => t !== command.tag) }
      })
      if (error) return error
      break
    }
    case 'nomination.open':
      replaceDay(openNominations(day, game.timers))
      timer(true)
      break
    case 'nomination.set': {
      for (const n of [command.actor, command.target]) {
        if (n !== null && !findSeat(n)) return fail('unknown_seat', `Seat ${n} does not exist.`)
      }
      if (day.phase !== 'nomination') return fail('not_allowed', 'Nominations are only possible in the nomination phase.')
      replaceDay({
        ...day,
        nominationStep: day.nominationStep === 'waitingForNomination' && command.actor !== null && command.target !== null ? 'nominationDecision' : day.nominationStep,
        voteDraft: { ...day.voteDraft, actor: command.actor, target: command.target, ...(command.isExile !== undefined ? { isExile: command.isExile } : {}), ...(command.note !== undefined ? { note: command.note } : {}) },
      })
      break
    }
    case 'nomination.confirm':
      if (!canStartActorSpeech(day)) return fail('not_allowed', `Cannot confirm a nomination from step "${day.nominationStep}".`)
      replaceDay(startActorSpeech(day, game.timers))
      timer(true)
      break
    case 'nomination.reject':
      replaceDay(log(rejectNomination(day, { requiredVotes: requiredVotesFor(day), now: ctx.now, timers: game.timers }), { code: 'nomination.failed', params: { actor: day.voteDraft.actor, target: day.voteDraft.target } }))
      timer(false)
      break
    case 'speech.target':
      if (!canStartTargetSpeech(day)) return fail('not_allowed', `Cannot start the nominee's speech from step "${day.nominationStep}".`)
      replaceDay(startTargetSpeech(day, game.timers))
      timer(true)
      break
    case 'vote.start':
      if (!canStartVoting(day)) return fail('not_allowed', `Cannot start voting from step "${day.nominationStep}" (a nominee is required).`)
      replaceDay(startVoting(day, buildVotingOrder(day.seats, day.voteDraft.target!), game.timers))
      timer(true)
      break
    case 'vote.cast': {
      if (!findSeat(command.seat)) return fail('unknown_seat', `Seat ${command.seat} does not exist.`)
      const weighted = (d: DayState): DayState => {
        if (command.weight === undefined) return d
        const weights = { ...(d.voteDraft.voteWeights ?? {}) }
        if (command.weight <= 1) delete weights[command.seat]
        else weights[command.seat] = command.weight
        return { ...d, voteDraft: { ...d.voteDraft, voteWeights: weights } }
      }
      if (day.votingState && day.nominationStep === 'voting') {
        const turn = day.votingState.votingOrder[day.votingState.votingIndex]
        if (turn !== command.seat) return fail('not_allowed', `It is seat ${turn}'s turn to vote.`)
        const { day: next, completed } = castVote(weighted(day), command.seat, command.yes, game.timers)
        replaceDay(next)
        if (completed) timer(false)
      } else {
        // Hand-counted vote: toggle the seat in the draft's yes list.
        const voters = command.yes ? [...new Set([...day.voteDraft.voters, command.seat])] : day.voteDraft.voters.filter((s) => s !== command.seat)
        replaceDay(weighted({ ...day, voteDraft: { ...day.voteDraft, voters } }))
      }
      break
    }
    case 'vote.record': {
      const draft = { ...day.voteDraft, ...(command.voteCount !== undefined ? { voteCountOverride: command.voteCount } : {}), ...(command.passed !== undefined ? { manualPassed: command.passed } : {}) }
      const required = requiredVotesFor(day)
      const passed = computeVotePassed(computeYesCount(draft, day.votingState), required, draft.manualPassed)
      const record = buildVoteRecord(draft, { requiredVotes: required, passed, now: ctx.now })
      if (!record) return fail('not_allowed', 'Set a nominator and nominee before recording a vote.')
      replaceDay(log(applyVoteRecord(day, record, draft, game.timers), { code: 'vote.recorded', params: { actor: record.actor, target: record.target, passed: record.passed, voteCount: record.voteCount, requiredVotes: record.requiredVotes } }))
      timer(false)
      break
    }
    case 'skill.record': {
      if (!findSeat(command.actor)) return fail('unknown_seat', `Seat ${command.actor} does not exist.`)
      const visibility = day.phase === 'night' ? 'st-only' : command.visibility ?? 'public'
      const record: SkillRecord = { id: makeId(), actor: command.actor, roleId: command.roleId, targets: command.targets ?? [], targetNotes: {}, statement: command.statement ?? '', note: command.note ?? '', result: command.result ?? null, activatedDuringPhase: day.phase, visibility }
      const withSkill = { ...day, skillHistory: [record, ...day.skillHistory] }
      replaceDay(log(withSkill, { code: 'skill.used', params: { actor: record.actor, roleId: record.roleId, phase: record.activatedDuringPhase } }))
      break
    }
    case 'note.log': {
      const text = command.text.trim()
      if (!text) return fail('invalid_argument', 'Note text is empty.')
      const entry: EventLogEntry = { id: makeId(), timestamp: ctx.now, phase: day.phase, kind: 'stateChange', detail: text, visibility: command.visibility ?? 'st-only' }
      replaceDay({ ...day, eventLog: [...day.eventLog, entry] })
      break
    }
    case 'game.end':
      replaceDay({ ...day, gameEnded: command.ended ?? true })
      timer(false)
      break
    default:
      return fail('unknown_command', `Unknown command "${(command as { type?: string }).type}".`)
  }

  return { ok: true, game: { ...game, days, currentDayId, version: game.version + 1 }, events, effects }
}

/** Apply commands in order, stopping at the first failure. */
export function applyCommands(game: EngineGame, commands: GameCommand[], ctx: (index: number) => EngineContext): { game: EngineGame; events: GameEvent[]; failedAt?: number; error?: { code: EngineErrorCode; message: string } } {
  let current = game
  const events: GameEvent[] = []
  for (let i = 0; i < commands.length; i++) {
    const result = applyCommand(current, commands[i], ctx(i))
    if (!result.ok) return { game: current, events, failedAt: i, error: result.error }
    current = result.game
    events.push(...result.events)
  }
  return { game: current, events }
}
