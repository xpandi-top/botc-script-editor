import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../hooks/useI18n'
import { useAudioState } from '../../hooks/useAudioState'
import { useUIState } from '../../hooks/useUIState'
import { useTimerEffect } from '../../hooks/useTimerEffect'
import { buildGameActions } from '../../hooks/useGameActions'
import { buildGameLifecycle } from '../../hooks/useGameLifecycle'
import { loadInitialState } from './storage'
import { makeEventId, STORAGE_KEY, INITIAL_AUDIO_TRACKS } from './constants'
import { livingNonTravelers, eligibleVoters } from '../../utils/seats'
import type { PickerMode, NewGameConfig, EndGameResult, LogFilterState, AggregatedLogEntry, DialogState, SkillOverlayState, StorytellerHelperProps, DayState, EventLogEntry, PersistedState } from './types'

export function useStoryteller(props: StorytellerHelperProps) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions } = props

  // ── Persisted state ──
  const initial = useMemo(() => loadInitialState(), [])
  const [days, setDays] = useState(initial.days)
  const [selectedDayId, setSelectedDayId] = useState(initial.selectedDayId)
  const [timerDefaults, setTimerDefaults] = useState(initial.timerDefaults)
  const [customTagPool, setCustomTagPool] = useState(initial.customTagPool)
  const [gameRecords, setGameRecords] = useState(initial.gameRecords)
  const [playerNamePool, setPlayerNamePool] = useState<string[]>(initial.playerNamePool)

  // ── Runtime state ──
  const [pickerMode, setPickerMode] = useState<PickerMode>('none')
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [dialogState, setDialogState] = useState<DialogState>(null)
  const [seatTagDrafts, setSeatTagDrafts] = useState<Record<number, string>>({})
  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number | null>(null)
  const [skillOverlay, setSkillOverlay] = useState<SkillOverlayState | null>(null)
  const [newGamePanel, setNewGamePanel] = useState<NewGameConfig | null>(null)
  const [endGameResult, setEndGameResult] = useState<EndGameResult | null>(null)
  const [logFilter, setLogFilter] = useState<LogFilterState>({ types: new Set(['vote', 'skill', 'event']), dayFilter: 'all', sortAsc: false })

  // ── Sub-hooks ──
  const text = useI18n(language)
  const audio = useAudioState()
  const ui = useUIState()

  // ── Derived ──
  const selectedDayIndex = Math.max(0, days.findIndex((d) => d.id === selectedDayId))
  const currentDay = days[selectedDayIndex] ?? days[0]

  function updateCurrentDay(updater: (day: DayState) => DayState) {
    setDays((cur) => cur.map((d) => (d.id === currentDay.id ? updater(d) : d)))
  }

  function appendEvent(d: DayState, kind: EventLogEntry['kind'], detail: string): DayState {
    return { ...d, eventLog: [...d.eventLog, { id: makeEventId(), timestamp: Date.now(), phase: d.phase, kind, detail }] }
  }

  function syncDayTimers(d: DayState) {
    return { ...d, privateSeconds: timerDefaults.privateSeconds, publicFreeSeconds: timerDefaults.publicFreeSeconds, publicRoundRobinSeconds: timerDefaults.publicRoundRobinSeconds, nominationWaitSeconds: timerDefaults.nominationWaitSeconds, nominationActorSeconds: timerDefaults.nominationActorSeconds, nominationTargetSeconds: timerDefaults.nominationTargetSeconds }
  }

  function setCurrentTimer(value: number) {
    const safe = Math.max(0, value)
    updateCurrentDay((d) => {
      if (d.phase === 'private') return { ...d, privateSeconds: safe }
      if (d.phase === 'public' && d.publicMode === 'free') return { ...d, publicFreeSeconds: safe }
      if (d.phase === 'public' && d.publicMode === 'roundRobin') return { ...d, publicRoundRobinSeconds: safe }
      if (d.nominationStep === 'waitingForNomination') return { ...d, nominationWaitSeconds: safe }
      if (d.nominationStep === 'actorSpeech') return { ...d, nominationActorSeconds: safe }
      if (d.nominationStep === 'targetSpeech') return { ...d, nominationTargetSeconds: safe }
      if (d.nominationStep === 'voting' && d.votingState) return { ...d, votingState: { ...d.votingState, perPlayerSeconds: safe } }
      return d
    })
  }

  const currentTimerSeconds = useMemo(() => {
    const d = currentDay
    if (d.phase === 'private') return d.privateSeconds
    if (d.phase === 'public') return d.publicMode === 'free' ? d.publicFreeSeconds : d.publicRoundRobinSeconds
    switch (d.nominationStep) {
      case 'waitingForNomination': return d.nominationWaitSeconds
      case 'actorSpeech': return d.nominationActorSeconds
      case 'targetSpeech': return d.nominationTargetSeconds
      case 'voting': return d.votingState?.perPlayerSeconds ?? 0
      default: return 0
    }
  }, [currentDay])

  const currentScriptCharacters = useMemo(() => scriptOptions.find((s) => s.slug === activeScriptSlug)?.characters ?? scriptOptions[0]?.characters ?? [], [activeScriptSlug, scriptOptions])
  const livingNonTravelerSeats = useMemo(() => livingNonTravelers(currentDay.seats), [currentDay.seats])
  const requiredVotes = Math.max(1, Math.ceil(livingNonTravelerSeats.length / 2))
  const eligibleVoterSeats = useMemo(() => eligibleVoters(currentDay.seats), [currentDay.seats])
  const nonVoters = useMemo(() => eligibleVoterSeats.filter((s) => !currentDay.voteDraft.voters.includes(s)), [currentDay.voteDraft.voters, eligibleVoterSeats])
  void nonVoters
  const draftPassedBySystem = currentDay.voteDraft.voters.length >= requiredVotes
  const draftPassed = currentDay.voteDraft.manualPassed ?? draftPassedBySystem
  const isVotingComplete = currentDay.nominationStep === 'votingDone' || (currentDay.nominationStep === 'voting' && currentDay.votingState && currentDay.votingState.votingIndex >= currentDay.votingState.votingOrder.length)
  const currentVoterSeat = currentDay.votingState && currentDay.nominationStep === 'voting' && !isVotingComplete ? currentDay.votingState.votingOrder[currentDay.votingState.votingIndex] ?? null : null
  const pointerSeat = useMemo(() => {
    if (currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin') return currentDay.currentSpeakerSeat
    if (currentDay.phase === 'nomination') { if (currentVoterSeat) return currentVoterSeat; return currentDay.voteDraft.target ?? currentDay.voteDraft.actor ?? null }
    return null
  }, [currentDay.phase, currentDay.publicMode, currentDay.currentSpeakerSeat, currentDay.voteDraft, currentVoterSeat])
  const selectedSeat = currentDay.seats.find((s) => s.seat === selectedSeatNumber) ?? null
  const selectedSeatTags = selectedSeat ? [!selectedSeat.alive ? text.aliveTag : '', selectedSeat.isExecuted ? text.executedTag : '', selectedSeat.isTraveler ? text.traveler : '', selectedSeat.hasNoVote ? text.noVoteTag : '', ...selectedSeat.customTags].filter(Boolean) : []
  const dialogTitle = dialogState?.kind === 'restartGame' ? text.restartTitle : dialogState?.kind === 'endGame' ? text.endGameTitle : text.voteTitle
  const aliveCount = currentDay.seats.filter((s) => s.alive && !s.isTraveler).length
  const totalCount = currentDay.seats.filter((s) => !s.isTraveler).length
  const highestVoteThisDay = currentDay.voteHistory.length > 0 ? Math.max(...currentDay.voteHistory.map((v) => v.voteCount)) : 0
  const nominatorsThisDay = currentDay.voteHistory.map((v) => v.actor)
  const nomineesThisDay = currentDay.voteHistory.map((v) => v.target)
  const leadingCandidates = highestVoteThisDay > 0 ? currentDay.voteHistory.filter((v) => v.voteCount === highestVoteThisDay).map((v) => ({ seat: v.target, votes: v.voteCount, name: currentDay.seats.find((s) => s.seat === v.target)?.name ?? `#${v.target}` })) : []
  const nominationDelaySeconds = timerDefaults.nominationDelayMinutes * 60
  const secondsUntilNomination = Math.max(0, nominationDelaySeconds - currentDay.publicElapsedSeconds)
  const canNominate = currentDay.phase === 'public' && currentDay.publicMode === 'free' && currentDay.publicElapsedSeconds >= nominationDelaySeconds
  const hasTimer = currentDay.phase !== 'night' && currentDay.nominationStep !== 'nominationDecision' && currentDay.nominationStep !== 'readyForTargetSpeech' && currentDay.nominationStep !== 'readyToVote' && currentDay.nominationStep !== 'votingDone'
  const votingYesCount = currentDay.votingState ? Object.values(currentDay.votingState.votes).filter(Boolean).length : currentDay.voteDraft.voters.length
  const NIGHT_BGM_SRC = INITIAL_AUDIO_TRACKS.find((t) => t.name === 'Measured Pulse of the Tower')?.src ?? INITIAL_AUDIO_TRACKS[0].src

  // ── Aggregated log ──
  const aggregatedLog = useMemo((): AggregatedLogEntry[] => {
    const entries: AggregatedLogEntry[] = []
    for (const day of days) {
      for (const v of day.voteHistory) entries.push({ id: `v-${day.day}-${v.id}`, day: day.day, timestamp: Number(v.id), type: 'vote', detail: `#${v.actor} -> #${v.target}: ${v.passed ? 'PASS' : 'FAIL'} (${v.voteCount}/${v.requiredVotes})${v.note ? ` - ${v.note}` : ''}` })
      for (const s of day.skillHistory) entries.push({ id: `s-${day.day}-${s.id}`, day: day.day, timestamp: Number(s.id), type: 'skill', detail: `#${s.actor} ${s.roleId || '?'} (${s.activatedDuringPhase})${s.statement ? ` "${s.statement}"` : ''}${s.result ? ` [${s.result}]` : ''}` })
      for (const e of day.eventLog) { if (e.kind === 'vote' || e.kind === 'skill') continue; entries.push({ id: `e-${day.day}-${e.id}`, day: day.day, timestamp: e.timestamp, type: 'event', detail: `[${e.kind}] ${e.detail}` }) }
    }
    let filtered = entries.filter((e) => logFilter.types.has(e.type))
    if (logFilter.dayFilter !== 'all') filtered = filtered.filter((e) => e.day === logFilter.dayFilter)
    filtered.sort((a, b) => logFilter.sortAsc ? a.timestamp - b.timestamp : b.timestamp - a.timestamp)
    return filtered
  }, [days, logFilter])

  function getPhaseContext(): string {
    const d = currentDay
    if (d.phase === 'private') return d.privateSeconds === timerDefaults.privateSeconds && !isTimerRunning ? text.phaseBeforePrivate : text.phaseDuringPrivate
    if (d.phase === 'public') return d.publicElapsedSeconds === 0 && !isTimerRunning ? text.phaseBeforePublic : text.phaseDuringPublic
    return text.phaseDuringNomination
  }

  // ── Effects ──
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedDayId, timerDefaults, days, customTagPool, gameRecords, playerNamePool } satisfies PersistedState))
  }, [customTagPool, days, gameRecords, playerNamePool, selectedDayId, timerDefaults])

  useEffect(() => {
    if (currentDay.phase === 'nomination' && currentDay.nominationStep === 'waitingForNomination' && !currentDay.voteDraft.actor) setPickerMode('nominator')
  }, [currentDay.phase, currentDay.nominationStep, currentDay.voteDraft.actor])

  const { lastCountdownRef } = useTimerEffect({ currentDay, currentTimerSeconds, isTimerRunning, skillOverlay, timerDefaults, updateCurrentDay, setIsTimerRunning })

  // ── Domain actions ──
  const gameActions = buildGameActions({ currentDay, timerDefaults, requiredVotes, draftPassed, isTimerRunning, skillOverlay, seatTagDrafts, updateCurrentDay, appendEvent, setPickerMode, setIsTimerRunning, setSkillOverlay, setSkillPopoutSeat: ui.setSkillPopoutSeat, setTagPopoutSeat: ui.setTagPopoutSeat, setSkillRoleDropdownOpen: ui.setSkillRoleDropdownOpen, setShowNominationSheet: ui.setShowNominationSheet, setCustomTagPool, setSeatTagDrafts, text, getPhaseContext })

  const lifecycle = buildGameLifecycle({ days, currentDay, selectedDayIndex, timerDefaults, activeScriptSlug, activeScriptTitle, endGameResult, scriptOptions, onSelectScript, setDays, setSelectedDayId, setPickerMode, setIsTimerRunning, setSeatTagDrafts, setSkillOverlay: (v) => setSkillOverlay(v), setNewGamePanel, setEndGameResult, setGameRecords, setSelectedAudioSrc: audio.setSelectedAudioSrc, setAudioPlaying: audio.setAudioPlaying, nightBgmSrc: NIGHT_BGM_SRC })

  function clearUnusedCustomTags() {
    const usedTags = new Set(days.flatMap((d) => d.seats.flatMap((s) => s.customTags)))
    setCustomTagPool((cur) => cur.filter((t) => usedTags.has(t)))
  }

  function toggleLogFilterType(type: string) {
    setLogFilter((prev) => { const next = new Set(prev.types); if (next.has(type)) next.delete(type); else next.add(type); return { ...prev, types: next } })
  }

  function confirmDialog() {
    if (!dialogState) return
    if (dialogState.kind === 'voteResult') { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, manualPassed: dialogState.nextValue } })); setDialogState(null); return }
    if (dialogState.kind === 'endGame') { lifecycle.openEndGamePanel(); setDialogState(null); return }
    lifecycle.resetCurrentGame()
    setDialogState(null)
  }

  function handleSeatClick(seatNumber: number) {
    gameActions.handleSeatClick(seatNumber, pickerMode, currentVoterSeat, gameActions.handleVoteYes, setSelectedSeatNumber)
  }

  function stopNight() {
    audio.setAudioPlaying(false)
    const el = audio.audioRef.current
    if (el) { el.pause(); el.currentTime = 0 }
  }

  // ── Return (identical shape as before) ──
  return {
    activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions,
    days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults,
    customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool,
    pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning,
    dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts,
    selectedSeatNumber, setSelectedSeatNumber,
    ...ui,
    skillOverlay, setSkillOverlay,
    ...audio,
    newGamePanel, setNewGamePanel, endGameResult, setEndGameResult,
    logFilter, setLogFilter,
    lastCountdownRef, text,
    selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds,
    currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters,
    draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat,
    selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount,
    highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates,
    nominationDelaySeconds, secondsUntilNomination, canNominate,
    aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent,
    ...gameActions,
    handleSeatClick,
    clearUnusedCustomTags, toggleLogFilterType, confirmDialog,
    ...lifecycle,
    stopNight,
    votingYesCount, NIGHT_BGM_SRC, hasTimer,
  }
}
