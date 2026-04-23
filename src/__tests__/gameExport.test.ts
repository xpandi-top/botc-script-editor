import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildGameExport } from '../hooks/useGameExport'
import type { DayState, ExportConfig } from '../components/StorytellerSub/types'

// Suppress native share API calls in tests
vi.mock('../lib/exportGame', () => ({
  exportGameFile: vi.fn().mockResolvedValue(undefined),
}))

function makeDay(day: number, overrides: Partial<DayState> = {}): DayState {
  return {
    id: `day-${day}`,
    day,
    phase: 'night',
    nominationStep: 'waitingForNomination',
    seats: [
      { seat: 1, name: 'Alice', alive: true, isTraveler: false, isExecuted: false,
        hasNoVote: false, customTags: [], stTags: [], characterId: 'imp', userCharacterId: null, teamTag: 'evil', note: '' },
    ],
    voteHistory: [],
    skillHistory: [],
    eventLog: [],
    voteDraft: { voters: [], noVoters: [], actor: null, target: null, isExile: false, voteCountOverride: null },
    votingState: null,
    publicMode: 'freeform',
    currentSpeakerSeat: null,
    roundRobinSpokenSeats: [],
    nightVisitedSeats: [],
    demonBluffs: [],
    gameEnded: false,
    ...overrides,
  }
}

describe('buildGameExport', () => {
  let setGameRecords: ReturnType<typeof vi.fn>
  let setCurrentRecordName: ReturnType<typeof vi.fn>
  const days = [makeDay(1), makeDay(2)]
  const currentDay = days[0]

  beforeEach(() => {
    setGameRecords = vi.fn()
    setCurrentRecordName = vi.fn()
  })

  function makeExport(overrides = {}) {
    return buildGameExport({
      days,
      currentDay,
      activeScriptSlug: 'my-script',
      activeScriptTitle: 'My Script',
      endGameResult: null,
      timerDefaults: {} as any,
      customTagPool: [],
      playerNamePool: [],
      setGameRecords,
      setCurrentRecordName,
      ...overrides,
    })
  }

  describe('saveGame', () => {
    it('creates a new record and calls setGameRecords', () => {
      const { saveGame } = makeExport()
      saveGame('Test Game')
      expect(setGameRecords).toHaveBeenCalledOnce()
      const updater = setGameRecords.mock.calls[0][0]
      const result = updater([])
      expect(result).toHaveLength(1)
      expect(result[0].recordName).toBe('Test Game')
    })

    it('sets currentRecordName after save', () => {
      const { saveGame } = makeExport()
      saveGame('My Game')
      expect(setCurrentRecordName).toHaveBeenCalledWith('My Game')
    })

    it('updates existing record when existingId provided', () => {
      const { saveGame } = makeExport()
      const existing = [{ id: 'existing-id', recordName: 'Old Name' }]
      saveGame('New Name', 'existing-id')
      const updater = setGameRecords.mock.calls[0][0]
      const result = updater(existing)
      expect(result).toHaveLength(1)
      expect(result[0].recordName).toBe('New Name')
    })

    it('uses default name when none provided', () => {
      const { saveGame } = makeExport()
      saveGame()
      const updater = setGameRecords.mock.calls[0][0]
      const result = updater([])
      expect(result[0].recordName).toMatch(/Game/)
    })

    it('stores savedDays in record', () => {
      const { saveGame } = makeExport()
      saveGame('Check Days')
      const updater = setGameRecords.mock.calls[0][0]
      const result = updater([])
      expect(result[0].savedDays).toHaveLength(2)
    })

    it('stores script metadata', () => {
      const { saveGame } = makeExport()
      saveGame('Check Meta')
      const updater = setGameRecords.mock.calls[0][0]
      const result = updater([])
      expect(result[0].scriptSlug).toBe('my-script')
      expect(result[0].scriptTitle).toBe('My Script')
    })
  })

  describe('confirmEndGame', () => {
    it('calls setGameRecords with winner data', () => {
      const endGameResult = {
        winner: 'good' as const,
        playerTeams: { 1: 'good' as const },
        mvp: null, balanced: null, funEvil: null, funGood: null, replay: null, otherNote: '',
      }
      const { confirmEndGame } = makeExport({ endGameResult })
      confirmEndGame('Final Record')
      expect(setGameRecords).toHaveBeenCalledOnce()
      const updater = setGameRecords.mock.calls[0][0]
      const result = updater([])
      expect(result[0].winner).toBe('good')
      expect(result[0].recordName).toBe('Final Record')
    })

    it('does nothing when endGameResult is null', () => {
      const { confirmEndGame } = makeExport({ endGameResult: null })
      confirmEndGame()
      expect(setGameRecords).not.toHaveBeenCalled()
    })
  })
})
