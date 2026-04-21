import type { DayState, EndGameResult, ExportConfig, GameRecord } from '../components/StorytellerSub/types'

export interface ExportDeps {
  days: DayState[]
  currentDay: DayState
  activeScriptSlug?: string
  activeScriptTitle?: string
  endGameResult: EndGameResult | null
  timerDefaults: any
  customTagPool?: string[]
  playerNamePool?: string[]
  setGameRecords: React.Dispatch<React.SetStateAction<GameRecord[]>>
  setCurrentRecordName?: (name: string | null) => void
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function buildGameExport(deps: ExportDeps) {
  const { days, currentDay, activeScriptSlug, activeScriptTitle, endGameResult, timerDefaults, customTagPool = [], playerNamePool = [], setGameRecords, setCurrentRecordName } = deps

  function exportGameJson(config?: ExportConfig) {
    const cfg: ExportConfig = config ?? { includeSeats: true, includeVotes: true, includeSkills: true, includeEvents: false, includeStNotes: false, dayFilter: 'all' }
    const filteredDays = cfg.dayFilter === 'all' ? days : days.filter((d) => (cfg.dayFilter as number[]).includes(d.day))
    const exportDays = filteredDays.map((d) => {
      const entry: Record<string, unknown> = { day: d.day }
      if (cfg.includeSeats) entry.seats = cfg.includeStNotes ? d.seats : d.seats.map(({ note: _n, characterId: _c, userCharacterId: _u, teamTag: _t, ...pub }) => pub)
      if (cfg.includeVotes) entry.voteHistory = d.voteHistory
      if (cfg.includeSkills) entry.skillHistory = d.skillHistory
      if (cfg.includeEvents) entry.eventLog = cfg.includeStNotes ? d.eventLog : d.eventLog.filter((e) => e.kind === 'stateChange' || e.kind === 'phaseTransition')
      return entry
    })
    downloadJson({ exportedAt: new Date().toISOString(), scriptTitle: activeScriptTitle, scriptSlug: activeScriptSlug, days: exportDays }, `botc-gamelog-${Date.now()}.json`)
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
    downloadJson({
      exportedAt: new Date().toISOString(), recordName: record.recordName,
      scriptTitle: record.scriptTitle, scriptSlug: record.scriptSlug,
      days: record.savedDays, timerDefaults: (record as any).timerDefaults,
      customTagPool: (record as any).customTagPool, playerNamePool: (record as any).playerNamePool,
    }, `botc-save-${record.recordName?.replace(/\s+/g, '-') || 'game'}-${record.id}.json`)
  }

  function buildRecordBase(_savedAt: number) {
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
    return { nonTravelers, travelers, seatNames, assignments, userAssignments, seatNotes }
  }

  function confirmEndGame(recordName?: string, surveyData?: any) {
    const survey = surveyData || endGameResult
    if (!survey) return
    const summaries = currentDay.seats.map((s) => ({ seat: s.seat, name: s.name, team: survey.playerTeams?.[s.seat] as any ?? 'good' }))
    const updatedDays = days.map((d) => d.id === currentDay.id ? { ...d, gameEnded: currentDay.gameEnded } : d)
    const { nonTravelers, travelers, seatNames, assignments, userAssignments, seatNotes } = buildRecordBase(Date.now())
    const newRecord: any = {
      id: `${Date.now()}`, endedAt: Date.now(), scriptTitle: activeScriptTitle, scriptSlug: activeScriptSlug,
      winner: survey.winner ?? null, playerSummaries: summaries,
      mvp: survey.mvp ?? null, balanced: survey.balanced ?? null, funEvil: survey.funEvil ?? null,
      funGood: survey.funGood ?? null, replay: survey.replay ?? null, otherNote: survey.otherNote ?? '',
      days: days.map((d) => ({ day: d.day, votes: d.voteHistory.length, skills: d.skillHistory.length })),
      savedDays: updatedDays,
      setup: { playerCount: nonTravelers.length, travelerCount: travelers.length, seatNames, assignments, userAssignments, seatNotes, specialNote: '', demonBluffs: currentDay.demonBluffs || [] },
    }
    if (recordName) newRecord.recordName = recordName
    setGameRecords((cur) => [newRecord, ...cur])
  }

  function saveGame(name?: string, existingId?: string, surveyData?: any) {
    const savedAt = Date.now()
    const recordId = existingId || `save-${savedAt}`
    const finalName = name || `Game ${new Date(savedAt).toLocaleDateString()}`
    const survey = surveyData || endGameResult
    const { nonTravelers, travelers, seatNames, assignments, userAssignments, seatNotes } = buildRecordBase(savedAt)
    const newRecord: any = {
      id: recordId, endedAt: savedAt, recordName: finalName, scriptTitle: activeScriptTitle, scriptSlug: activeScriptSlug,
      winner: survey?.winner ?? null,
      playerSummaries: currentDay.seats.map((s) => ({ seat: s.seat, name: s.name, team: survey?.playerTeams?.[s.seat] as any ?? null })),
      mvp: survey?.mvp ?? null, balanced: survey?.balanced ?? null, funEvil: survey?.funEvil ?? null,
      funGood: survey?.funGood ?? null, replay: survey?.replay ?? null, otherNote: survey?.otherNote ?? '',
      days: days.map((d) => ({ day: d.day, votes: d.voteHistory.length, skills: d.skillHistory.length })),
      savedDays: days, timerDefaults, customTagPool, playerNamePool,
      setup: { playerCount: nonTravelers.length, travelerCount: travelers.length, seatNames, assignments, userAssignments, seatNotes, specialNote: '', demonBluffs: currentDay.demonBluffs || [] },
    }
    if (existingId) setGameRecords((cur) => cur.map((r) => r.id === existingId ? newRecord : r))
    else setGameRecords((cur) => [newRecord, ...cur])
    if (setCurrentRecordName) setCurrentRecordName(finalName)
  }

  return { exportGameJson, exportGameSetup, exportEndGameResults, exportRecordJson, confirmEndGame, saveGame }
}
