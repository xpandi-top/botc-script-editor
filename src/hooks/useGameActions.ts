import { createDefaultVoteDraft, createDefaultSkillDraft, buildVotingOrder } from '../components/StorytellerSub/constants'
import type { DayState, EventLogEntry, PickerMode, SkillOverlayState, SkillRecord, StorytellerSeat, TimerDefaults, VoteRecord } from '../components/StorytellerSub/types'

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
  appendEvent: (d: DayState, kind: EventLogEntry['kind'], detail: string) => DayState
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
}

export function buildGameActions(deps: ActionDeps) {
  const { currentDay, timerDefaults, requiredVotes, draftPassed, isTimerRunning, skillOverlay, seatTagDrafts, updateCurrentDay, updateCurrentDayWithUndo, appendEvent, setPickerMode, setIsTimerRunning, setSkillOverlay, setSkillPopoutSeat, setTagPopoutSeat, setSkillRoleDropdownOpen, setShowNominationSheet, setCustomTagPool, setSeatTagDrafts, text } = deps

  function updateSeat(seatNumber: number, updater: (s: StorytellerSeat) => StorytellerSeat) {
    updateCurrentDay((d) => ({ ...d, seats: d.seats.map((s) => (s.seat === seatNumber ? updater(s) : s)) }))
  }

  function updateSeatWithLog(seatNumber: number, updater: (s: StorytellerSeat) => StorytellerSeat) {
    updateCurrentDayWithUndo((d) => {
      const oldSeat = d.seats.find((s) => s.seat === seatNumber)
      const newSeats = d.seats.map((s) => (s.seat === seatNumber ? updater(s) : s))
      const newSeat = newSeats.find((s) => s.seat === seatNumber)
      let updated = { ...d, seats: newSeats }
      if (oldSeat && newSeat) {
        if (oldSeat.alive !== newSeat.alive) updated = appendEvent(updated, 'stateChange', `#${seatNumber} ${newSeat.alive ? '复活' : '死亡'}`)
        if (oldSeat.isExecuted !== newSeat.isExecuted) updated = appendEvent(updated, 'stateChange', `#${seatNumber} ${newSeat.isExecuted ? '+处决' : '-处决'}`)
        if (oldSeat.isTraveler !== newSeat.isTraveler) updated = appendEvent(updated, 'stateChange', `#${seatNumber} ${newSeat.isTraveler ? '+旅人' : '-旅人'}`)
        if (oldSeat.hasNoVote !== newSeat.hasNoVote) updated = appendEvent(updated, 'stateChange', `#${seatNumber} ${newSeat.hasNoVote ? '+无投票权' : '-无投票权'}`)
        if (oldSeat.characterId !== newSeat.characterId) {
          const charName = (id: string | null) => id || '—'
          if (oldSeat.characterId && newSeat.characterId) {
            updated = appendEvent(updated, 'tagChange', `#${seatNumber}: ${charName(oldSeat.characterId)} → ${charName(newSeat.characterId)}`)
          } else if (newSeat.characterId) {
            updated = appendEvent(updated, 'tagChange', `#${seatNumber}: ${charName(newSeat.characterId)}`)
          } else if (oldSeat.characterId) {
            updated = appendEvent(updated, 'tagChange', `#${seatNumber}: ${charName(oldSeat.characterId)} ×`)
          }
        }
        const added = newSeat.customTags.filter((t) => !oldSeat.customTags.includes(t))
        const removed = oldSeat.customTags.filter((t) => !newSeat.customTags.includes(t))
        for (const t of added) updated = appendEvent(updated, 'tagChange', `#${seatNumber} +${t}`)
        for (const t of removed) updated = appendEvent(updated, 'tagChange', `#${seatNumber} -${t}`)
        const oldStTags = oldSeat.stTags || []
        const newStTags = newSeat.stTags || []
        const addedStTags = newStTags.filter((t) => !oldStTags.includes(t))
        const removedStTags = oldStTags.filter((t) => !newStTags.includes(t))
        for (const t of addedStTags) updated = appendEvent(updated, 'tagChange', `#${seatNumber} 📝${t}`)
        for (const t of removedStTags) updated = appendEvent(updated, 'tagChange', `#${seatNumber} 📝- ${t}`)
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
    updateCurrentDay((d) => ({ ...d, phase: 'nomination', nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null }))
    setShowNominationSheet(true)
    setPickerMode('nominator')
    setIsTimerRunning(true)
  }

  function confirmNomination() {
    updateCurrentDay((d) => ({ ...d, nominationStep: 'actorSpeech', nominationActorSeconds: timerDefaults.nominationActorSeconds }))
    setIsTimerRunning(true)
  }

  function rejectNomination() {
    updateCurrentDay((d) => {
      const failRecord: VoteRecord | null = (d.voteDraft.actor && d.voteDraft.target) ? { id: `${Date.now()}`, actor: d.voteDraft.actor, target: d.voteDraft.target, voters: [], voteCount: 0, requiredVotes, passed: false, note: d.voteDraft.note.trim(), overridden: false, failed: true } : null
      return appendEvent({ ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteHistory: failRecord ? [failRecord, ...d.voteHistory] : d.voteHistory, voteDraft: createDefaultVoteDraft(), votingState: null }, 'stateChange', `提名失败: #${d.voteDraft.actor ?? '?'} → #${d.voteDraft.target ?? '?'}`)
    })
    setPickerMode('nominator')
    // Timer does NOT auto-start — ST decides when to begin nomination wait countdown
  }

  function confirmTargetSpeech() {
    updateCurrentDay((d) => ({ ...d, nominationStep: 'targetSpeech', nominationTargetSeconds: timerDefaults.nominationTargetSeconds }))
    setIsTimerRunning(true)
  }

  function startVoting() {
    if (!currentDay.voteDraft.target) return
    const order = buildVotingOrder(currentDay.seats, currentDay.voteDraft.target)
    updateCurrentDay((d) => ({ ...d, nominationStep: 'voting', votingState: { votingOrder: order, votingIndex: 0, perPlayerSeconds: timerDefaults.nominationVoteSeconds, votes: {} } }))
    setPickerMode('none')
    setIsTimerRunning(true)
  }

  function _advanceVote(seatNumber: number, voteValue: boolean) {
    updateCurrentDay((d) => {
      if (!d.votingState || d.nominationStep !== 'voting') return d
      const vs = d.votingState
      if (seatNumber !== vs.votingOrder[vs.votingIndex]) return d
      const newVotes = { ...vs.votes, [seatNumber]: voteValue }
      const nextIdx = vs.votingIndex + 1
      if (nextIdx >= vs.votingOrder.length) {
        window.setTimeout(() => setIsTimerRunning(false), 0)
        const yesVoters = Object.entries(newVotes).filter(([, v]) => v).map(([k]) => Number(k))
        return { ...d, nominationStep: 'votingDone', voteDraft: { ...d.voteDraft, voters: yesVoters }, votingState: { ...vs, votes: newVotes, votingIndex: nextIdx, perPlayerSeconds: 0 } }
      }
      return { ...d, votingState: { ...vs, votes: newVotes, votingIndex: nextIdx, perPlayerSeconds: timerDefaults.nominationVoteSeconds } }
    })
  }

  function handleVoteYes(seatNumber: number) { _advanceVote(seatNumber, true) }
  function handleVoteNo(seatNumber: number) { _advanceVote(seatNumber, false) }

  function recordVote() {
    if (!currentDay.voteDraft.actor || !currentDay.voteDraft.target) return
    const vd = currentDay.voteDraft
    const finalCount = vd.voteCountOverride !== null ? vd.voteCountOverride : vd.voters.length
    const record: VoteRecord = { id: `${Date.now()}`, actor: vd.actor!, target: vd.target!, voters: [...new Set(vd.voters)], voteCount: finalCount, requiredVotes, passed: draftPassed, note: vd.note.trim(), overridden: vd.manualPassed !== null || vd.voteCountOverride !== null }
    updateCurrentDayWithUndo((d) => appendEvent({ ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteHistory: [record, ...d.voteHistory], voteDraft: createDefaultVoteDraft(), votingState: null }, 'vote', `#${record.actor} → #${record.target}: ${record.passed ? 'PASS' : 'FAIL'} (${record.voteCount}/${record.requiredVotes})`))
    setPickerMode('nominator')
    setIsTimerRunning(false)
    // Timer does NOT auto-start — ST manually restarts nomination wait if needed
  }

  function openSkillOverlay() {
    setSkillOverlay({ pausedPhase: currentDay.phase, wasTimerRunning: isTimerRunning, draft: createDefaultSkillDraft(), phaseContext: currentDay.phase })
    setIsTimerRunning(false)
    setPickerMode('skillActor')
  }

  function openSeatSkill(seatNumber: number) {
    setSkillOverlay({ pausedPhase: currentDay.phase, wasTimerRunning: isTimerRunning, draft: { ...createDefaultSkillDraft(), actor: seatNumber }, phaseContext: currentDay.phase })
    setIsTimerRunning(false)
    setPickerMode('none')
    setSkillPopoutSeat(seatNumber)
    setTagPopoutSeat(null)
  }

  function closeSkillOverlay(record: boolean) {
    if (record && skillOverlay?.draft.actor) {
      const sr: SkillRecord = { id: `${Date.now()}`, ...skillOverlay.draft, activatedDuringPhase: skillOverlay.phaseContext }
      updateCurrentDay((d) => appendEvent({ ...d, skillHistory: [sr, ...d.skillHistory] }, 'skill', `#${sr.actor} ${sr.roleId || '?'} (${sr.activatedDuringPhase})`))
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
    } else if (pickerMode === 'nominator') {
      updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: seatNumber } }))
      setPickerMode('nominee')
      setIsTimerRunning(false)
    } else if (pickerMode === 'nominee') {
      updateCurrentDay((d) => ({ ...d, nominationStep: 'nominationDecision', voteDraft: { ...d.voteDraft, target: seatNumber, voters: [] } }))
      setPickerMode('none')
      setIsTimerRunning(false)
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
