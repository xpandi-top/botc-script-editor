import type { DayState, EndGameResult, ExportConfig, GameRecord, TimerDefaults } from '../components/StorytellerSub/types'
import { exportGameFile } from '../lib/exportGame'

export interface ExportDeps {
  days: DayState[]
  currentDay: DayState
  activeScriptSlug?: string
  activeScriptTitle?: string
  activeScriptVersion?: string
  endGameResult: EndGameResult | null
  timerDefaults: TimerDefaults
  customTagPool?: string[]
  playerNamePool?: string[]
  stFabledIds?: string[]
  stCustomRules?: string
  setGameRecords: React.Dispatch<React.SetStateAction<GameRecord[]>>
  setCurrentRecordName?: (name: string | null) => void
  gameStartedAt?: number
  gameId?: string
  stName?: string
}

function autoGameName(scriptTitle: string | undefined, gameId: string | undefined, savedAt: number): string {
  const title = (scriptTitle ?? 'Game').replace(/[^a-zA-Z0-9一-鿿]+/g, '_').replace(/^_+|_+$/g, '') || 'Game'
  const date = new Date(savedAt).toISOString().slice(0, 10).replace(/-/g, '_')
  return gameId ? `${title}_${date}_${gameId}` : `${title}_${date}`
}

function downloadJson(data: unknown, filename: string) {
  exportGameFile(JSON.stringify(data, null, 2), filename).catch(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

export function buildGameExport(deps: ExportDeps) {
  const {
    days, currentDay, activeScriptSlug, activeScriptTitle, activeScriptVersion,
    endGameResult, timerDefaults, customTagPool = [], playerNamePool = [],
    stFabledIds = [], stCustomRules = '', setGameRecords, setCurrentRecordName,
    gameStartedAt, gameId, stName,
  } = deps

  function exportGameJson(config?: ExportConfig) {
    const cfg: ExportConfig = config ?? { includeSeats: true, includeVotes: true, includeSkills: true, includeEvents: false, includeStNotes: false, dayFilter: 'all' }
    const filteredDays = cfg.dayFilter === 'all' ? days : days.filter((d) => (cfg.dayFilter as number[]).includes(d.day))
    const exportDays = filteredDays.map((d) => {
      const entry: Record<string, unknown> = { day: d.day }
      if (cfg.includeSeats) entry.seats = cfg.includeStNotes ? d.seats : d.seats.map(({ note: _n, ...pub }) => pub)
      if (cfg.includeVotes) entry.voteHistory = d.voteHistory
      if (cfg.includeSkills) entry.skillHistory = d.skillHistory
      if (cfg.includeEvents) entry.eventLog = cfg.includeStNotes ? d.eventLog : d.eventLog.filter((e) => e.kind === 'stateChange' || e.kind === 'phaseTransition')
      return entry
    })
    const now = Date.now()
    downloadJson({ exportedAt: new Date().toISOString(), scriptTitle: activeScriptTitle, scriptSlug: activeScriptSlug, days: exportDays }, `${autoGameName(activeScriptTitle, gameId, now)}.json`)
  }

  function exportGameSetup() {
    const d = days[days.length - 1] ?? currentDay
    downloadJson({
      exportedAt: new Date().toISOString(), scriptTitle: activeScriptTitle, scriptSlug: activeScriptSlug,
      seats: d.seats.map((s) => ({ seat: s.seat, name: s.name, isTraveler: s.isTraveler, characterId: s.characterId, userCharacterId: s.userCharacterId, team: s.teamTag, note: s.note })),
    }, `botc-setup-${Date.now()}.json`)
  }

  function exportEndGameResults(gameRecords: Array<Record<string, unknown>>) {
    downloadJson({ exportedAt: new Date().toISOString(), scriptTitle: activeScriptTitle, results: gameRecords }, `botc-results-${Date.now()}.json`)
  }

  function exportRecordJson(record: GameRecord) {
    downloadJson({ ...record, exportedAt: new Date().toISOString() }, `botc-record-${record.recordName?.replace(/\s+/g, '-') || 'game'}-${record.id}.json`)
  }

  // ── Shared record builder ────────────────────────────────────────
  function buildRecord(opts: {
    id: string
    recordName: string
    savedDaysOverride?: DayState[]
    survey: EndGameResult | null
  }): GameRecord {
    const { id, recordName, savedDaysOverride, survey } = opts
    const savedAt = Date.now()
    const nonTravelers = currentDay.seats.filter((s) => !s.isTraveler)
    const travelers = currentDay.seats.filter((s) => s.isTraveler)
    const seatNames: Record<number, string> = {}
    const assignments: Record<number, string> = {}
    const userAssignments: Record<number, string | null> = {}
    const seatNotes: Record<number, string> = {}
    for (const s of currentDay.seats) {
      seatNames[s.seat] = s.name
      if (s.characterId) assignments[s.seat] = s.characterId
      if (s.userCharacterId) userAssignments[s.seat] = s.userCharacterId
      if (s.note) seatNotes[s.seat] = s.note
    }
    return {
      id,
      startedAt: gameStartedAt,
      endedAt: savedAt,
      durationMs: gameStartedAt ? savedAt - gameStartedAt : undefined,
      recordName,
      scriptTitle: activeScriptTitle,
      scriptVersion: activeScriptVersion,
      scriptSlug: activeScriptSlug,
      winner: survey?.winner ?? null,
      playerSummaries: currentDay.seats.map((s) => ({
        seat: s.seat,
        name: s.name,
        team: (survey?.playerTeams?.[s.seat] ?? null) as 'evil' | 'good' | null,
      })),
      mvp: survey?.mvp ?? null,
      balanced: survey?.balanced ?? null,
      funEvil: survey?.funEvil ?? null,
      funGood: survey?.funGood ?? null,
      replay: survey?.replay ?? null,
      otherNote: survey?.otherNote ?? '',
      days: days.map((d) => ({
        day: d.day,
        votes: d.voteHistory.length,
        votePassed: d.voteHistory.filter((v) => v.passed).length,
        skills: d.skillHistory.length,
        nominations: d.voteHistory.length, // each vote record = one nomination resolved
      })),
      savedDays: savedDaysOverride ?? days,
      timerDefaults,
      customTagPool,
      playerNamePool,
      setup: {
        playerCount: nonTravelers.length,
        travelerCount: travelers.length,
        seatNames,
        assignments,
        userAssignments,
        travelerAssignments: Object.fromEntries(
          travelers.filter((s) => s.characterId).map((s) => [s.seat, s.characterId!])
        ),
        seatNotes,
        specialNote: '',
        demonBluffs: currentDay.demonBluffs || [],
      },
      stFabledIds,
      stCustomRules,
      stName: stName || undefined,
    }
  }

  // ── confirmEndGame — end-of-game auto-save ───────────────────────
  // Merges currentDay.gameEnded flag into days array before saving.
  function confirmEndGame(recordName?: string, surveyData?: any) {
    const survey: EndGameResult | null = surveyData || endGameResult
    if (!survey) return
    const savedAt = Date.now()
    const id = gameId ? `${savedAt}-${gameId}` : `${savedAt}`
    const finalName = recordName || autoGameName(activeScriptTitle, gameId, savedAt)
    const mergedDays = days.map((d) =>
      d.id === currentDay.id ? { ...d, gameEnded: currentDay.gameEnded } : d
    )
    const record = buildRecord({ id, recordName: finalName, savedDaysOverride: mergedDays, survey })
    setGameRecords((cur) => [record, ...cur])
    if (setCurrentRecordName) setCurrentRecordName(finalName)
  }

  // ── saveGame — manual save / checkpoint ──────────────────────────
  function saveGame(name?: string, existingId?: string, surveyData?: any) {
    const savedAt = Date.now()
    // Use a stable gameId-based ID so repeated "save checkpoint" overwrites the same record
    const stableId = gameId ? `game-${gameId}` : null
    const id = existingId || stableId || `save-${savedAt}`
    const finalName = name || autoGameName(activeScriptTitle, gameId, savedAt)
    const survey: EndGameResult | null = surveyData || endGameResult
    const record = buildRecord({ id, recordName: finalName, survey })
    // Upsert: update existing record if same ID exists, otherwise prepend
    setGameRecords((cur) => {
      const idx = cur.findIndex((r) => r.id === id)
      if (idx !== -1) return cur.map((r) => r.id === id ? record : r)
      return [record, ...cur]
    })
    if (setCurrentRecordName) setCurrentRecordName(finalName)
  }

  return { exportGameJson, exportGameSetup, exportEndGameResults, exportRecordJson, confirmEndGame, saveGame }
}
