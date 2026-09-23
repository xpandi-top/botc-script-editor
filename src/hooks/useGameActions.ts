import { catalogTeamOf } from '../utils/seatAlignment'
import { createDefaultSkillDraft, buildVotingOrder } from '../components/StorytellerSub/constants'
import type { DayState, EventLogEntry, PickerMode, SkillOverlayState, SkillRecord, StorytellerSeat, TimerDefaults } from '../components/StorytellerSub/types'
import type { Language } from '../types'
import { logDetail } from '../utils/logI18n'
import { eventFields, presentSeatEvent } from '../utils/eventText'
import { applySeatEdit, diffSeat } from '../core/engine/events'
import { applyVoteRecord, buildVoteRecord, canStartActorSpeech, canStartTargetSpeech, canStartVoting, castVote, openNominations, rejectNomination as rejectNominationState, startActorSpeech, startTargetSpeech, startVoting as startVotingState } from '../core/engine/nomination'
import { getDisplayName } from '../catalog'

interface ActionDeps {
  currentDay: DayState
  timerDefaults: TimerDefaults
  requiredVotes: number
  draftPassed: boolean
  isTimerRunning: boolean
  skillOverlay: SkillOverlayState | null
  seatTagDrafts: Record<number, string>
  updateCurrentDay: (u: (d: DayState) => DayState) => void
  updateCurrentDayWithUndo: (u: (d: DayState) => DayState) => void
  appendEvent: (d: DayState, kind: EventLogEntry['kind'], detail: string, visibility?: 'public' | 'st-only', structured?: Pick<EventLogEntry, 'code' | 'params'>) => DayState
  setPickerMode: (m: PickerMode) => void
  setIsTimerRunning: (v: boolean) => void
  setSkillOverlay: React.Dispatch<React.SetStateAction<SkillOverlayState | null>>
  setSkillPopoutSeat: (v: number | null) => void
  setTagPopoutSeat: (v: number | null) => void
  setSkillRoleDropdownOpen: (v: boolean) => void
  setShowNominationSheet: (v: boolean) => void
  setCustomTagPool: React.Dispatch<React.SetStateAction<string[]>>
  setSeatTagDrafts: React.Dispatch<React.SetStateAction<Record<number, string>>>
  text: { aliveTag: string; executedTag: string; traveler: string; noVoteTag: string }
  language: Language
}

export function buildGameActions(deps: ActionDeps) {
  const { currentDay, timerDefaults, requiredVotes, draftPassed, isTimerRunning, skillOverlay, seatTagDrafts, updateCurrentDay, updateCurrentDayWithUndo, appendEvent, setPickerMode, setIsTimerRunning, setSkillOverlay, setSkillPopoutSeat, setTagPopoutSeat, setSkillRoleDropdownOpen, setShowNominationSheet, setCustomTagPool, setSeatTagDrafts, text, language } = deps

  function updateSeat(seatNumber: number, updater: (s: StorytellerSeat) => StorytellerSeat) {
    updateCurrentDay((d) => ({ ...d, seats: d.seats.map((s) => (s.seat === seatNumber ? updater(s) : s)) }))
  }

  function updateSeatWithLog(seatNumber: number, updater: (s: StorytellerSeat) => StorytellerSeat) {
    updateCurrentDayWithUndo((d) => {
      const oldSeat = d.seats.find((s) => s.seat === seatNumber)
      // Keeps alignment across a role change and grants an Odyssey vote token on death.
      const newSeats = d.seats.map((s) => (s.seat === seatNumber ? applySeatEdit(catalogTeamOf, s, updater(s)) : s))
      const newSeat = newSeats.find((s) => s.seat === seatNumber)
      let updated = { ...d, seats: newSeats }
      if (oldSeat && newSeat) {
        for (const event of diffSeat(catalogTeamOf, oldSeat, newSeat)) {
          const shown = presentSeatEvent(event, language)
          if (shown) updated = appendEvent(updated, shown.kind, shown.detail, shown.visibility, eventFields(event))
        }
      }
      return updated
    })
  }

  function addCustomTag(seatNumber: number) {
    const draft = seatTagDrafts[seatNumber]?.trim()
    if (!draft) return
    setCustomTagPool((cur) => [...new Set([...cur, draft])])
    updateSeatWithLog(seatNumber, (s) => ({ ...s, customTags: [...new Set([...s.customTags, draft])] }))
    setSeatTagDrafts((cur) => ({ ...cur, [seatNumber]: '' }))
  }

  function removeSeatTag(seatNumber: number, tag: string) {
    updateSeatWithLog(seatNumber, (s) => {
      if (tag === text.aliveTag) return { ...s, alive: true }
      if (tag === text.executedTag) return { ...s, isExecuted: false }
      if (tag === text.traveler) return { ...s, isTraveler: false }
      if (tag === text.noVoteTag) return { ...s, hasNoVote: false }
      return { ...s, customTags: s.customTags.filter((v) => v !== tag) }
    })
  }

  function enterNomination() {
    updateCurrentDay((d) => openNominations(d, timerDefaults))
    setShowNominationSheet(true)
    setIsTimerRunning(true)
  }

  function confirmNomination() {
    if (!canStartActorSpeech(currentDay)) return
    updateCurrentDay((d) => startActorSpeech(d, timerDefaults))
    setIsTimerRunning(true)
  }

  function rejectNomination() {
    updateCurrentDay((d) => appendEvent(rejectNominationState(d, { requiredVotes, now: Date.now(), timers: timerDefaults }), 'stateChange', logDetail.nominationFailed(language, d.voteDraft.actor ?? '?', d.voteDraft.target ?? '?'), undefined, eventFields({ code: 'nomination.failed', params: { actor: d.voteDraft.actor, target: d.voteDraft.target } })))
    setIsTimerRunning(false)
  }

  function confirmTargetSpeech() {
    if (!canStartTargetSpeech(currentDay)) return
    updateCurrentDay((d) => startTargetSpeech(d, timerDefaults))
    setIsTimerRunning(true)
  }

  function startVoting() {
    if (!canStartVoting(currentDay)) return
    const order = buildVotingOrder(currentDay.seats, currentDay.voteDraft.target!)
    updateCurrentDay((d) => startVotingState(d, order, timerDefaults))
    setPickerMode('none')
    setIsTimerRunning(true)
  }

  function _advanceVote(seatNumber: number, voteValue: boolean) {
    updateCurrentDay((d) => {
      const { day, completed } = castVote(d, seatNumber, voteValue, timerDefaults)
      if (completed) window.setTimeout(() => setIsTimerRunning(false), 0)
      return day
    })
  }

  function handleVoteYes(seatNumber: number) { _advanceVote(seatNumber, true) }
  function handleVoteNo(seatNumber: number) { _advanceVote(seatNumber, false) }

  function recordVote() {
    const vd = currentDay.voteDraft
    const record = buildVoteRecord(vd, { requiredVotes, passed: draftPassed, now: Date.now() })
    if (!record) return
    const voteEvent = eventFields({ code: 'vote.recorded', params: { actor: record.actor, target: record.target, passed: record.passed, voteCount: record.voteCount, requiredVotes: record.requiredVotes } })
    updateCurrentDayWithUndo((d) => appendEvent(applyVoteRecord(d, record, vd, timerDefaults), 'vote', logDetail.voteResult(language, record.actor, record.target, record.passed, record.voteCount, record.requiredVotes), undefined, voteEvent))
    setIsTimerRunning(false)
    // Timer does NOT auto-start — ST manually restarts nomination wait if needed
  }

  function openSkillOverlay() {
    setSkillOverlay({ pausedPhase: currentDay.phase, wasTimerRunning: isTimerRunning, draft: createDefaultSkillDraft(), phaseContext: currentDay.phase, visibility: currentDay.phase === 'night' ? 'st-only' : 'public' })
    setIsTimerRunning(false)
    setPickerMode('skillActor')
  }

  function openSeatSkill(seatNumber: number) {
    setSkillOverlay({ pausedPhase: currentDay.phase, wasTimerRunning: isTimerRunning, draft: { ...createDefaultSkillDraft(), actor: seatNumber }, phaseContext: currentDay.phase, visibility: currentDay.phase === 'night' ? 'st-only' : 'public' })
    setIsTimerRunning(false)
    setPickerMode('none')
    setSkillPopoutSeat(seatNumber)
    setTagPopoutSeat(null)
  }

  function closeSkillOverlay(record: boolean) {
    if (record && skillOverlay?.draft.actor) {
      const vis = skillOverlay.phaseContext === 'night' ? 'st-only' : skillOverlay.visibility ?? 'public'
      const sr: SkillRecord = { id: `${Date.now()}`, ...skillOverlay.draft, activatedDuringPhase: skillOverlay.phaseContext, visibility: vis }
      const roleName = sr.roleId ? getDisplayName(sr.roleId, language) : '?'
      updateCurrentDay((d) => appendEvent({ ...d, skillHistory: [sr, ...d.skillHistory] }, 'skill', `#${sr.actor} ${roleName} — ${logDetail.phase(language, sr.activatedDuringPhase)}`, vis, eventFields({ code: 'skill.used', params: { actor: sr.actor, roleId: sr.roleId, phase: sr.activatedDuringPhase } })))
    }
    const wasRunning = skillOverlay?.wasTimerRunning ?? false
    setSkillOverlay(null)
    setPickerMode('none')
    setSkillPopoutSeat(null)
    setSkillRoleDropdownOpen(false)
    if (wasRunning) setIsTimerRunning(true)
  }

  function handleSeatClick(seatNumber: number, pickerMode: PickerMode, currentVoterSeat: number | null, doHandleVoteYes: (n: number) => void, setSelectedSeatNumber: (n: number) => void) {
    setSelectedSeatNumber(seatNumber)
    if (pickerMode === 'speaker') {
      updateCurrentDay((d) => ({ ...d, currentSpeakerSeat: seatNumber, roundRobinSpokenSeats: [], publicRoundRobinSeconds: timerDefaults.publicRoundRobinSeconds }))
      setPickerMode('none')
    } else if (pickerMode === 'skillActor') {
      setSkillOverlay((p) => (p ? { ...p, draft: { ...p.draft, actor: seatNumber } } : p))
    } else if (pickerMode === 'skillTarget') {
      setSkillOverlay((p) => {
        if (!p) return p
        const targets = p.draft.targets.includes(seatNumber) ? p.draft.targets.filter((s) => s !== seatNumber) : [...new Set([...p.draft.targets, seatNumber])]
        const targetNotes = { ...p.draft.targetNotes }
        for (const k of Object.keys(targetNotes)) { if (!targets.includes(Number(k))) delete targetNotes[Number(k)] }
        return { ...p, draft: { ...p.draft, targets, targetNotes } }
      })
    } else if (currentDay.nominationStep === 'voting' && currentVoterSeat === seatNumber) {
      doHandleVoteYes(seatNumber)
    }
  }

  return {
    updateSeat, updateSeatWithLog, addCustomTag, removeSeatTag,
    enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech,
    startVoting, handleVoteYes, handleVoteNo, recordVote,
    openSkillOverlay, openSeatSkill, closeSkillOverlay,
    handleSeatClick,
  }
}
