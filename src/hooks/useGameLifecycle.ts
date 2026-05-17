import { getCharacterById, getDisplayName } from '../catalog'
import type { Language } from '../types'
import { createDayState, createSeats, shuffleArray, CHARACTER_DISTRIBUTION, DEFAULT_PLAYER_COUNT, getNextRoundRobinSeat } from '../components/StorytellerSub/constants'
import type { DayState, EndGameResult, GameRecord, NewGameConfig, Phase, NominationStep, PickerMode, StorytellerSeat, TimerDefaults } from '../components/StorytellerSub/types'
import type { Team } from '../types'
import { buildGameExport } from './useGameExport'

interface LifecycleDeps {
  days: DayState[]
  currentDay: DayState
  selectedDayIndex: number
  timerDefaults: TimerDefaults
  activeScriptSlug?: string
  activeScriptTitle?: string
  activeScriptVersion?: string
  endGameResult: EndGameResult | null
  scriptOptions: Array<{ slug: string; characters: string[] }>
  onSelectScript?: (slug: string) => void
  setDays: React.Dispatch<React.SetStateAction<DayState[]>>
  setDaysWithUndo: React.Dispatch<React.SetStateAction<DayState[]>>
  setSelectedDayId: (id: string) => void
  setPickerMode: (m: PickerMode) => void
  setIsTimerRunning: (v: boolean) => void
  setSeatTagDrafts: React.Dispatch<React.SetStateAction<Record<number, string>>>
  setSkillOverlay: (v: null) => void
  setNewGamePanel: React.Dispatch<React.SetStateAction<NewGameConfig | null>>
  setShowNewGamePanel?: (v: boolean) => void
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
  setNightShowCharacter?: (v: boolean) => void
  setNightShowWakeOrder?: (v: boolean) => void
  stFabledIds?: string[]
  stCustomRules?: string
  setStFabledIds?: (v: string[]) => void
  setStCustomRules?: (v: string) => void
  stName?: string
  setStName?: (v: string) => void
  gameStartedAt?: number
  setGameStartedAt?: (v: number | undefined) => void
  setShowSaveBeforeNewGame?: (v: boolean) => void
  setPendingNewGameAfterSave?: (v: boolean) => void
}

export function buildGameLifecycle(deps: LifecycleDeps) {
  const { days, currentDay, selectedDayIndex, timerDefaults, activeScriptSlug, activeScriptTitle, activeScriptVersion, endGameResult, scriptOptions, onSelectScript, setDays, setDaysWithUndo, setSelectedDayId, setPickerMode, setIsTimerRunning, setSeatTagDrafts, setSkillOverlay, setNewGamePanel, setShowNewGamePanel, setEndGameResult, setGameRecords, setAudioPlaying, language, appendEvent, customTagPool = [], playerNamePool = [], setCurrentRecordName, setTimerDefaults, setCustomTagPool, setPlayerNamePool, setShowEndGameModal, setNightShowCharacter, setNightShowWakeOrder, stFabledIds = [], stCustomRules = '', setStFabledIds, setStCustomRules, stName, setStName, gameStartedAt, setGameStartedAt, setShowSaveBeforeNewGame, setPendingNewGameAfterSave } = deps

  const exportActions = buildGameExport({ days, currentDay, activeScriptSlug, activeScriptTitle, activeScriptVersion, endGameResult, timerDefaults, customTagPool, playerNamePool, stFabledIds, stCustomRules, setGameRecords, setCurrentRecordName, gameStartedAt, stName })

  function goToNextDay() {
    setNightShowCharacter?.(false)
    setNightShowWakeOrder?.(false)
    if (selectedDayIndex < days.length - 1) { setSelectedDayId(days[selectedDayIndex + 1].id); setIsTimerRunning(false); return }
    if (currentDay.gameEnded) return
    const next = createDayState(days.length + 1, currentDay.seats, timerDefaults)
    // Carry demon bluffs forward — they're set once during setup and remain
    // valid for the entire game, not just day 1.
    next.demonBluffs = currentDay.demonBluffs ?? []
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

  function deleteDay(dayId: string) {
    if (days.length <= 1) return // never delete last day
    const idx = days.findIndex((d) => d.id === dayId)
    if (idx === -1) return
    const remaining = days.filter((d) => d.id !== dayId)
    // Re-number days sequentially after deletion
    const renumbered = remaining.map((d, i) => ({ ...d, day: i + 1 }))
    setDaysWithUndo(() => renumbered)
    // If deleting current day, move to adjacent day
    if (days[idx].id === currentDay.id) {
      const newIdx = Math.max(0, idx - 1)
      setSelectedDayId(renumbered[newIdx].id)
    }
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
    if (phase !== 'night') {
      setNightShowCharacter?.(false)
      setNightShowWakeOrder?.(false)
    }
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

  function _doOpenNewGamePanel() {
    const slug = activeScriptSlug ?? scriptOptions[0]?.slug ?? ''
    // Pre-fill seat names from current game so recurring groups don't
    // have to re-enter names every session. Only non-default names carry over.
    const inheritedNames: Record<number, string> = {}
    if (currentDay?.seats) {
      for (const s of currentDay.seats) {
        if (s.name && !/^Player \d+$/.test(s.name) && !/^Traveler \d+$/.test(s.name)) {
          inheritedNames[s.seat] = s.name
        }
      }
    }
    const currentPlayerCount = currentDay?.seats ? currentDay.seats.filter((s) => !s.isTraveler).length : 9
    const currentTravelerCount = currentDay?.seats ? currentDay.seats.filter((s) => s.isTraveler).length : 0
    const freshConfig: NewGameConfig = { playerCount: currentPlayerCount || 9, travelerCount: currentTravelerCount, scriptSlug: slug, allowDuplicateChars: false, allowEmptyChars: false, allowSameNames: false, seatNames: inheritedNames, assignments: {}, userAssignments: {}, travelerAssignments: {}, seatNotes: {}, specialNote: '', demonBluffs: [], charPool: [] }
    // Preserve existing draft so close → reopen restores in-progress config
    setNewGamePanel((prev) => prev ?? freshConfig)
    setShowNewGamePanel?.(true)
  }

  function openCharacterEditor() {
    const seats = currentDay?.seats ?? []
    const regular = seats.filter((s) => !s.isTraveler)
    const travelers = seats.filter((s) => s.isTraveler)
    setNewGamePanel({
      playerCount: regular.length,
      travelerCount: travelers.length,
      scriptSlug: activeScriptSlug ?? scriptOptions[0]?.slug ?? '',
      allowDuplicateChars: false, allowEmptyChars: false, allowSameNames: false,
      assignments: Object.fromEntries(seats.map((s) => [s.seat, s.characterId ?? ''])),
      userAssignments: Object.fromEntries(seats.map((s) => [s.seat, s.userCharacterId ?? ''])),
      travelerAssignments: Object.fromEntries(travelers.map((s) => [s.seat, s.characterId ?? ''])),
      seatNames: Object.fromEntries(seats.map((s) => [s.seat, s.name])),
      seatNotes: Object.fromEntries(seats.map((s) => [s.seat, s.note ?? ''])),
      specialNote: '',
      demonBluffs: currentDay?.demonBluffs ?? [],
      charPool: [],
      editMode: true,
    })
    setShowNewGamePanel?.(true)
  }

  function hasActiveGame(): boolean {
    return gameStartedAt !== undefined && currentDay.seats.length > 0
  }

  function openNewGamePanel() {
    if (hasActiveGame() && setShowSaveBeforeNewGame) {
      setShowSaveBeforeNewGame(true)
    } else {
      _doOpenNewGamePanel()
    }
  }

  function confirmNewGameAfterSave() {
    // Mark pending so EndGame modal's save action triggers new game panel
    setPendingNewGameAfterSave?.(true)
    openEndGamePanel()
  }

  function confirmNewGameDiscard() {
    _doOpenNewGamePanel()
  }

  function randomAssignCharacters(config: NewGameConfig): Record<number, string> {
    const dist = CHARACTER_DISTRIBUTION[config.playerCount]
    if (!dist) return {}
    const script = scriptOptions.find((s) => s.slug === config.scriptSlug)
    if (!script) return {}
    const byTeam: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] }
    const pool: string[] = (config as any).charPool ?? []
    for (const cid of script.characters) { const char = getCharacterById(cid); if (char && byTeam[char.team]) { if (pool.length === 0 || pool.includes(cid)) byTeam[char.team].push(cid) } }
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
        if (cid) { const char = getCharacterById(cid); if (char) seat.teamTag = (char.team === 'minion' || char.team === 'demon') ? 'evil' : 'good' }
      } else {
        const tcid = (newGamePanel as any).travelerAssignments?.[sNum]
        if (tcid) seat.characterId = tcid
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
    setShowNewGamePanel?.(false)
    if (setCurrentRecordName) setCurrentRecordName(null)
    setEndGameResult(null)
    setStFabledIds?.([])
    setStCustomRules?.('')
    setGameStartedAt?.(Date.now())
  }

  function applyGameChanges(newGamePanel: NewGameConfig) {
    if (!newGamePanel) return
    if (onSelectScript && newGamePanel.scriptSlug) onSelectScript(newGamePanel.scriptSlug)
    const totalCount = newGamePanel.playerCount + newGamePanel.travelerCount
    let updatedDay = currentDay
    // Update existing seats (only those within the new count)
    const updatedExisting = currentDay.seats
      .filter((seat) => seat.seat <= totalCount)
      .map((seat) => {
        const sNum = seat.seat
        const newSeat = { ...seat }
        const oldCharId = seat.characterId
        newSeat.name = newGamePanel.seatNames[sNum] || seat.name
        if (!seat.isTraveler) {
          const cid = newGamePanel.assignments[sNum]
          newSeat.characterId = cid || null
          newSeat.userCharacterId = newGamePanel.userAssignments[sNum] || null
          if (cid) { const char = getCharacterById(cid); if (char) newSeat.teamTag = (char.team === 'minion' || char.team === 'demon') ? 'evil' : 'good' }
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
    // Add new seats if count increased
    const newSeats: StorytellerSeat[] = []
    for (let sNum = currentDay.seats.length + 1; sNum <= totalCount; sNum++) {
      const isTraveler = sNum > newGamePanel.playerCount
      const defaultName = newGamePanel.seatNames[sNum] || (isTraveler ? `Traveler ${sNum}` : `Player ${sNum}`)
      const cid = isTraveler ? null : (newGamePanel.assignments[sNum] || null)
      let teamTag: 'evil' | 'good' | null = null
      if (cid) { const char = getCharacterById(cid); if (char) teamTag = (char.team === 'minion' || char.team === 'demon') ? 'evil' : 'good' }
      newSeats.push({ seat: sNum, name: defaultName, alive: true, isTraveler, isExecuted: false, hasNoVote: false, customTags: [], stTags: [], characterId: cid, userCharacterId: newGamePanel.userAssignments[sNum] || null, teamTag, note: newGamePanel.seatNotes[sNum] || '' })
    }
    const updatedSeats = [...updatedExisting, ...newSeats]
    if (newGamePanel.applyNamesToAllDays) {
      // Propagate seat name changes to every day, char/note changes only to current day
      setDays((d) => d.map((day) => {
        if (day.id === currentDay.id) return { ...updatedDay, seats: updatedSeats, demonBluffs: newGamePanel.demonBluffs || [] }
        // Other days: only update names for matching seats
        const renamedSeats = day.seats.map((s) => {
          const newName = newGamePanel.seatNames[s.seat]
          return newName ? { ...s, name: newName } : s
        })
        return { ...day, seats: renamedSeats }
      }))
    } else {
      setDays((d) => d.map((day) => day.id === currentDay.id ? { ...updatedDay, seats: updatedSeats, demonBluffs: newGamePanel.demonBluffs || [] } : day))
    }
    setNewGamePanel(null)
    setShowNewGamePanel?.(false)
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
      for (const s of currentDay.seats) teams[s.seat] = s.teamTag ?? 'good'
      setEndGameResult({ winner: null, playerTeams: teams, mvp: null, balanced: null, funEvil: null, funGood: null, replay: null, otherNote: '' })
    } else {
      // Merge in any seats whose teamTag changed since the panel was last opened
      setEndGameResult((c) => {
        if (!c) return c
        const updated = { ...c.playerTeams }
        for (const s of currentDay.seats) {
          if (updated[s.seat] === undefined || updated[s.seat] === null) {
            updated[s.seat] = s.teamTag ?? 'good'
          }
        }
        return { ...c, playerTeams: updated }
      })
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
    if (setShowEndGameModal) setShowEndGameModal(false)

    let restoredDays: DayState[]

    if (record.savedDays && record.savedDays.length > 0) {
      // ── Full restore ──────────────────────────────────────────
      restoredDays = record.savedDays
    } else {
      // ── Partial restore from setup / playerSummaries ──────────
      // Build seats: prefer setup.seatNames+assignments, fall back to playerSummaries
      const setup = record.setup
      const summaries = record.playerSummaries ?? []
      const playerCount = setup?.playerCount ?? (summaries.filter((p) => p.team !== null).length || summaries.length || 5)
      const travelerCount = setup?.travelerCount ?? 0
      const totalSeats = playerCount + travelerCount

      const baseSeats: StorytellerSeat[] = createSeats(totalSeats).map((s) => {
        const seatNum = s.seat
        const summary = summaries.find((p) => p.seat === seatNum)
        const isTravel = travelerCount > 0 && seatNum > playerCount
        return {
          ...s,
          name: setup?.seatNames?.[seatNum] ?? summary?.name ?? s.name,
          characterId: setup?.assignments?.[seatNum] || null,
          userCharacterId: setup?.userAssignments?.[seatNum] ?? null,
          teamTag: summary?.team ?? null,
          note: setup?.seatNotes?.[seatNum] ?? '',
          isTraveler: isTravel,
        }
      })

      // Create one day per entry in record.days (or 1 if none)
      const dayCount = record.days?.length || 1
      restoredDays = Array.from({ length: dayCount }, (_, i) =>
        createDayState(i + 1, baseSeats, timerDefaults)
      )
      // Mark last day ended if game has a winner
      if (record.winner) {
        restoredDays[restoredDays.length - 1] = {
          ...restoredDays[restoredDays.length - 1],
          gameEnded: true,
        }
      }
      // Apply demonBluffs if present
      if (setup?.demonBluffs?.length) {
        restoredDays[0] = { ...restoredDays[0], demonBluffs: setup.demonBluffs }
      }
    }

    setDaysWithUndo(restoredDays)
    setSelectedDayId(restoredDays[0].id)
    if (record.scriptSlug && record.scriptSlug !== activeScriptSlug && onSelectScript) onSelectScript(record.scriptSlug)
    if (setCurrentRecordName) setCurrentRecordName(record.recordName || null)
    if (record.timerDefaults && setTimerDefaults) setTimerDefaults(record.timerDefaults)
    if (record.customTagPool && setCustomTagPool) setCustomTagPool(record.customTagPool)
    if (record.playerNamePool && setPlayerNamePool) setPlayerNamePool(record.playerNamePool)
    if (setStFabledIds) setStFabledIds(record.stFabledIds ?? [])
    if (setStCustomRules) setStCustomRules(record.stCustomRules ?? '')
    if (setStName) setStName(record.stName ?? '')
    setGameStartedAt?.(record.startedAt)

    // Restore endGameResult from survey data
    const firstDay = restoredDays[0]
    const teams: Record<number, 'evil' | 'good' | null> = {}
    for (const s of firstDay.seats) {
      const team = record.playerSummaries?.find((p) => p.seat === s.seat)?.team
      // For partial restore, teamTag is already on the seat; use it as fallback
      teams[s.seat] = team ?? (s.teamTag as 'evil' | 'good' | null) ?? null
    }
    setEndGameResult({ winner: record.winner ?? null, playerTeams: teams, mvp: record.mvp ?? null, balanced: record.balanced ?? null, funEvil: record.funEvil ?? null, funGood: record.funGood ?? null, replay: record.replay ?? null, otherNote: record.otherNote ?? '' })
  }

  return { goToNextDay, goToPreviousDay, deleteDay, moveToNextSpeaker, setPhase, startNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, openCharacterEditor, doOpenNewGamePanel: _doOpenNewGamePanel, confirmNewGameAfterSave, confirmNewGameDiscard, hasActiveGame, randomAssignCharacters, startNewGame, applyGameChanges, resetCurrentGame, openEndGamePanel, markGameEnded, unmarkGameEnded, loadGameRecord, ...exportActions }
}
