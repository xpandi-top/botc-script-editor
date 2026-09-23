import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createDayState, createSeats, createTimerDefaults, STORAGE_KEY } from '../components/StorytellerSub/constants'
import { loadInitialState } from '../components/StorytellerSub/storage'
import { summarizeIdentities, trackIdentityUpdates, recordPlayers, normalizeIdentityHistory } from '../utils/playerIdentity'
import { usePlayerStats, useCharStats } from '../components/AnalyticsStudio/useStats'
import { buildGameExport } from '../hooks/useGameExport'
import { useHistory } from '../hooks/useHistory'
import type { DayState, GameRecord, StorytellerSeat } from '../components/StorytellerSub/types'

vi.mock('../lib/exportGame', () => ({ exportGameFile: vi.fn().mockResolvedValue(undefined) }))
const defaults = createTimerDefaults()
function firstDay() {
  const seats = createSeats(1)
  seats[0] = { ...seats[0], name: 'Alice', characterId: 'washerwoman', teamTag: 'good' }
  return createDayState(1, seats, defaults)
}
function change(days: DayState[], patch: Partial<StorytellerSeat>) {
  return trackIdentityUpdates(days, days.map((d, i) => i === days.length - 1 ? { ...d, seats: d.seats.map(s => ({ ...s, ...patch })) } : d))
}
function record(days: DayState[], winner: GameRecord['winner'] = 'evil'): GameRecord {
  return { id: 'test', endedAt: 1, days: [], savedDays: days, playerSummaries: summarizeIdentities(days), winner }
}

describe('identity tracking', () => {
  it('counts same-day round trips and independent alignment changes', () => {
    let days = [firstDay()]
    days = change(days, { characterId: 'imp' })
    days = change(days, { characterId: 'washerwoman', teamTag: 'evil' })
    expect(summarizeIdentities(days)[0]).toMatchObject({
      initialCharacterId: 'washerwoman', finalCharacterId: 'washerwoman',
      initialTeam: 'good', finalTeam: 'evil', characterChangeCount: 2, alignmentChangeCount: 1, historyComplete: true,
    })
    expect(days[0].identityHistory?.changes).toHaveLength(2)
  })
  it('does not count initial assignment, names, notes or perceived roles as transformations', () => {
    let days = [createDayState(1, createSeats(1), defaults)]
    days = change(days, { characterId: 'imp', teamTag: 'evil' })
    days = change(days, { name: 'Claimed player', note: 'test', userCharacterId: 'chef' })
    expect(summarizeIdentities(days)[0]).toMatchObject({ initialCharacterId: 'imp', characterChangeCount: 0, alignmentChangeCount: 0 })
    expect(days[0].identityHistory?.changes).toHaveLength(1)
  })
  it('continues across days without counting carried-over identities twice', () => {
    let days = change([firstDay()], { characterId: 'imp' })
    days.push(createDayState(2, days[0].seats, defaults))
    days = change(days, { teamTag: 'evil' })
    expect(summarizeIdentities(days)[0]).toMatchObject({ characterChangeCount: 1, alignmentChangeCount: 1 })
  })
  it('keeps legacy initial identities and counts unknown even after further changes', () => {
    const legacy = { ...firstDay(), identityHistory: undefined }
    const days = change([legacy], { characterId: 'imp' })
    expect(summarizeIdentities(days)[0]).toMatchObject({ initialCharacterId: null, characterChangeCount: null, historyComplete: false, finalCharacterId: 'imp' })
    expect(recordPlayers({ ...record([]), playerSummaries: [{ seat: 1, name: 'A', team: 'evil' }], setup: { assignments: { 1: 'imp' } } as GameRecord['setup'] })[0].finalCharacterId).toBe('imp')
  })
  it('round-trips history through persistence and rejects malformed history', () => {
    const days = change([firstDay()], { characterId: 'imp', teamTag: 'evil' })
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ days }))
    expect(loadInitialState().days[0].identityHistory).toEqual(days[0].identityHistory)
    localStorage.removeItem(STORAGE_KEY)
    expect(normalizeIdentityHistory({ complete: true, initial: [null], changes: [] })).toBeUndefined()
  })
  it('undo restores both identity and change counts', () => {
    const { result } = renderHook(() => useHistory([firstDay()]))
    act(() => result.current.setWithUndo(days => change(days, { characterId: 'imp' })))
    expect(summarizeIdentities(result.current.value)[0].characterChangeCount).toBe(1)
    act(() => result.current.undo())
    expect(summarizeIdentities(result.current.value)[0].characterChangeCount).toBe(0)
  })
  it('saves the last day even when viewing an earlier day and finalizes the checkpoint once', () => {
    const d1 = firstDay()
    let days = [d1, createDayState(2, d1.seats, defaults)]
    days = change(days, { characterId: 'imp', teamTag: 'evil' })
    const setGameRecords = vi.fn()
    const exporter = buildGameExport({ days, currentDay: d1, timerDefaults: defaults, endGameResult: null, gameId: 'identity', setGameRecords })
    exporter.saveGame()
    let saved = setGameRecords.mock.calls[0][0]([])
    expect(saved[0].setup.assignments[1]).toBe('imp')
    expect(saved[0].playerSummaries[0]).toMatchObject({ initialCharacterId: 'washerwoman', finalCharacterId: 'imp', team: 'evil', characterChangeCount: 1 })
    exporter.confirmEndGame(undefined, { winner: 'evil', playerTeams: {} })
    saved = setGameRecords.mock.calls[1][0](saved)
    expect(saved).toHaveLength(1)
    expect(saved[0].winner).toBe('evil')
  })
})

describe('identity-aware analytics', () => {
  const changed = record(change([firstDay()], { characterId: 'imp', teamTag: 'evil' }))
  it('groups by initial identity while awarding the win using final alignment', () => {
    const { result } = renderHook(() => ({
      players: usePlayerStats([changed], 'initial'),
      initial: useCharStats([changed], 'en', 'initial'),
      final: useCharStats([changed], 'en', 'final'),
    }))
    expect(result.current.initial[0]).toMatchObject({ charId: 'washerwoman', goodGames: 1, winRate: 100 })
    expect(result.current.final[0]).toMatchObject({ charId: 'imp', evilGames: 1, winRate: 100 })
    expect(result.current.players[0]).toMatchObject({ goodWinRate: 100, evilGames: 0 })
  })
  it('excludes undecided games from win-rate denominators, but retains participation totals', () => {
    const { result } = renderHook(() => ({
      players: usePlayerStats([changed, { ...changed, winner: null }]),
      chars: useCharStats([changed, { ...changed, winner: null }], 'en'),
    }))
    expect(result.current.players[0]).toMatchObject({ total: 2, decided: 1, winRate: 100 })
    expect(result.current.chars[0]).toMatchObject({ total: 2, decided: 1, winRate: 100 })
  })
  it('counts duplicate-role players separately, including opposite final alignments', () => {
    const duplicate = { ...changed, playerSummaries: [
      ...changed.playerSummaries!,
      { ...changed.playerSummaries![0], seat: 2, name: 'Bob', team: 'good' as const, finalTeam: 'good' as const },
    ] }
    const { result } = renderHook(() => useCharStats([duplicate], 'en'))
    expect(result.current[0]).toMatchObject({ total: 2, decided: 2, winRate: 50 })
    expect(result.current[0].players.size).toBe(2)
  })
})
