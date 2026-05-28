/**
 * Tests: Game ID features introduced 2026-05-28
 *
 * Covers:
 *   - GAME_DEAL_KEY format and per-game isolation
 *   - autoGameName filename format (underscore date, gameId suffix)
 *   - saveGame stable ID (upsert, not append) via gameId
 *   - saveGame auto-name uses script title + date + gameId
 *   - confirmEndGame auto-name uses same format
 *   - exportGameJson download filename uses autoGameName
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GAME_DEAL_KEY, ACTIVE_HOST_DEAL_KEY } from '../lib/firebaseDeal'
import { autoGameName, buildGameExport } from '../hooks/useGameExport'
import type { DayState } from '../components/StorytellerSub/types'

vi.mock('../lib/exportGame', () => ({
  exportGameFile: vi.fn().mockResolvedValue(undefined),
}))

// ── GAME_DEAL_KEY ─────────────────────────────────────────────────────────────

describe('GAME_DEAL_KEY', () => {
  it('returns correct key format', () => {
    expect(GAME_DEAL_KEY('abc123')).toBe('botc-deal-game-abc123')
  })

  it('is distinct from ACTIVE_HOST_DEAL_KEY', () => {
    expect(GAME_DEAL_KEY('abc')).not.toBe(ACTIVE_HOST_DEAL_KEY)
  })

  it('different gameIds produce different keys', () => {
    expect(GAME_DEAL_KEY('game1')).not.toBe(GAME_DEAL_KEY('game2'))
  })

  it('same gameId always returns same key (stable)', () => {
    const id = 'stableId123'
    expect(GAME_DEAL_KEY(id)).toBe(GAME_DEAL_KEY(id))
  })

  it('key contains the gameId verbatim', () => {
    const id = 'XYZabc789'
    expect(GAME_DEAL_KEY(id)).toContain(id)
  })
})

// ── autoGameName ──────────────────────────────────────────────────────────────

describe('autoGameName', () => {
  // Use a fixed date: 2026-05-28
  const savedAt = new Date('2026-05-28T00:00:00.000Z').getTime()

  it('includes script title with spaces replaced by underscores', () => {
    const name = autoGameName('No Roles Barred', 'gid123', savedAt)
    expect(name).toMatch(/No_Roles_Barred/)
  })

  it('includes gameId at end', () => {
    const name = autoGameName('My Script', 'gid123', savedAt)
    expect(name.endsWith('gid123')).toBe(true)
  })

  it('date uses underscores not slashes', () => {
    const name = autoGameName('Script', 'gid', savedAt)
    expect(name).not.toContain('/')
    expect(name).toMatch(/\d{4}_\d{2}_\d{2}/)
  })

  it('format is Title_YYYY_MM_DD_gameId', () => {
    const name = autoGameName('BotC', 'abc', new Date('2026-05-28T12:00:00.000Z').getTime())
    expect(name).toMatch(/^BotC_2026_05_28_abc$/)
  })

  it('strips leading/trailing underscores from title', () => {
    const name = autoGameName('  Test  ', 'g1', savedAt)
    expect(name).not.toMatch(/^_/)        // no leading underscore
    expect(name).not.toMatch(/^Test__/)   // no double underscore between title and date
  })

  it('falls back to "Game" when scriptTitle is undefined', () => {
    const name = autoGameName(undefined, 'g1', savedAt)
    expect(name).toMatch(/^Game_/)
  })

  it('omits gameId suffix when gameId is undefined', () => {
    const name = autoGameName('MyScript', undefined, savedAt)
    expect(name).toMatch(/^MyScript_\d{4}_\d{2}_\d{2}$/)
  })

  it('special characters in title become underscores', () => {
    const name = autoGameName('No Roles Barred - Legacy', 'g1', savedAt)
    expect(name).toMatch(/No_Roles_Barred_Legacy/)
    expect(name).not.toContain(' ')
    expect(name).not.toContain('-')
  })

  it('collapses consecutive underscores from title', () => {
    // "A  B" → two spaces → "A__B" would be bad; ensure collapse
    const name = autoGameName('A  B', 'g1', savedAt)
    expect(name).not.toMatch(/A__B/)
  })
})

// ── saveGame stable ID (upsert) ───────────────────────────────────────────────

function makeDay(day: number): DayState {
  return {
    id: `day-${day}`, day,
    phase: 'night',
    nominationStep: 'waitingForNomination',
    seats: [{ seat: 1, name: 'Alice', alive: true, isTraveler: false, isExecuted: false,
      hasNoVote: false, customTags: [], stTags: [], characterId: 'imp',
      userCharacterId: null, teamTag: 'evil', note: '' }],
    voteHistory: [], skillHistory: [], eventLog: [],
    voteDraft: { voters: [], noVoters: [], actor: null, target: null, isExile: false, voteCountOverride: null },
    votingState: null, publicMode: 'freeform', currentSpeakerSeat: null,
    roundRobinSpokenSeats: [], nightVisitedSeats: [], demonBluffs: [], gameEnded: false,
  }
}

describe('saveGame — stable gameId-based upsert', () => {
  let setGameRecords: ReturnType<typeof vi.fn>
  let setCurrentRecordName: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setGameRecords = vi.fn()
    setCurrentRecordName = vi.fn()
  })

  function makeExport(gameId?: string) {
    return buildGameExport({
      days: [makeDay(1)],
      currentDay: makeDay(1),
      activeScriptSlug: 'nrb',
      activeScriptTitle: 'No Roles Barred',
      endGameResult: null,
      timerDefaults: {} as any,
      setGameRecords,
      setCurrentRecordName,
      gameId,
    })
  }

  it('uses game-<gameId> as record ID when gameId present', () => {
    const { saveGame } = makeExport('testgameid')
    saveGame()
    const result = setGameRecords.mock.calls[0][0]([])
    expect(result[0].id).toBe('game-testgameid')
  })

  it('falls back to save-<timestamp> ID when no gameId', () => {
    const { saveGame } = makeExport(undefined)
    saveGame()
    const result = setGameRecords.mock.calls[0][0]([])
    expect(result[0].id).toMatch(/^save-\d+$/)
  })

  it('second saveGame call overwrites first (upsert, not append)', () => {
    const { saveGame } = makeExport('gid1')
    // First save
    saveGame('First')
    const firstResult = setGameRecords.mock.calls[0][0]([])
    // Second save — pass existing state as input
    saveGame('Second')
    const secondResult = setGameRecords.mock.calls[1][0](firstResult)
    // Must still be length 1, not 2
    expect(secondResult).toHaveLength(1)
    expect(secondResult[0].recordName).toBe('Second')
  })

  it('does not create duplicate when same gameId saved twice', () => {
    const { saveGame } = makeExport('dupcheck')
    saveGame('A')
    const state1 = setGameRecords.mock.calls[0][0]([])
    saveGame('B')
    const state2 = setGameRecords.mock.calls[1][0](state1)
    expect(state2).toHaveLength(1)
  })

  it('does not affect other records with different IDs', () => {
    const { saveGame } = makeExport('gid2')
    const existing = [{ id: 'other-record', recordName: 'Other' }]
    saveGame('New')
    const result = setGameRecords.mock.calls[0][0](existing)
    expect(result).toHaveLength(2)
    expect(result.find((r: any) => r.id === 'other-record')).toBeDefined()
  })

  it('auto-name uses script title + underscore date + gameId', () => {
    const { saveGame } = makeExport('mygameid')
    saveGame() // no explicit name
    const result = setGameRecords.mock.calls[0][0]([])
    const name: string = result[0].recordName
    expect(name).toMatch(/^No_Roles_Barred_\d{4}_\d{2}_\d{2}_mygameid$/)
  })
})

// ── confirmEndGame auto-name ──────────────────────────────────────────────────

describe('confirmEndGame — auto-name format', () => {
  let setGameRecords: ReturnType<typeof vi.fn>
  let setCurrentRecordName: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setGameRecords = vi.fn()
    setCurrentRecordName = vi.fn()
  })

  it('auto-name follows Title_YYYY_MM_DD_gameId pattern', () => {
    const { confirmEndGame } = buildGameExport({
      days: [makeDay(1)],
      currentDay: makeDay(1),
      activeScriptSlug: 'tb',
      activeScriptTitle: 'Trouble Brewing',
      endGameResult: { winner: 'good', playerTeams: {}, mvp: null, balanced: null,
        funEvil: null, funGood: null, replay: null, otherNote: '' },
      timerDefaults: {} as any,
      setGameRecords,
      setCurrentRecordName,
      gameId: 'endgid',
    })
    confirmEndGame()
    const result = setGameRecords.mock.calls[0][0]([])
    expect(result[0].recordName).toMatch(/^Trouble_Brewing_\d{4}_\d{2}_\d{2}_endgid$/)
  })

  it('respects explicit recordName override', () => {
    const { confirmEndGame } = buildGameExport({
      days: [makeDay(1)], currentDay: makeDay(1),
      activeScriptTitle: 'TB',
      endGameResult: { winner: 'evil', playerTeams: {}, mvp: null, balanced: null,
        funEvil: null, funGood: null, replay: null, otherNote: '' },
      timerDefaults: {} as any,
      setGameRecords,
      gameId: 'g1',
    })
    confirmEndGame('My Custom Name')
    const result = setGameRecords.mock.calls[0][0]([])
    expect(result[0].recordName).toBe('My Custom Name')
  })
})

// ── exportGameJson filename ───────────────────────────────────────────────────

describe('exportGameJson — filename', () => {
  it('download filename follows Title_YYYY_MM_DD_gameId.json pattern', async () => {
    const { exportGameFile } = await import('../lib/exportGame')
    let capturedFilename = ''
    ;(exportGameFile as ReturnType<typeof vi.fn>).mockImplementationOnce((_json: string, fn: string) => {
      capturedFilename = fn
      return Promise.resolve()
    })
    const { exportGameJson } = buildGameExport({
      days: [makeDay(1)], currentDay: makeDay(1),
      activeScriptTitle: 'Shadow Of Night',
      endGameResult: null,
      timerDefaults: {} as any,
      setGameRecords: vi.fn(),
      gameId: 'fileid',
    })
    exportGameJson()
    expect(capturedFilename).toMatch(/^Shadow_Of_Night_\d{4}_\d{2}_\d{2}_fileid\.json$/)
  })
})
