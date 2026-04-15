import { characterById } from '../catalog'
import { createDayState, createSeats, shuffleArray, CHARACTER_DISTRIBUTION, DEFAULT_PLAYER_COUNT, getNextRoundRobinSeat } from '../components/StorytellerSub/constants'
import type { DayState, EndGameResult, ExportConfig, GameRecord, NewGameConfig, Phase, NominationStep, StorytellerSeat, TimerDefaults } from '../components/StorytellerSub/types'
import type { Team } from '../types'

interface LifecycleDeps {
  days: DayState[]
  currentDay: DayState
  selectedDayIndex: number
  timerDefaults: TimerDefaults
  activeScriptSlug?: string
  activeScriptTitle?: string
  endGameResult: EndGameResult | null
  scriptOptions: Array<{ slug: string; characters: string[] }>
  onSelectScript?: (slug: string) => void
  setDays: React.Dispatch<React.SetStateAction<DayState[]>>
  setDaysWithUndo: React.Dispatch<React.SetStateAction<DayState[]>>
  setSelectedDayId: (id: string) => void
  setPickerMode: (m: any) => void
  setIsTimerRunning: (v: boolean) => void
  setSeatTagDrafts: React.Dispatch<React.SetStateAction<Record<number, string>>>
  setSkillOverlay: (v: null) => void
  setNewGamePanel: React.Dispatch<React.SetStateAction<NewGameConfig | null>>
  setEndGameResult: React.Dispatch<React.SetStateAction<EndGameResult | null>>
  setGameRecords: React.Dispatch<React.SetStateAction<GameRecord[]>>
  setSelectedAudioSrc: (src: string) => void
  setAudioPlaying: (v: boolean) => void
  nightBgmSrc: string
}

export function buildGameLifecycle(deps: LifecycleDeps) {
  const { days, currentDay, selectedDayIndex, timerDefaults, activeScriptSlug, activeScriptTitle, endGameResult, scriptOptions, onSelectScript, setDays, setDaysWithUndo, setSelectedDayId, setPickerMode, setIsTimerRunning, setSeatTagDrafts, setSkillOverlay, setNewGamePanel, setEndGameResult, setGameRecords, setAudioPlaying } = deps

  function goToNextDay() {
    if (selectedDayIndex < days.length - 1) { setSelectedDayId(days[selectedDayIndex + 1].id); setIsTimerRunning(false); return }
    const next = createDayState(days.length + 1, currentDay.seats, timerDefaults)
    setDaysWithUndo((cur) => [...cur, next])
    setSelectedDayId(next.id)
    setPickerMode('none')
    setIsTimerRunning(false)
  }

  function goToPreviousDay() {
    if (selectedDayIndex === 0) return
    setSelectedDayId(days[selectedDayIndex - 1].id)
    setPickerMode('none')
    setIsTimerRunning(false)
  }

  function moveToNextSpeaker() {
    const cur = currentDay.currentSpeakerSeat
    const spoken = cur ? [...new Set([...currentDay.roundRobinSpokenSeats, cur])] : currentDay.roundRobinSpokenSeats
    const next = getNextRoundRobinSeat(currentDay.seats, cur, spoken)
    setDays((d) => d.map((day) => day.id === currentDay.id ? { ...day, roundRobinSpokenSeats: spoken, currentSpeakerSeat: next, publicRoundRobinSeconds: next ? timerDefaults.publicRoundRobinSeconds : 0 } : day))
    if (!next) setIsTimerRunning(false)
  }

  function setPhase(phase: Phase) {
    setDays((d) => d.map((day) => {
      if (day.id !== currentDay.id) return day
      let next = { ...day, phase }
      if (phase === 'nomination') next = { ...next, nominationStep: 'waitingForNomination' as NominationStep, nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: { actor: null, target: null, voters: [], noVoters: [], note: '', manualPassed: null, nominationResult: 'succeed' as const, isExile: false, voteCountOverride: null }, votingState: null }
      return next
    }))
    setPickerMode('none')
    setIsTimerRunning(false)
    setAudioPlaying(false)
  }

  function startNight() { setAudioPlaying(true) }

  function addPlayerSeat() {
    setDays((d) => d.map((day) => {
      if (day.id !== currentDay.id) return day
      const regular = day.seats.filter((s) => !s.isTraveler)
      const travelers = day.seats.filter((s) => s.isTraveler)
      const nextNum = regular.length + 1
      const newSeat: StorytellerSeat = { seat: nextNum, name: `Player ${nextNum}`, alive: true, isTraveler: false, isExecuted: false, hasNoVote: false, customTags: [], characterId: null, userCharacterId: null, teamTag: null, note: '' }
      const reSeated = [...regular, newSeat].map((s, i) => ({ ...s, seat: i + 1 }))
      return { ...day, seats: [...reSeated, ...travelers.map((s, i) => ({ ...s, seat: reSeated.length + i + 1 }))] }
    }))
  }

  function removeLastPlayerSeat() {
    setDays((d) => d.map((day) => {
      if (day.id !== currentDay.id) return day
      const regular = day.seats.filter((s) => !s.isTraveler)
      if (regular.length <= 5) return day
      const travelers = day.seats.filter((s) => s.isTraveler)
      const trimmed = regular.slice(0, regular.length - 1)
      return { ...day, seats: [...trimmed, ...travelers.map((s, i) => ({ ...s, seat: trimmed.length + i + 1 }))] }
    }))
  }

  function addTravelerSeat() {
    setDays((d) => d.map((day) => {
      if (day.id !== currentDay.id) return day
      const nextSeatNum = day.seats.length + 1
      const newSeat: StorytellerSeat = { seat: nextSeatNum, name: `Traveler ${nextSeatNum}`, alive: true, isTraveler: true, isExecuted: false, hasNoVote: false, customTags: [], characterId: null, userCharacterId: null, teamTag: null, note: '' }
      return { ...day, seats: [...day.seats, newSeat] }
    }))
  }

  function removeLastTraveler() {
    setDays((d) => d.map((day) => {
      if (day.id !== currentDay.id) return day
      const travelers = day.seats.filter((s) => s.isTraveler)
      if (travelers.length === 0) return day
      const regular = day.seats.filter((s) => !s.isTraveler)
      const trimmed = travelers.slice(0, travelers.length - 1)
      return { ...day, seats: [...regular, ...trimmed.map((s, i) => ({ ...s, seat: regular.length + i + 1 }))] }
    }))
  }

  function openNewGamePanel() {
    const slug = activeScriptSlug ?? scriptOptions[0]?.slug ?? ''
    const seatNames: Record<number, string> = {}
    for (let i = 1; i <= 9; i++) seatNames[i] = `Player ${i}`
    setNewGamePanel({ playerCount: 9, travelerCount: 0, scriptSlug: slug, allowDuplicateChars: false, allowEmptyChars: false, allowSameNames: false, seatNames, assignments: {}, userAssignments: {}, seatNotes: {}, specialNote: '', demonBluffs: [] })
  }

  function randomAssignCharacters(config: NewGameConfig): Record<number, string> {
    const dist = CHARACTER_DISTRIBUTION[config.playerCount]
    if (!dist) return {}
    const script = scriptOptions.find((s) => s.slug === config.scriptSlug)
    if (!script) return {}
    const byTeam: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] }
    for (const cid of script.characters) { const char = characterById[cid]; if (char && byTeam[char.team]) byTeam[char.team].push(cid) }
    const teamPool: Team[] = []
    for (const { team, count } of [{ team: 'townsfolk' as Team, count: dist.townsfolk }, { team: 'outsider' as Team, count: dist.outsider }, { team: 'minion' as Team, count: dist.minion }, { team: 'demon' as Team, count: dist.demon }]) { for (let i = 0; i < count; i++) teamPool.push(team) }
    const shuffledTeams = shuffleArray(teamPool)
    const usedChars = new Set<string>()
    const assignments: Record<number, string> = {}
    for (let i = 0; i < config.playerCount; i++) {
      const pool = byTeam[shuffledTeams[i]] || []
      const eligible = config.allowDuplicateChars ? pool : pool.filter((c) => !usedChars.has(c))
      const picked = (eligible.length > 0 ? eligible : pool)[Math.floor(Math.random() * (eligible.length > 0 ? eligible : pool).length)]
      if (picked) { assignments[i + 1] = picked; usedChars.add(picked) }
    }
    return assignments
  }

  function startNewGame(newGamePanel: NewGameConfig) {
    if (onSelectScript) onSelectScript(newGamePanel.scriptSlug)
    const totalCount = newGamePanel.playerCount + newGamePanel.travelerCount
    const seats = createSeats(totalCount)
    for (let i = newGamePanel.playerCount; i < totalCount; i++) seats[i].isTraveler = true
    for (const seat of seats) {
      const sNum = seat.seat
      seat.name = newGamePanel.seatNames[sNum] || (seat.isTraveler ? `Traveler ${sNum}` : `Player ${sNum}`)
      if (!seat.isTraveler) {
        const cid = newGamePanel.assignments[sNum]
        seat.characterId = cid || null
        seat.userCharacterId = newGamePanel.userAssignments[sNum] || null
        if (cid) { const char = characterById[cid]; if (char) seat.teamTag = (char.team === 'minion' || char.team === 'demon') ? 'evil' : 'good' }
      }
      seat.note = newGamePanel.seatNotes[sNum] || ''
    }
    const firstDay = createDayState(1, seats, timerDefaults)
    setDaysWithUndo([firstDay])
    setSelectedDayId(firstDay.id)
    setPickerMode('none')
    setIsTimerRunning(false)
    setSeatTagDrafts({})
    setSkillOverlay(null)
    setNewGamePanel(null)
  }

  function resetCurrentGame() {
    const firstDay = createDayState(1, createSeats(DEFAULT_PLAYER_COUNT), timerDefaults)
    setDaysWithUndo([firstDay])
    setSelectedDayId(firstDay.id)
    setPickerMode('none')
    setIsTimerRunning(false)
    setSeatTagDrafts({})
    setSkillOverlay(null)
  }

  function openEndGamePanel() {
    const teams: Record<number, 'evil' | 'good' | null> = {}
    for (const s of currentDay.seats) teams[s.seat] = 'good'
    setEndGameResult({ winner: null, playerTeams: teams, mvp: null, balanced: null, funEvil: null, funGood: null, replay: null, otherNote: '' })
  }

  function confirmEndGame() {
    if (!endGameResult) return
    const summaries = currentDay.seats.map((s) => ({ seat: s.seat, name: s.name, team: endGameResult.playerTeams[s.seat] ?? 'good' }))
    setGameRecords((cur) => [{ id: `${Date.now()}`, endedAt: Date.now(), scriptTitle: activeScriptTitle, scriptSlug: activeScriptSlug, winner: endGameResult.winner, playerSummaries: summaries, mvp: endGameResult.mvp, balanced: endGameResult.balanced, funEvil: endGameResult.funEvil, funGood: endGameResult.funGood, replay: endGameResult.replay, otherNote: endGameResult.otherNote, days: days.map((d) => ({ day: d.day, votes: d.voteHistory.length, skills: d.skillHistory.length })) }, ...cur])
    resetCurrentGame()
    setEndGameResult(null)
  }

  function downloadJson(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function exportGameJson(config?: ExportConfig) {
    const cfg: ExportConfig = config ?? { includeSeats: true, includeVotes: true, includeSkills: true, includeEvents: false, includeStNotes: false, dayFilter: 'all' }
    const filteredDays = cfg.dayFilter === 'all' ? days : days.filter((d) => (cfg.dayFilter as number[]).includes(d.day))
    const exportDays = filteredDays.map((d) => {
      const entry: Record<string, unknown> = { day: d.day }
      if (cfg.includeSeats) {
        entry.seats = cfg.includeStNotes
          ? d.seats
          : d.seats.map(({ note: _n, characterId: _c, userCharacterId: _u, teamTag: _t, ...pub }) => pub)
      }
      if (cfg.includeVotes) entry.voteHistory = d.voteHistory
      if (cfg.includeSkills) entry.skillHistory = d.skillHistory
      if (cfg.includeEvents) entry.eventLog = cfg.includeStNotes ? d.eventLog : d.eventLog.filter((e) => e.kind === 'stateChange' || e.kind === 'phaseTransition')
      return entry
    })
    downloadJson({ exportedAt: new Date().toISOString(), scriptTitle: activeScriptTitle, scriptSlug: activeScriptSlug, days: exportDays }, `botc-gamelog-${Date.now()}.json`)
  }

  function exportGameSetup() {
    const d = days[days.length - 1] ?? currentDay
    const setup = {
      exportedAt: new Date().toISOString(),
      scriptTitle: activeScriptTitle,
      scriptSlug: activeScriptSlug,
      seats: d.seats.map((s) => ({
        seat: s.seat,
        name: s.name,
        isTraveler: s.isTraveler,
        characterId: s.characterId,
        userCharacterId: s.userCharacterId,
        team: s.teamTag,
        note: s.note,
      })),
    }
    downloadJson(setup, `botc-setup-${Date.now()}.json`)
  }

  function exportEndGameResults(gameRecords: Array<Record<string, unknown>>) {
    downloadJson({ exportedAt: new Date().toISOString(), scriptTitle: activeScriptTitle, results: gameRecords }, `botc-results-${Date.now()}.json`)
  }

  return { goToNextDay, goToPreviousDay, moveToNextSpeaker, setPhase, startNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, resetCurrentGame, openEndGamePanel, confirmEndGame, exportGameJson, exportGameSetup, exportEndGameResults }
}
