/**
 * P0 acceptance: a whole game can be replayed in plain Node through the
 * command engine, deterministically, from framework-free code only.
 */
import { describe, it, expect } from 'vitest'
// @ts-expect-error — plain ESM build script without type declarations
import { buildCatalogData } from '../../scripts/catalog-data.mjs'
import { createCatalogIndex, type CatalogData } from '../core/catalog'
import { applyCommand, applyCommands, currentDayOf, type EngineGame, type GameCommand } from '../core/engine/commands'
import { createDayState } from '../core/engine/factories'
import { restoreDaysFromRecord } from '../core/engine/lifecycle'
import { buildSeatsFromConfig } from '../core/engine/setup'
import type { GameRecord, TimerDefaults } from '../core/types/game'

const index = createCatalogIndex(buildCatalogData(process.cwd()) as CatalogData)
const timers: TimerDefaults = {
  privateSeconds: 180, publicFreeSeconds: 300, publicRoundRobinSeconds: 30, nominationDelayMinutes: 2,
  nominationWaitSeconds: 10, nominationActorSeconds: 30, nominationTargetSeconds: 30, nominationVoteSeconds: 5, alarmSound: '',
}
const T0 = 1_700_000_000_000
const ctx = (i: number) => ({ now: T0 + i * 1000, getTeam: index.teamOf })

function newGame(): EngineGame {
  const seats = buildSeatsFromConfig({
    playerCount: 7, travelerCount: 0, scriptSlug: 'tb',
    seatNames: { 1: 'Ann', 2: 'Bo', 3: 'Cy', 4: 'Di', 5: 'Ed', 6: 'Flo', 7: 'Gus' },
    assignments: { 1: 'washerwoman', 2: 'empath', 3: 'fortuneteller', 4: 'monk', 5: 'poisoner', 6: 'imp', 7: 'drunk' },
    userAssignments: { 7: 'chef' }, travelerAssignments: {}, seatNotes: {}, specialNote: '', demonBluffs: ['chef', 'slayer', 'virgin'], charPool: [],
  }, index.teamOf)
  const day1 = { ...createDayState(1, seats, timers), demonBluffs: ['chef', 'slayer', 'virgin'] }
  return { days: [day1], currentDayId: day1.id, timers, version: 0 }
}

const script: GameCommand[] = [
  // Night 1
  { type: 'seat.tag.add', seat: 2, tag: '📝Poisoned::poisoner', scope: 'st' },
  { type: 'skill.record', actor: 5, roleId: 'poisoner', targets: [2] },
  { type: 'skill.record', actor: 1, roleId: 'washerwoman', statement: '#3 or #6 is the Fortune Teller', result: 'success' },
  { type: 'note.log', text: 'Drunk thinks they are the Chef' },
  // Day 1: private → public → nomination
  { type: 'phase.next' },
  { type: 'phase.next' },
  { type: 'phase.next' },
  { type: 'nomination.set', actor: 1, target: 5 },
  { type: 'nomination.confirm' },
  { type: 'speech.target' },
  { type: 'vote.start' },
  // clockwise after the nominee: 6, 7, 1, 2, 3, 4, 5
  { type: 'vote.cast', seat: 6, yes: false },
  { type: 'vote.cast', seat: 7, yes: true },
  { type: 'vote.cast', seat: 1, yes: true },
  { type: 'vote.cast', seat: 2, yes: true },
  { type: 'vote.cast', seat: 3, yes: true },
  { type: 'vote.cast', seat: 4, yes: false },
  { type: 'vote.cast', seat: 5, yes: false },
  { type: 'vote.record' },
  { type: 'seat.update', seat: 5, changes: { alive: false, isExecuted: true } },
  // Night 2: the Imp kills the Monk
  { type: 'phase.next' },
  { type: 'seat.update', seat: 4, changes: { alive: false } },
  { type: 'game.end' },
]

describe('command engine replay', () => {
  it('plays a full game of Trouble Brewing', () => {
    const { game, events, error } = applyCommands(newGame(), script, ctx)
    expect(error).toBeUndefined()
    expect(game.version).toBe(script.length)
    expect(game.days).toHaveLength(2)

    const [day1, day2] = game.days
    expect(day1.voteHistory).toEqual([
      expect.objectContaining({ actor: 1, target: 5, voters: [1, 2, 3, 7], voteCount: 4, requiredVotes: 4, passed: true }),
    ])
    expect(day1.skillHistory.map((s) => [s.roleId, s.visibility])).toEqual([['washerwoman', 'st-only'], ['poisoner', 'st-only']])
    expect(day1.seats.find((s) => s.seat === 5)).toMatchObject({ alive: false, isExecuted: true, voteTokens: 1 })

    expect(currentDayOf(game)).toBe(day2)
    expect(day2).toMatchObject({ day: 2, phase: 'night', gameEnded: true, demonBluffs: ['chef', 'slayer', 'virgin'] })
    expect(day2.seats.filter((s) => !s.alive).map((s) => s.seat)).toEqual([4, 5])
    expect(day2.seats.find((s) => s.seat === 7)).toMatchObject({ characterId: 'drunk', userCharacterId: 'chef', teamTag: 'good' })
    expect(day2.seats.find((s) => s.seat === 6)?.teamTag).toBe('evil')

    expect(events.map((e) => e.code)).toEqual([
      'seat.stTag.added', 'skill.used', 'skill.used',
      'vote.recorded', 'seat.died', 'seat.executed',
      'seat.died',
    ])
    // every structured event is also in the day logs, with text
    const logged = game.days.flatMap((d) => d.eventLog.filter((e) => e.code))
    expect(logged).toHaveLength(events.length)
    expect(logged.find((e) => e.code === 'vote.recorded')?.detail).toBe('#1 nominated #5 — passed (4/4)')
  })

  it('keeps the identity history like the web app', () => {
    const start = newGame()
    // created without a catalog lookup, so day 1 has no history yet
    expect(start.days[0].identityHistory).toBeUndefined()
    const { game } = applyCommands(start, [
      { type: 'seat.update', seat: 3, changes: { characterId: 'imp', teamTag: 'evil' } },
      { type: 'phase.set', phase: 'nomination' },
      { type: 'day.next' },
    ], ctx)
    const day1 = game.days[0].identityHistory!
    expect(day1.complete).toBe(false) // started mid-game
    expect(day1.changes).toEqual([{ seat: 3, at: T0, phase: 'night', from: { characterId: 'fortuneteller', team: 'good' }, to: { characterId: 'imp', team: 'evil' } }])
    const day2 = game.days[1].identityHistory!
    expect(day2.complete).toBe(true)
    expect(day2.initial.find((s) => s.seat === 3)).toEqual({ seat: 3, characterId: 'imp', team: 'evil' })
  })

  it('is deterministic', () => {
    const start = newGame()
    expect(applyCommands(start, script, ctx)).toEqual(applyCommands(start, script, ctx))
  })

  it('continues a game restored from a saved record', () => {
    const { game } = applyCommands(newGame(), script.slice(0, 20), ctx)
    const record: GameRecord = { id: 'r', endedAt: T0, days: [], savedDays: game.days }
    const restored: EngineGame = { days: restoreDaysFromRecord(record, timers), currentDayId: game.currentDayId, timers, version: game.version }
    const rest = applyCommands(restored, script.slice(20), (i) => ctx(20 + i))
    expect(rest.error).toBeUndefined()
    expect(rest.game).toEqual(applyCommands(game, script.slice(20), (i) => ctx(20 + i)).game)
  })

  it('rejects illegal commands without changing the game', () => {
    const { game } = applyCommands(newGame(), script.slice(0, 11), ctx) // voting has started, seat 6 is up
    expect(applyCommand(game, { type: 'vote.cast', seat: 1, yes: true }, ctx(99))).toEqual({ ok: false, error: { code: 'not_allowed', message: "It is seat 6's turn to vote." } })
    expect(applyCommand(game, { type: 'seat.update', seat: 42, changes: { alive: false } }, ctx(99))).toMatchObject({ ok: false, error: { code: 'unknown_seat' } })
    expect(applyCommand(game, { type: 'note.log', text: '  ' }, ctx(99))).toMatchObject({ ok: false, error: { code: 'invalid_argument' } })
    expect(applyCommand(newGame(), { type: 'nomination.set', actor: 1, target: 2 }, ctx(99))).toMatchObject({ ok: false, error: { code: 'not_allowed' } })
    expect(applyCommand(newGame(), { type: 'bogus' } as unknown as GameCommand, ctx(99))).toMatchObject({ ok: false, error: { code: 'unknown_command' } })
    const ended = applyCommands(newGame(), [{ type: 'game.end' }], ctx).game
    expect(applyCommand(ended, { type: 'day.next' }, ctx(99))).toMatchObject({ ok: false, error: { code: 'game_ended' } })
  })

  it('reports UI effects for timers', () => {
    const { game } = applyCommands(newGame(), script.slice(0, 7), ctx) // now in the nomination phase
    const opened = applyCommand(game, { type: 'nomination.open' }, ctx(50))
    expect(opened.ok && opened.effects).toEqual([{ type: 'timer', running: true }])
  })

  it('supports hand-counted votes with manual overrides', () => {
    const { game } = applyCommands(newGame(), [
      ...script.slice(4, 7),
      { type: 'nomination.set', actor: 2, target: 6, note: 'Imp?' },
      { type: 'vote.cast', seat: 1, yes: true },
      { type: 'vote.cast', seat: 3, yes: true },
      { type: 'vote.cast', seat: 3, yes: false },
      { type: 'vote.record', passed: true, voteCount: 5 },
    ], ctx)
    expect(currentDayOf(game).voteHistory[0]).toMatchObject({ voters: [1], voteCount: 5, passed: true, overridden: true, note: 'Imp?' })
  })
})
