/**
 * Player count change bugs — two fixes in useGameLifecycle:
 *
 * Bug 1 — applyGameChanges seat reconciliation:
 *   Previously mapped over existing seats and skipped (but kept) any seat
 *   with sNum > totalCount. Never created new seats when count grew.
 *   Fix: filter out seats beyond totalCount; append new blank seats for sNum
 *   values that don't exist yet.
 *
 * Bug 2 — _doOpenNewGamePanel hardcoded playerCount: 9:
 *   New game panel always opened with 9 players regardless of current game
 *   size. Fix: read regular/traveler counts from currentDay.seats.
 *
 * Tests use buildGameLifecycle + deps spy pattern from storytellerFixes.test.ts.
 */
import { describe, it, expect, vi } from 'vitest'
import { createDayState, createSeats, createTimerDefaults } from '../components/StorytellerSub/constants'
import type { DayState, StorytellerSeat, NewGameConfig } from '../components/StorytellerSub/types'

vi.mock('../catalog', () => ({
  allCharacters: [
    { id: 'washerwoman', team: 'townsfolk' },
    { id: 'imp', team: 'demon' },
    { id: 'poisoner', team: 'minion' },
    { id: 'butler', team: 'outsider' },
    { id: 'recluse', team: 'outsider' },
  ],
  getDisplayName: (id: string) => id,
  getCharacterById: (id: string) => {
    const map: Record<string, { team: string }> = {
      washerwoman: { team: 'townsfolk' },
      imp: { team: 'demon' },
      poisoner: { team: 'minion' },
      butler: { team: 'outsider' },
      recluse: { team: 'outsider' },
    }
    return map[id] ?? null
  },
  getIconForCharacter: () => null,
}))

import { buildGameLifecycle } from '../hooks/useGameLifecycle'

const TIMER = createTimerDefaults()

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSeat(overrides: Partial<StorytellerSeat> = {}): StorytellerSeat {
  return {
    seat: 1, name: 'Player 1', alive: true, isTraveler: false,
    isExecuted: false, hasNoVote: false, customTags: [], stTags: [],
    characterId: null, userCharacterId: null, teamTag: null, note: '',
    ...overrides,
  }
}

function makeDay(seats: StorytellerSeat[], overrides: Partial<DayState> = {}): DayState {
  return { ...createDayState(1, seats, TIMER), ...overrides }
}

function makeConfig(overrides: Partial<NewGameConfig> = {}): NewGameConfig {
  return {
    playerCount: 5, travelerCount: 0, scriptSlug: 'tb',
    allowDuplicateChars: false, allowEmptyChars: false, allowSameNames: false,
    seatNames: {}, assignments: {}, userAssignments: {},
    travelerAssignments: {}, seatNotes: {}, specialNote: '',
    demonBluffs: [], charPool: [],
    ...overrides,
  }
}

function buildDeps(currentDay: DayState, days: DayState[] = [currentDay]) {
  const setDays = vi.fn()
  const setNewGamePanel = vi.fn()
  return {
    lc: buildGameLifecycle({
      days,
      currentDay,
      selectedDayIndex: days.length - 1,
      timerDefaults: TIMER,
      activeScriptSlug: 'tb',
      activeScriptTitle: 'Trouble Brewing',
      endGameResult: null,
      scriptOptions: [{ slug: 'tb', characters: [] }],
      setDays,
      setDaysWithUndo: vi.fn(),
      setSelectedDayId: vi.fn(),
      setPickerMode: vi.fn(),
      setIsTimerRunning: vi.fn(),
      setSeatTagDrafts: vi.fn(),
      setSkillOverlay: vi.fn(),
      setNewGamePanel,
      setEndGameResult: vi.fn(),
      setGameRecords: vi.fn(),
      setAudioPlaying: vi.fn(),
      setSelectedAudioSrc: vi.fn(),
      nightBgmSrc: '',
      language: 'en' as const,
      appendEvent: (d: DayState) => d,
      playerNamePool: [],
      customTagPool: [],
      gameStartedAt: undefined,
    } as any),
    setDays,
    setNewGamePanel,
  }
}

/** Extract the seats array that applyGameChanges passed to setDays. */
function captureUpdatedSeats(setDays: ReturnType<typeof vi.fn>, currentDay: DayState): StorytellerSeat[] {
  const updater = setDays.mock.calls[0][0] as (days: DayState[]) => DayState[]
  const result = updater([currentDay])
  return result[0].seats
}

// ── applyGameChanges — seat count decreases ───────────────────────────────────

describe('applyGameChanges — count decreases', () => {
  it('removes excess seats when playerCount drops', () => {
    const seats = createSeats(7)   // 7 regular seats
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({ playerCount: 5, travelerCount: 0 }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated).toHaveLength(5)
    expect(updated.map((s) => s.seat)).toEqual([1, 2, 3, 4, 5])
  })

  it('removes exactly the right number of seats — drops tail seats', () => {
    const seats = createSeats(10)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({ playerCount: 3, travelerCount: 0 }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated).toHaveLength(3)
    expect(updated.every((s) => !s.isTraveler)).toBe(true)
  })

  it('keeps one seat when playerCount=1', () => {
    const seats = createSeats(5)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({ playerCount: 1, travelerCount: 0 }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated).toHaveLength(1)
    expect(updated[0].seat).toBe(1)
  })

  it('preserves names and characters on remaining seats', () => {
    const seats = [
      makeSeat({ seat: 1, name: 'Alice', characterId: 'washerwoman' }),
      makeSeat({ seat: 2, name: 'Bob',   characterId: 'butler' }),
      makeSeat({ seat: 3, name: 'Carol', characterId: null }),
    ]
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({
      playerCount: 2, travelerCount: 0,
      seatNames: { 1: 'Alice', 2: 'Bob' },
      assignments: { 1: 'washerwoman', 2: 'butler' },
    }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated).toHaveLength(2)
    expect(updated[0].name).toBe('Alice')
    expect(updated[0].characterId).toBe('washerwoman')
    expect(updated[1].name).toBe('Bob')
    expect(updated[1].characterId).toBe('butler')
  })
})

// ── applyGameChanges — seat count increases ───────────────────────────────────

describe('applyGameChanges — count increases', () => {
  it('adds new blank seats when playerCount grows', () => {
    const seats = createSeats(5)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({ playerCount: 8, travelerCount: 0 }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated).toHaveLength(8)
  })

  it('new seats have correct seat numbers', () => {
    const seats = createSeats(5)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({ playerCount: 7, travelerCount: 0 }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated.map((s) => s.seat)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('new seats default to Player N names', () => {
    const seats = createSeats(3)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({ playerCount: 5, travelerCount: 0 }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated[3].name).toBe('Player 4')
    expect(updated[4].name).toBe('Player 5')
  })

  it('new seats pick up seatNames from config', () => {
    const seats = createSeats(3)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({
      playerCount: 5, travelerCount: 0,
      seatNames: { 4: 'Dave', 5: 'Eve' },
    }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated[3].name).toBe('Dave')
    expect(updated[4].name).toBe('Eve')
  })

  it('new seats pick up character assignments from config', () => {
    const seats = createSeats(3)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({
      playerCount: 5, travelerCount: 0,
      assignments: { 4: 'washerwoman', 5: 'butler' },
    }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated[3].characterId).toBe('washerwoman')
    expect(updated[4].characterId).toBe('butler')
  })

  it('new evil seats get teamTag=evil', () => {
    const seats = createSeats(3)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({
      playerCount: 5, travelerCount: 0,
      assignments: { 4: 'imp', 5: 'poisoner' },
    }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated[3].teamTag).toBe('evil')   // imp = demon
    expect(updated[4].teamTag).toBe('evil')   // poisoner = minion
  })

  it('new good seats get teamTag=good', () => {
    const seats = createSeats(3)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({
      playerCount: 5, travelerCount: 0,
      assignments: { 4: 'washerwoman' },
    }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated[3].teamTag).toBe('good')
    expect(updated[4].teamTag).toBeNull()     // no assignment → null
  })

  it('new seats are alive and have no votes/execution flags', () => {
    const seats = createSeats(4)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({ playerCount: 6, travelerCount: 0 }))

    const updated = captureUpdatedSeats(setDays, day)
    const newSeat = updated[4]
    expect(newSeat.alive).toBe(true)
    expect(newSeat.isExecuted).toBe(false)
    expect(newSeat.hasNoVote).toBe(false)
  })

  it('new traveler seats beyond playerCount are marked isTraveler=true', () => {
    const seats = createSeats(5)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    // 5 regular + 2 travelers → seats 6 and 7 are travelers
    lc.applyGameChanges(makeConfig({ playerCount: 5, travelerCount: 2 }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated).toHaveLength(7)
    expect(updated[5].isTraveler).toBe(true)
    expect(updated[6].isTraveler).toBe(true)
    expect(updated[5].name).toBe('Traveler 6')
    expect(updated[6].name).toBe('Traveler 7')
  })
})

// ── applyGameChanges — same count (no-op for seat list) ──────────────────────

describe('applyGameChanges — same count', () => {
  it('seat list length unchanged when count matches', () => {
    const seats = createSeats(5)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({ playerCount: 5, travelerCount: 0 }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated).toHaveLength(5)
  })

  it('updates names and characters on all seats', () => {
    const seats = createSeats(3)
    const day = makeDay(seats)
    const { lc, setDays } = buildDeps(day)

    lc.applyGameChanges(makeConfig({
      playerCount: 3, travelerCount: 0,
      seatNames: { 1: 'Alice', 2: 'Bob', 3: 'Carol' },
      assignments: { 1: 'washerwoman', 2: 'imp', 3: 'butler' },
    }))

    const updated = captureUpdatedSeats(setDays, day)
    expect(updated[0].name).toBe('Alice')
    expect(updated[1].name).toBe('Bob')
    expect(updated[2].name).toBe('Carol')
    expect(updated[0].characterId).toBe('washerwoman')
    expect(updated[1].characterId).toBe('imp')
    expect(updated[2].characterId).toBe('butler')
  })
})

// ── _doOpenNewGamePanel — inherits player count ───────────────────────────────

describe('_doOpenNewGamePanel — inherits player/traveler count from current game', () => {
  /** Extract the NewGameConfig from the setNewGamePanel spy call. */
  function extractConfig(setNewGamePanel: ReturnType<typeof vi.fn>): NewGameConfig {
    const updater = setNewGamePanel.mock.calls[0][0] as (prev: NewGameConfig | null) => NewGameConfig
    return updater(null)
  }

  it('inherits playerCount from a 7-player game', () => {
    const seats = createSeats(7)
    const day = makeDay(seats)
    const { lc, setNewGamePanel } = buildDeps(day)

    lc.doOpenNewGamePanel()

    const config = extractConfig(setNewGamePanel)
    expect(config.playerCount).toBe(7)
  })

  it('inherits playerCount from a 12-player game', () => {
    const seats = createSeats(12)
    const day = makeDay(seats)
    const { lc, setNewGamePanel } = buildDeps(day)

    lc.doOpenNewGamePanel()

    const config = extractConfig(setNewGamePanel)
    expect(config.playerCount).toBe(12)
  })

  it('does NOT include travelers in playerCount', () => {
    const regular = createSeats(7)
    const traveler: StorytellerSeat = makeSeat({ seat: 8, name: 'Traveler 8', isTraveler: true })
    const day = makeDay([...regular, traveler])
    const { lc, setNewGamePanel } = buildDeps(day)

    lc.doOpenNewGamePanel()

    const config = extractConfig(setNewGamePanel)
    expect(config.playerCount).toBe(7)   // travelers excluded
    expect(config.travelerCount).toBe(1) // travelers counted separately
  })

  it('inherits travelerCount when travelers exist', () => {
    const regular = createSeats(5)
    const travelers: StorytellerSeat[] = [
      makeSeat({ seat: 6, name: 'Traveler 6', isTraveler: true }),
      makeSeat({ seat: 7, name: 'Traveler 7', isTraveler: true }),
    ]
    const day = makeDay([...regular, ...travelers])
    const { lc, setNewGamePanel } = buildDeps(day)

    lc.doOpenNewGamePanel()

    const config = extractConfig(setNewGamePanel)
    expect(config.playerCount).toBe(5)
    expect(config.travelerCount).toBe(2)
  })

  it('defaults to 9 when no current game seats exist', () => {
    const day = makeDay([])
    const { lc, setNewGamePanel } = buildDeps(day)

    lc.doOpenNewGamePanel()

    const config = extractConfig(setNewGamePanel)
    expect(config.playerCount).toBe(9)
  })

  it('preserves existing draft — does not override when draft already set', () => {
    const seats = createSeats(11)
    const day = makeDay(seats)
    const { lc, setNewGamePanel } = buildDeps(day)

    lc.doOpenNewGamePanel()

    // Simulate prev already having a draft (non-null)
    const existingDraft: NewGameConfig = makeConfig({ playerCount: 6 })
    const updater = setNewGamePanel.mock.calls[0][0] as (prev: NewGameConfig | null) => NewGameConfig
    const result = updater(existingDraft)

    // Draft should be preserved, not overwritten with 11
    expect(result.playerCount).toBe(6)
  })

  it('travelerCount defaults to 0 when no travelers in current game', () => {
    const seats = createSeats(5)
    const day = makeDay(seats)
    const { lc, setNewGamePanel } = buildDeps(day)

    lc.doOpenNewGamePanel()

    const config = extractConfig(setNewGamePanel)
    expect(config.travelerCount).toBe(0)
  })

  it('assignments and demonBluffs reset to empty', () => {
    const seats = [
      makeSeat({ seat: 1, name: 'Alice', characterId: 'imp' }),
      makeSeat({ seat: 2, name: 'Bob',   characterId: 'washerwoman' }),
    ]
    const day = makeDay(seats, { demonBluffs: ['recluse'] })
    const { lc, setNewGamePanel } = buildDeps(day)

    lc.doOpenNewGamePanel()

    const config = extractConfig(setNewGamePanel)
    expect(config.assignments).toEqual({})
    expect(config.demonBluffs).toEqual([])
  })
})
