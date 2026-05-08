import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildGameLifecycle } from '../hooks/useGameLifecycle'
import type { DayState, StorytellerSeat } from '../components/StorytellerSub/types'

// ── Minimal fixtures ──────────────────────────────────────────────────────────

function makeSeat(seat: number): StorytellerSeat {
  return {
    seat, name: `Player ${seat}`, alive: true, isTraveler: false,
    isExecuted: false, hasNoVote: false, customTags: [], stTags: [],
    characterId: null, userCharacterId: null, teamTag: null, note: '',
  }
}

function makeDay(seats: StorytellerSeat[] = []): DayState {
  return {
    id: 'day-1', day: 1, phase: 'night', publicMode: 'free',
    nominationStep: 'waitingForNomination',
    privateSeconds: 0, publicFreeSeconds: 0, publicRoundRobinSeconds: 0,
    publicElapsedSeconds: 0, nominationWaitSeconds: 0,
    nominationActorSeconds: 0, nominationTargetSeconds: 0,
    currentSpeakerSeat: null, roundRobinSpokenSeats: [],
    seats,
    voteDraft: { actor: null, target: null, voters: [], noVoters: [], note: '', manualPassed: null, nominationResult: 'succeed', isExile: false, voteCountOverride: null },
    votingState: null, voteHistory: [], skillHistory: [], eventLog: [],
    nightVisitedSeats: [], gameEnded: false, demonBluffs: [],
  }
}

function makeTimerDefaults() {
  return {
    privateSeconds: 300, publicFreeSeconds: 300, publicRoundRobinSeconds: 120,
    nominationDelayMinutes: 0, nominationWaitSeconds: 60,
    nominationActorSeconds: 60, nominationTargetSeconds: 60,
    nominationVoteSeconds: 10, alarmSound: 'bell',
  }
}

function makeLifecycleDeps(overrides: Record<string, any> = {}) {
  const day = makeDay([makeSeat(1), makeSeat(2)])
  return {
    days: [day],
    currentDay: day,
    selectedDayIndex: 0,
    timerDefaults: makeTimerDefaults(),
    scriptOptions: [{ slug: 'tb', characters: [], title: 'Trouble Brewing' }],
    setDays: vi.fn(),
    setDaysWithUndo: vi.fn(),
    setSelectedDayId: vi.fn(),
    setPickerMode: vi.fn(),
    setIsTimerRunning: vi.fn(),
    setSeatTagDrafts: vi.fn(),
    setSkillOverlay: vi.fn(),
    setNewGamePanel: vi.fn(),
    setEndGameResult: vi.fn(),
    setGameRecords: vi.fn(),
    setSelectedAudioSrc: vi.fn(),
    setAudioPlaying: vi.fn(),
    nightBgmSrc: 'audio/test.mp3',
    language: 'en' as const,
    appendEvent: vi.fn((d) => d),
    endGameResult: null,
    ...overrides,
  }
}

// ── hasActiveGame ─────────────────────────────────────────────────────────────

describe('hasActiveGame', () => {
  it('returns false when gameStartedAt is undefined', () => {
    const lc = buildGameLifecycle(makeLifecycleDeps({ gameStartedAt: undefined }))
    expect(lc.hasActiveGame()).toBe(false)
  })

  it('returns false when seats are empty even if gameStartedAt is set', () => {
    const emptyDay = makeDay([])
    const lc = buildGameLifecycle(makeLifecycleDeps({
      gameStartedAt: Date.now(),
      currentDay: emptyDay,
    }))
    expect(lc.hasActiveGame()).toBe(false)
  })

  it('returns true when gameStartedAt is set and seats exist', () => {
    const lc = buildGameLifecycle(makeLifecycleDeps({ gameStartedAt: Date.now() }))
    expect(lc.hasActiveGame()).toBe(true)
  })
})

// ── openNewGamePanel — prompt vs direct open ──────────────────────────────────

describe('openNewGamePanel', () => {
  it('opens panel directly when no active game', () => {
    const setNewGamePanel = vi.fn()
    const setShowSaveBeforeNewGame = vi.fn()
    const lc = buildGameLifecycle(makeLifecycleDeps({
      gameStartedAt: undefined,
      setNewGamePanel,
      setShowSaveBeforeNewGame,
    }))
    lc.openNewGamePanel()
    expect(setShowSaveBeforeNewGame).not.toHaveBeenCalled()
    expect(setNewGamePanel).toHaveBeenCalledOnce()
  })

  it('shows save prompt when active game exists', () => {
    const setNewGamePanel = vi.fn()
    const setShowSaveBeforeNewGame = vi.fn()
    const lc = buildGameLifecycle(makeLifecycleDeps({
      gameStartedAt: Date.now(),
      setNewGamePanel,
      setShowSaveBeforeNewGame,
    }))
    lc.openNewGamePanel()
    expect(setShowSaveBeforeNewGame).toHaveBeenCalledWith(true)
    expect(setNewGamePanel).not.toHaveBeenCalled()
  })

  it('opens panel directly when no setShowSaveBeforeNewGame provided (fallback)', () => {
    const setNewGamePanel = vi.fn()
    const lc = buildGameLifecycle(makeLifecycleDeps({
      gameStartedAt: Date.now(),
      setNewGamePanel,
      // setShowSaveBeforeNewGame intentionally omitted
    }))
    lc.openNewGamePanel()
    expect(setNewGamePanel).toHaveBeenCalledOnce()
  })
})

// ── confirmNewGameDiscard ─────────────────────────────────────────────────────

describe('confirmNewGameDiscard', () => {
  it('opens the new game panel without saving', () => {
    const setNewGamePanel = vi.fn()
    const setGameRecords = vi.fn()
    const lc = buildGameLifecycle(makeLifecycleDeps({
      gameStartedAt: Date.now(),
      setNewGamePanel,
      setGameRecords,
    }))
    lc.confirmNewGameDiscard()
    expect(setNewGamePanel).toHaveBeenCalledOnce()
    expect(setGameRecords).not.toHaveBeenCalled()
  })
})

// ── confirmNewGameAfterSave ───────────────────────────────────────────────────

describe('confirmNewGameAfterSave', () => {
  it('saves game record then opens the new game panel', () => {
    const setNewGamePanel = vi.fn()
    const setGameRecords = vi.fn()
    const lc = buildGameLifecycle(makeLifecycleDeps({
      gameStartedAt: Date.now(),
      setNewGamePanel,
      setGameRecords,
    }))
    lc.confirmNewGameAfterSave()
    expect(setGameRecords).toHaveBeenCalledOnce()
    expect(setNewGamePanel).toHaveBeenCalledOnce()
  })

  it('saves before opening panel (save call precedes panel call)', () => {
    const callOrder: string[] = []
    const setNewGamePanel = vi.fn(() => callOrder.push('panel'))
    const setGameRecords = vi.fn(() => callOrder.push('save'))
    const lc = buildGameLifecycle(makeLifecycleDeps({
      gameStartedAt: Date.now(),
      setNewGamePanel,
      setGameRecords,
    }))
    lc.confirmNewGameAfterSave()
    expect(callOrder).toEqual(['save', 'panel'])
  })
})
