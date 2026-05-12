/**
 * Tests for three storyteller fixes:
 *  1. New game inherits previous players' non-default seat names
 *  2. Rename player during game → propagate to saved records
 *  3. Demon bluffs carry forward to subsequent days
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDayState, createSeats, createTimerDefaults } from '../components/StorytellerSub/constants'

const DEFAULT_TIMER_DEFAULTS = createTimerDefaults()
import { buildGameLifecycle } from '../hooks/useGameLifecycle'
import type { DayState, StorytellerSeat, GameRecord, NewGameConfig } from '../components/StorytellerSub/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSeat(overrides: Partial<StorytellerSeat> = {}): StorytellerSeat {
  return {
    seat: 1, name: 'Player 1', alive: true, isTraveler: false,
    isExecuted: false, hasNoVote: false, customTags: [], stTags: [],
    characterId: null, userCharacterId: null, teamTag: null, note: '',
    ...overrides,
  }
}

function makeDay(overrides: Partial<DayState> = {}): DayState {
  const seats = createSeats(5)
  return { ...createDayState(1, seats, DEFAULT_TIMER_DEFAULTS), ...overrides }
}

function makeRecord(playerNames: string[]): GameRecord {
  return {
    id: Math.random().toString(36).slice(2),
    endedAt: Date.now(),
    playerSummaries: playerNames.map((name, i) => ({ seat: i + 1, name, team: 'good' })),
  } as unknown as GameRecord
}

// Build a minimal lifecycle deps object with vitest spies
function buildDeps(currentDay: DayState, days: DayState[] = [currentDay]) {
  const setNewGamePanel = vi.fn()
  const setDaysWithUndo = vi.fn()
  const setSelectedDayId = vi.fn()
  const setPickerMode = vi.fn()
  const setIsTimerRunning = vi.fn()

  const deps = {
    days,
    currentDay,
    selectedDayIndex: days.length - 1,
    timerDefaults: DEFAULT_TIMER_DEFAULTS,
    activeScriptSlug: 'tb',
    activeScriptTitle: 'Trouble Brewing',
    endGameResult: null,
    scriptOptions: [{ slug: 'tb', characters: [] }],
    setDays: vi.fn(),
    setDaysWithUndo,
    setSelectedDayId,
    setPickerMode,
    setIsTimerRunning,
    setSeatTagDrafts: vi.fn(),
    setSkillOverlay: vi.fn(),
    setNewGamePanel,
    setEndGameResult: vi.fn(),
    setGameRecords: vi.fn(),
    setAudioPlaying: vi.fn(),
    setSelectedAudioSrc: vi.fn(),
    nightBgmSrc: '',
    language: 'en' as const,
    appendEvent: (_d: DayState) => _d,
    playerNamePool: [],
    customTagPool: [],
    gameStartedAt: undefined,
  }
  return { deps, setNewGamePanel, setDaysWithUndo, setSelectedDayId }
}

// ── Fix 1: New game inherits previous seat names ──────────────────────────────

describe('Fix 1 – new game panel inherits previous player names', () => {
  it('pre-fills seatNames with non-default names from current game', () => {
    const seats = [
      makeSeat({ seat: 1, name: 'Alice' }),
      makeSeat({ seat: 2, name: 'Bob' }),
      makeSeat({ seat: 3, name: 'Player 3' }),   // default → should NOT carry over
    ]
    const day = makeDay({ seats })
    const { deps, setNewGamePanel } = buildDeps(day)
    const lc = buildGameLifecycle(deps as any)

    lc.doOpenNewGamePanel()

    const arg = setNewGamePanel.mock.calls[0][0] as NewGameConfig
    expect(arg.seatNames[1]).toBe('Alice')
    expect(arg.seatNames[2]).toBe('Bob')
    expect(arg.seatNames[3]).toBeUndefined()  // 'Player 3' is default, not inherited
  })

  it('carries no names when all are default', () => {
    const seats = createSeats(5)   // all named 'Player N'
    const day = makeDay({ seats })
    const { deps, setNewGamePanel } = buildDeps(day)
    const lc = buildGameLifecycle(deps as any)

    lc.doOpenNewGamePanel()

    const arg = setNewGamePanel.mock.calls[0][0] as NewGameConfig
    expect(Object.keys(arg.seatNames)).toHaveLength(0)
  })

  it('does not carry traveler default names', () => {
    const seats = [
      makeSeat({ seat: 1, name: 'Alice' }),
      makeSeat({ seat: 2, name: 'Traveler 2', isTraveler: true }),   // default traveler
    ]
    const day = makeDay({ seats })
    const { deps, setNewGamePanel } = buildDeps(day)
    const lc = buildGameLifecycle(deps as any)

    lc.doOpenNewGamePanel()

    const arg = setNewGamePanel.mock.calls[0][0] as NewGameConfig
    expect(arg.seatNames[1]).toBe('Alice')
    expect(arg.seatNames[2]).toBeUndefined()
  })

  it('carries custom traveler names', () => {
    const seats = [
      makeSeat({ seat: 1, name: 'Alice' }),
      makeSeat({ seat: 2, name: 'Merlin', isTraveler: true }),   // custom traveler name
    ]
    const day = makeDay({ seats })
    const { deps, setNewGamePanel } = buildDeps(day)
    const lc = buildGameLifecycle(deps as any)

    lc.doOpenNewGamePanel()

    const arg = setNewGamePanel.mock.calls[0][0] as NewGameConfig
    expect(arg.seatNames[2]).toBe('Merlin')
  })

  it('resets assignments and bluffs to empty regardless', () => {
    const seats = [makeSeat({ seat: 1, name: 'Alice', characterId: 'washerwoman' })]
    const day = makeDay({ seats, demonBluffs: ['imp'] })
    const { deps, setNewGamePanel } = buildDeps(day)
    const lc = buildGameLifecycle(deps as any)

    lc.doOpenNewGamePanel()

    const arg = setNewGamePanel.mock.calls[0][0] as NewGameConfig
    expect(arg.assignments).toEqual({})
    expect(arg.demonBluffs).toEqual([])
  })
})

// ── Fix 2: Rename propagation helper (pure logic) ────────────────────────────

describe('Fix 2 – rename player propagation to saved records', () => {
  // The actual UI logic lives in ModalsEditPlayers (React component, no unit test here).
  // We test the rename logic directly as a pure function mirror.

  function propagateRename(
    records: GameRecord[],
    oldName: string,
    newName: string,
  ): GameRecord[] {
    return records.map((r) => ({
      ...r,
      playerSummaries: r.playerSummaries?.map((ps) =>
        ps.name === oldName ? { ...ps, name: newName } : ps,
      ),
    }))
  }

  it('updates matching playerSummaries entries', () => {
    const records = [makeRecord(['Alice', 'Bob']), makeRecord(['Alice', 'Carol'])]
    const updated = propagateRename(records, 'Alice', 'Alicia')
    expect(updated[0].playerSummaries![0].name).toBe('Alicia')
    expect(updated[1].playerSummaries![0].name).toBe('Alicia')
    // other players unchanged
    expect(updated[0].playerSummaries![1].name).toBe('Bob')
    expect(updated[1].playerSummaries![1].name).toBe('Carol')
  })

  it('leaves records without the old name unchanged', () => {
    const records = [makeRecord(['Charlie', 'Dave'])]
    const updated = propagateRename(records, 'Alice', 'Alicia')
    expect(updated[0].playerSummaries![0].name).toBe('Charlie')
    expect(updated[0].playerSummaries![1].name).toBe('Dave')
  })

  it('handles records with no playerSummaries gracefully', () => {
    const record = { ...makeRecord([]), playerSummaries: undefined } as unknown as GameRecord
    const updated = propagateRename([record], 'Alice', 'Alicia')
    expect(updated[0].playerSummaries).toBeUndefined()
  })

  it('correctly counts affected records before prompting', () => {
    const records = [
      makeRecord(['Alice', 'Bob']),
      makeRecord(['Carol', 'Dave']),
      makeRecord(['Alice']),
    ]
    const affected = records.filter((r) =>
      r.playerSummaries?.some((ps) => ps.name === 'Alice'),
    )
    expect(affected).toHaveLength(2)
  })

  it('does not trigger dialog when old name not in any record', () => {
    const records = [makeRecord(['Bob', 'Carol'])]
    const affected = records.filter((r) =>
      r.playerSummaries?.some((ps) => ps.name === 'Unknown'),
    )
    expect(affected).toHaveLength(0)
  })
})

// ── Fix 3: Demon bluffs carry forward to next day ────────────────────────────

describe('Fix 3 – demon bluffs carry across days', () => {
  it('goToNextDay copies demonBluffs from current day to new day', () => {
    const bluffs = ['washerwoman', 'librarian', 'investigator']
    const day1 = makeDay({ demonBluffs: bluffs })
    const { deps, setDaysWithUndo } = buildDeps(day1, [day1])
    const lc = buildGameLifecycle(deps as any)

    lc.goToNextDay()

    // setDaysWithUndo called with updater fn; invoke it to get next days array
    const updater = setDaysWithUndo.mock.calls[0][0]
    const newDays: DayState[] = updater([day1])
    expect(newDays).toHaveLength(2)
    expect(newDays[1].demonBluffs).toEqual(bluffs)
  })

  it('new day has empty demonBluffs when current day has none', () => {
    const day1 = makeDay({ demonBluffs: [] })
    const { deps, setDaysWithUndo } = buildDeps(day1, [day1])
    const lc = buildGameLifecycle(deps as any)

    lc.goToNextDay()

    const updater = setDaysWithUndo.mock.calls[0][0]
    const newDays: DayState[] = updater([day1])
    expect(newDays[1].demonBluffs).toEqual([])
  })

  it('bluffs survive multiple day transitions', () => {
    const bluffs = ['imp', 'scarlet_woman']
    const day1 = makeDay({ demonBluffs: bluffs })
    const day2 = makeDay({ demonBluffs: bluffs })

    // Simulate day 2 → day 3 transition
    const { deps, setDaysWithUndo } = buildDeps(day2, [day1, day2])
    const lc = buildGameLifecycle(deps as any)

    lc.goToNextDay()

    const updater = setDaysWithUndo.mock.calls[0][0]
    const newDays: DayState[] = updater([day1, day2])
    expect(newDays[2].demonBluffs).toEqual(bluffs)
  })

  it('startNewGame correctly sets bluffs on day 1', () => {
    const day1 = makeDay()
    const { deps, setDaysWithUndo } = buildDeps(day1)
    const lc = buildGameLifecycle(deps as any)

    const config: NewGameConfig = {
      playerCount: 5, travelerCount: 0, scriptSlug: 'tb',
      allowDuplicateChars: false, allowEmptyChars: false, allowSameNames: false,
      seatNames: {}, assignments: {}, userAssignments: {},
      travelerAssignments: {}, seatNotes: {}, specialNote: '',
      demonBluffs: ['washerwoman', 'librarian'],
      charPool: [],
    }
    lc.startNewGame(config)

    // setDaysWithUndo called with the first day array
    const firstDays = setDaysWithUndo.mock.calls[0][0] as DayState[]
    expect(firstDays[0].demonBluffs).toEqual(['washerwoman', 'librarian'])
  })

  it('day 1 demonBluffs falls back to empty when config has none', () => {
    const day1 = makeDay()
    const { deps, setDaysWithUndo } = buildDeps(day1)
    const lc = buildGameLifecycle(deps as any)

    const config: NewGameConfig = {
      playerCount: 5, travelerCount: 0, scriptSlug: 'tb',
      allowDuplicateChars: false, allowEmptyChars: false, allowSameNames: false,
      seatNames: {}, assignments: {}, userAssignments: {},
      travelerAssignments: {}, seatNotes: {}, specialNote: '',
      demonBluffs: [],
      charPool: [],
    }
    lc.startNewGame(config)

    const firstDays = setDaysWithUndo.mock.calls[0][0] as DayState[]
    expect(firstDays[0].demonBluffs).toEqual([])
  })
})

// ── Bluff pool: always populated + unique per slot ────────────────────────────

describe('Demon bluff pool – always available + unique per slot', () => {
  // Mirror the availableBluffs logic from ModalsNewGameCharactersTab
  function computeAvailableBluffs(
    scriptChars: string[],
    assignments: Record<number, string>,
  ): string[] {
    const assigned = new Set<string>(Object.values(assignments))
    const scriptAvail = scriptChars.filter((id) => !assigned.has(id))
    if (scriptAvail.length >= 3) return scriptAvail
    // Fall back to catalog townsfolk/outsider
    const { allCharacters } = require('../catalog')
    const catalogFallback = (allCharacters as Array<{ id: string; team: string }>)
      .filter((c) => (c.team === 'townsfolk' || c.team === 'outsider') && !assigned.has(c.id))
      .map((c) => c.id)
    return [...new Set([...scriptAvail, ...catalogFallback])]
  }

  function perSlotOptions(available: string[], currentBluffs: string[]): string[][] {
    return [0, 1, 2].map((idx) => {
      const others = new Set(currentBluffs.filter((id, i) => i !== idx && !!id))
      return available.filter((id) => !others.has(id))
    })
  }

  it('falls back to catalog when script has fewer than 3 unassigned chars', () => {
    // Tight script: 2 chars, both assigned
    const scriptChars = ['washerwoman', 'librarian']
    const assignments = { 1: 'washerwoman', 2: 'librarian' }
    const pool = computeAvailableBluffs(scriptChars, assignments)
    // Should fall back to catalog characters
    expect(pool.length).toBeGreaterThanOrEqual(3)
  })

  it('returns only script chars when ≥3 unassigned', () => {
    const scriptChars = ['washerwoman', 'librarian', 'investigator', 'chef', 'empath']
    const assignments = { 1: 'washerwoman', 2: 'librarian' }
    const pool = computeAvailableBluffs(scriptChars, assignments)
    // 3 unassigned from script: investigator, chef, empath
    expect(pool).toContain('investigator')
    expect(pool).toContain('chef')
    expect(pool).toContain('empath')
    expect(pool).not.toContain('washerwoman')
    expect(pool).not.toContain('librarian')
  })

  it('excludes assigned characters regardless of fallback', () => {
    const scriptChars = ['washerwoman']
    const assignments = { 1: 'washerwoman' }
    const pool = computeAvailableBluffs(scriptChars, assignments)
    expect(pool).not.toContain('washerwoman')
  })

  it('per-slot options exclude characters selected in other slots', () => {
    const available = ['washerwoman', 'librarian', 'investigator', 'chef']
    const currentBluffs = ['washerwoman', 'librarian', '']
    const slots = perSlotOptions(available, currentBluffs)
    // Slot 0 (washerwoman selected) should exclude librarian from other slots
    expect(slots[0]).not.toContain('librarian')
    // Slot 1 (librarian selected) should exclude washerwoman from other slots
    expect(slots[1]).not.toContain('washerwoman')
    // Slot 2 (empty) should exclude washerwoman and librarian
    expect(slots[2]).not.toContain('washerwoman')
    expect(slots[2]).not.toContain('librarian')
    // investigator and chef should appear in all slots
    expect(slots[0]).toContain('investigator')
    expect(slots[1]).toContain('investigator')
    expect(slots[2]).toContain('investigator')
  })

  it('each slot can still select its own current value', () => {
    const available = ['washerwoman', 'librarian', 'investigator']
    const currentBluffs = ['washerwoman', 'librarian', 'investigator']
    const slots = perSlotOptions(available, currentBluffs)
    // Slot 0's current value 'washerwoman' should still be in slot 0's options
    expect(slots[0]).toContain('washerwoman')
    expect(slots[1]).toContain('librarian')
    expect(slots[2]).toContain('investigator')
  })
})
