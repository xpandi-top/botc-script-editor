import { catalogTeamOf } from '../utils/seatAlignment'
import { getDisplayName } from '../catalog'
import type { Language } from '../types'
import { createDayState, createSeats, DEFAULT_PLAYER_COUNT } from '../components/StorytellerSub/constants'
import type { DayState, EndGameResult, EventLogEntry, GameRecord, NewGameConfig, Phase, PickerMode, TimerDefaults } from '../components/StorytellerSub/types'
import { eventFields } from '../utils/eventText'
import { buildGameExport } from './useGameExport'
import {
  addPlayerSeat as addPlayerSeatToDay,
  addTravelerSeat as addTravelerSeatToDay,
  applyPhase,
  createNextDay,
  endGameResultFromRecord,
  endGameResultWithTeams,
  endGameTeams,
  nextPhase,
  nextSpeakerPatch,
  previousPhase,
  removeDay,
  removeLastPlayerSeat as removeLastPlayerSeatFromDay,
  removeLastTraveler as removeLastTravelerFromDay,
  restoreDaysFromRecord,
} from '../core/engine/lifecycle'
import { applySetupToSeats, buildSeatsFromConfig, drawRandomAssignments, newGameConfigFromDay } from '../core/engine/setup'

// Phase order lives in src/core/engine/lifecycle.ts; re-exported for existing imports.
export { PHASE_ORDER } from '../core/engine/lifecycle'

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
  setShowAssignmentCenter?: (v: boolean) => void
  setEndGameResult: React.Dispatch<React.SetStateAction<EndGameResult | null>>
  setGameRecords: React.Dispatch<React.SetStateAction<GameRecord[]>>
  setSelectedAudioSrc: (src: string) => void
  setAudioPlaying: (v: boolean) => void
  nightBgmSrc: string
  language: Language
  appendEvent: (d: DayState, kind: 'stateChange' | 'phaseTransition' | 'tagChange' | 'skill' | 'vote', detail: string, visibility?: 'public' | 'st-only', structured?: Pick<EventLogEntry, 'code' | 'params'>) => DayState
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
  gameId?: string  // always defined at runtime; optional for test stubs
  setGameId?: (v: string) => void
  setShowSaveBeforeNewGame?: (v: boolean) => void
  setPendingNewGameAfterSave?: (v: boolean) => void
}

const _CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
function _genGameId(): string {
  return Array.from({ length: 16 }, () => _CHARS[Math.floor(Math.random() * _CHARS.length)]).join('')
}

export function buildGameLifecycle(deps: LifecycleDeps) {
  const { days, currentDay, selectedDayIndex, timerDefaults, activeScriptSlug, activeScriptTitle, activeScriptVersion, endGameResult, scriptOptions, onSelectScript, setDays, setDaysWithUndo, setSelectedDayId, setPickerMode, setIsTimerRunning, setSeatTagDrafts, setSkillOverlay, setNewGamePanel, setShowNewGamePanel, setShowAssignmentCenter, setEndGameResult, setGameRecords, setAudioPlaying, language, appendEvent, customTagPool = [], playerNamePool = [], setCurrentRecordName, setTimerDefaults, setCustomTagPool, setPlayerNamePool, setShowEndGameModal, setNightShowCharacter, setNightShowWakeOrder, stFabledIds = [], stCustomRules = '', setStFabledIds, setStCustomRules, stName, setStName, gameStartedAt, setGameStartedAt, gameId, setGameId, setShowSaveBeforeNewGame, setPendingNewGameAfterSave } = deps

  const exportActions = buildGameExport({ days, currentDay, activeScriptSlug, activeScriptTitle, activeScriptVersion, endGameResult, timerDefaults, customTagPool, playerNamePool, stFabledIds, stCustomRules, setGameRecords, setCurrentRecordName, gameStartedAt, gameId, stName })

  function goToNextDay() {
    setNightShowCharacter?.(false)
    setNightShowWakeOrder?.(false)
    if (selectedDayIndex < days.length - 1) { setSelectedDayId(days[selectedDayIndex + 1].id); setIsTimerRunning(false); return }
    if (currentDay.gameEnded) return
    const next = createNextDay(days.length, currentDay, timerDefaults, undefined, catalogTeamOf)
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

  /** Step to the next phase within the day; from the last phase (nomination), advance to the next day. */
  function goToNextPhase() {
    const phase = nextPhase(currentDay.phase)
    if (phase) { setPhase(phase); return }
    goToNextDay()
  }

  /** Step to the previous phase within the day; from the first phase (night), go back to the previous day. */
  function goToPreviousPhase() {
    const phase = previousPhase(currentDay.phase)
    if (phase) { setPhase(phase); return }
    goToPreviousDay()
  }

  function deleteDay(dayId: string) {
    // Never deletes the last day; remaining days are renumbered from 1.
    const renumbered = removeDay(days, dayId)
    if (!renumbered) return
    const idx = days.findIndex((d) => d.id === dayId)
    setDaysWithUndo(() => renumbered)
    // If deleting current day, move to adjacent day
    if (days[idx].id === currentDay.id) {
      const newIdx = Math.max(0, idx - 1)
      setSelectedDayId(renumbered[newIdx].id)
    }
    setIsTimerRunning(false)
  }

  function moveToNextSpeaker() {
    const patch = nextSpeakerPatch(currentDay, timerDefaults)
    setDays((d) => d.map((day) => day.id === currentDay.id ? { ...day, ...patch } : day))
    if (!patch.currentSpeakerSeat) setIsTimerRunning(false)
  }

  function setPhase(phase: Phase) {
    setDays((d) => d.map((day) => (day.id === currentDay.id ? applyPhase(day, phase, timerDefaults) : day)))
    if (phase !== 'night') {
      setNightShowCharacter?.(false)
      setNightShowWakeOrder?.(false)
    }
    setPickerMode('none')
    setIsTimerRunning(false)
    setAudioPlaying(false)
  }

  function startNight() { setAudioPlaying(true) }

  function updateCurrentDay(update: (day: DayState) => DayState) {
    setDays((d) => d.map((day) => (day.id === currentDay.id ? update(day) : day)))
  }

  function addPlayerSeat() { updateCurrentDay(addPlayerSeatToDay) }
  function removeLastPlayerSeat() { updateCurrentDay((day) => removeLastPlayerSeatFromDay(day)) }
  function addTravelerSeat() { updateCurrentDay(addTravelerSeatToDay) }
  function removeLastTraveler() { updateCurrentDay(removeLastTravelerFromDay) }

  function _doOpenNewGamePanel() {
    const slug = activeScriptSlug ?? scriptOptions[0]?.slug ?? ''
    // Pre-fill seat names from current game so recurring groups don't
    // have to re-enter names every session. Only non-default names carry over.
    const freshConfig = newGameConfigFromDay({ currentDay, scriptSlug: slug, fabledIds: stFabledIds ?? [], gameId: _genGameId() })
    // Preserve existing draft so close → reopen restores in-progress config
    setNewGamePanel((prev) => prev ?? freshConfig)
    setShowNewGamePanel?.(true)
  }

  // Opens Assignment Center directly against the live game — no draft needed,
  // since its live-game path already edits currentDay.seats in place (with
  // undo/log via updateSeatWithLog), the same as every other live edit here.
  function openCharacterEditor() {
    setShowAssignmentCenter?.(true)
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
    const script = scriptOptions.find((s) => s.slug === config.scriptSlug)
    if (!script) return {}
    return drawRandomAssignments({ playerCount: config.playerCount, scriptCharacters: script.characters, charPool: config.charPool, getTeam: catalogTeamOf })
  }

  function startNewGame(newGamePanel: NewGameConfig) {
    if (onSelectScript) onSelectScript(newGamePanel.scriptSlug)
    const seats = buildSeatsFromConfig(newGamePanel, catalogTeamOf)
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
    setStFabledIds?.(newGamePanel.fabledIds ?? [])
    setStCustomRules?.('')
    setGameStartedAt?.(Date.now())
    if (newGamePanel.gameId) setGameId?.(newGamePanel.gameId)
  }

  function applyGameChanges(newGamePanel: NewGameConfig) {
    if (!newGamePanel) return
    if (onSelectScript && newGamePanel.scriptSlug) onSelectScript(newGamePanel.scriptSlug)
    // Kept seats get the new setup; new seats are appended; character swaps are logged in seat order.
    const { seats: updatedSeats, characterChanges } = applySetupToSeats(currentDay.seats, newGamePanel, catalogTeamOf)
    let updatedDay = currentDay
    const getCharName = (id: string | null) => id ? getDisplayName(id, language) : '—'
    for (const { seat: sNum, from, to } of characterChanges) {
      const structured = eventFields({ code: 'setup.character', params: { seat: sNum, from, to } })
      if (from && to) updatedDay = appendEvent(updatedDay, 'tagChange', `#${sNum}: ${getCharName(from)} → ${getCharName(to)}`, undefined, structured)
      else if (to) updatedDay = appendEvent(updatedDay, 'tagChange', `#${sNum}: ${getCharName(to)}`, undefined, structured)
      else if (from) updatedDay = appendEvent(updatedDay, 'tagChange', `#${sNum}: ${getCharName(from)} ×`, undefined, structured)
    }
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
    if (newGamePanel.fabledIds !== undefined) setStFabledIds?.(newGamePanel.fabledIds)
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
    // Teams come from the latest day's alignments and are refreshed on every open.
    const teams = endGameTeams(days, currentDay, catalogTeamOf)
    setEndGameResult((c) => endGameResultWithTeams(c, teams))
    if (setShowEndGameModal) setShowEndGameModal(true)
  }

  function markGameEnded() {
    setDays((d) => d.map((day) => day.id === currentDay.id ? { ...day, gameEnded: true } : day))
  }

  function unmarkGameEnded() {
    setDays((d) => d.map((day) => day.id === currentDay.id ? { ...day, gameEnded: false } : day))
  }

  function loadGameRecord(record: GameRecord) {
    if (setShowEndGameModal) setShowEndGameModal(false)

    const restoredDays = restoreDaysFromRecord(record, timerDefaults)

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
    setEndGameResult(endGameResultFromRecord(record, restoredDays[0]))
  }

  return { goToNextDay, goToPreviousDay, goToNextPhase, goToPreviousPhase, deleteDay, moveToNextSpeaker, setPhase, startNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, openCharacterEditor, doOpenNewGamePanel: _doOpenNewGamePanel, confirmNewGameAfterSave, confirmNewGameDiscard, hasActiveGame, randomAssignCharacters, startNewGame, applyGameChanges, resetCurrentGame, openEndGamePanel, markGameEnded, unmarkGameEnded, loadGameRecord, ...exportActions }
}
