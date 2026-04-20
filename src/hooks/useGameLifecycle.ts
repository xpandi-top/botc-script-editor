import { characterById, getDisplayName } from '../catalog'
import type { Language } from '../types'
import { createDayState, createSeats, shuffleArray, CHARACTER_DISTRIBUTION, DEFAULT_PLAYER_COUNT, getNextRoundRobinSeat } from '../components/StorytellerSub/constants'
import type { DayState, EndGameResult, GameRecord, NewGameConfig, Phase, NominationStep, StorytellerSeat, TimerDefaults } from '../components/StorytellerSub/types'
import type { Team } from '../types'
import { buildGameExport } from './useGameExport'

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
  language: Language
  appendEvent: (d: DayState, kind: 'stateChange' | 'phaseTransition' | 'tagChange' | 'skill' | 'vote', detail: string) => DayState
  customTagPool?: string[]
  playerNamePool?: string[]
  setCurrentRecordName?: (name: string | null) => void
  setTimerDefaults?: (t: TimerDefaults) => void
  setCustomTagPool?: (c: string[]) => void
  setPlayerNamePool?: (p: string[]) => void
  setShowEndGameModal?: (v: boolean) => void
}

export function buildGameLifecycle(deps: LifecycleDeps) {
  const { days, currentDay, selectedDayIndex, timerDefaults, activeScriptSlug, activeScriptTitle, endGameResult, scriptOptions, onSelectScript, setDays, setDaysWithUndo, setSelectedDayId, setPickerMode, setIsTimerRunning, setSeatTagDrafts, setSkillOverlay, setNewGamePanel, setEndGameResult, setGameRecords, setAudioPlaying, language, appendEvent, customTagPool = [], playerNamePool = [], setCurrentRecordName, setTimerDefaults, setCustomTagPool, setPlayerNamePool, setShowEndGameModal } = deps

  const exportActions = buildGameExport({ days, currentDay, activeScriptSlug, activeScriptTitle, endGameResult, timerDefaults, customTagPool, playerNamePool, setGameRecords, setCurrentRecordName })

  function goToNextDay() {
    if (selectedDayIndex < days.length - 1) { setSelectedDayId(days[selectedDayIndex + 1].id); setIsTimerRunning(false); return }
    if (currentDay.gameEnded) return
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
      if (phase === 'night') next = { ...next, nightVisitedSeats: [] }
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
      const newSeat: StorytellerSeat = { seat: nextNum, name: `Player ${nextNum}`, alive: true, isTraveler: false, isExecuted: false, hasNoVote: false, customTags: [], stTags: [], characterId: null, userCharacterId: null, teamTag: null, note: '' }
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
      const newSeat: StorytellerSeat = { seat: nextSeatNum, name: `Traveler ${nextSeatNum}`, alive: true, isTraveler: true, isExecuted: false, hasNoVote: false, customTags: [], stTags: [], characterId: null, userCharacterId: null, teamTag: null, note: '' }
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
    firstDay.demonBluffs = newGamePanel.demonBluffs || []
    setDaysWithUndo([firstDay])
    setSelectedDayId(firstDay.id)
    setPickerMode('none')
    setIsTimerRunning(false)
    setSeatTagDrafts({})
    setSkillOverlay(null)
    setNewGamePanel(null)
    if (setCurrentRecordName) setCurrentRecordName(null)
  }

  function applyGameChanges(newGamePanel: NewGameConfig) {
    if (!newGamePanel) return
    const totalCount = newGamePanel.playerCount + newGamePanel.travelerCount
    let updatedDay = currentDay
    const updatedSeats = currentDay.seats.map((seat) => {
      const sNum = seat.seat
      if (sNum > totalCount) return seat
      const newSeat = { ...seat }
      const oldCharId = seat.characterId
      newSeat.name = newGamePanel.seatNames[sNum] || seat.name
      if (!seat.isTraveler) {
        const cid = newGamePanel.assignments[sNum]
        newSeat.characterId = cid || null
        newSeat.userCharacterId = newGamePanel.userAssignments[sNum] || null
        if (cid) { const char = characterById[cid]; if (char) newSeat.teamTag = (char.team === 'minion' || char.team === 'demon') ? 'evil' : 'good' }
        else newSeat.teamTag = null
        if (cid !== oldCharId) {
          const getCharName = (id: string | null) => id ? getDisplayName(id, language) : '—'
          if (oldCharId && cid) updatedDay = appendEvent(updatedDay, 'tagChange', `#${sNum}: ${getCharName(oldCharId)} → ${getCharName(cid)}`)
          else if (cid) updatedDay = appendEvent(updatedDay, 'tagChange', `#${sNum}: ${getCharName(cid)}`)
          else if (oldCharId) updatedDay = appendEvent(updatedDay, 'tagChange', `#${sNum}: ${getCharName(oldCharId)} ×`)
        }
      }
      newSeat.note = newGamePanel.seatNotes[sNum] || ''
      return newSeat
    })
    setDays((d) => d.map((day) => day.id === currentDay.id ? { ...updatedDay, seats: updatedSeats, demonBluffs: newGamePanel.demonBluffs || [] } : day))
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
    if (setCurrentRecordName) setCurrentRecordName(null)
  }

  function openEndGamePanel() {
    if (!endGameResult) {
      const teams: Record<number, 'evil' | 'good' | null> = {}
      for (const s of currentDay.seats) teams[s.seat] = 'good'
      setEndGameResult({ winner: null, playerTeams: teams, mvp: null, balanced: null, funEvil: null, funGood: null, replay: null, otherNote: '' })
    }
    if (setShowEndGameModal) setShowEndGameModal(true)
    setEndGameResult((c) => c ? { ...c } : c)
  }

  function markGameEnded() {
    setDays((d) => d.map((day) => day.id === currentDay.id ? { ...day, gameEnded: true } : day))
  }

  function unmarkGameEnded() {
    setDays((d) => d.map((day) => day.id === currentDay.id ? { ...day, gameEnded: false } : day))
  }

  function loadGameRecord(record: GameRecord) {
    if (!record.savedDays || record.savedDays.length === 0) return
    setDaysWithUndo(record.savedDays)
    setSelectedDayId(record.savedDays[0].id)
    if (record.scriptSlug && record.scriptSlug !== activeScriptSlug && onSelectScript) onSelectScript(record.scriptSlug)
    if (setCurrentRecordName) setCurrentRecordName(record.recordName || null)
    if (record.timerDefaults && setTimerDefaults) setTimerDefaults(record.timerDefaults)
    if (record.customTagPool && setCustomTagPool) setCustomTagPool(record.customTagPool)
    if (record.playerNamePool && setPlayerNamePool) setPlayerNamePool(record.playerNamePool)
    if (record.setup) {
      setNewGamePanel({ playerCount: record.setup.playerCount, travelerCount: record.setup.travelerCount, scriptSlug: record.scriptSlug || '', allowDuplicateChars: false, allowEmptyChars: false, allowSameNames: false, seatNames: record.setup.seatNames || {}, assignments: record.setup.assignments || {}, userAssignments: record.setup.userAssignments || {}, seatNotes: record.setup.seatNotes || {}, specialNote: record.setup.specialNote || '', demonBluffs: record.setup.demonBluffs ?? [], editMode: true })
    }
    const teams: Record<number, 'evil' | 'good' | null> = {}
    for (const s of record.savedDays[0].seats) {
      const team = record.playerSummaries?.find((p) => p.seat === s.seat)?.team
      teams[s.seat] = team ?? 'good'
    }
    setEndGameResult({ winner: record.winner ?? null, playerTeams: teams, mvp: record.mvp ?? null, balanced: record.balanced ?? null, funEvil: record.funEvil ?? null, funGood: record.funGood ?? null, replay: record.replay ?? null, otherNote: record.otherNote ?? '' })
  }

  return { goToNextDay, goToPreviousDay, moveToNextSpeaker, setPhase, startNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, applyGameChanges, resetCurrentGame, openEndGamePanel, markGameEnded, unmarkGameEnded, loadGameRecord, ...exportActions }
}
