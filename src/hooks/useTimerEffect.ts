import { useEffect, useRef } from 'react'
import { createDefaultVoteDraft, getNextRoundRobinSeat } from '../components/StorytellerSub/constants'
import type { DayState, SkillOverlayState, TimerDefaults } from '../components/StorytellerSub/types'

interface TimerEffectDeps {
  currentDay: DayState
  currentTimerSeconds: number
  isTimerRunning: boolean
  skillOverlay: SkillOverlayState | null
  timerDefaults: TimerDefaults
  updateCurrentDay: (updater: (d: DayState) => DayState) => void
  setIsTimerRunning: (v: boolean) => void
}

export function useTimerEffect(deps: TimerEffectDeps) {
  const { currentDay, currentTimerSeconds, isTimerRunning, skillOverlay, timerDefaults, updateCurrentDay, setIsTimerRunning } = deps
  const lastCountdownRef = useRef<number | null>(null)

  // Timer tick
  useEffect(() => {
    if (!isTimerRunning || skillOverlay) return
    const timer = window.setInterval(() => {
      updateCurrentDay((d) => {
        if (d.phase === 'private') {
          if (d.privateSeconds <= 1) return { ...d, privateSeconds: 0, phase: 'public', publicMode: 'free' }
          return { ...d, privateSeconds: d.privateSeconds - 1 }
        }
        if (d.phase === 'public' && d.publicMode === 'free') {
          const nextElapsed = d.publicElapsedSeconds + 1
          if (d.publicFreeSeconds <= 1) {
            return { ...d, publicFreeSeconds: 0, publicElapsedSeconds: nextElapsed, phase: 'nomination', nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null }
          }
          return { ...d, publicFreeSeconds: d.publicFreeSeconds - 1, publicElapsedSeconds: nextElapsed }
        }
        if (d.phase === 'public' && d.publicMode === 'roundRobin') {
          if (d.publicRoundRobinSeconds <= 1) {
            const spoken = d.currentSpeakerSeat ? [...new Set([...d.roundRobinSpokenSeats, d.currentSpeakerSeat])] : d.roundRobinSpokenSeats
            const next = getNextRoundRobinSeat(d.seats, d.currentSpeakerSeat, spoken)
            if (!next) return { ...d, roundRobinSpokenSeats: spoken, publicRoundRobinSeconds: 0, publicMode: 'free' }
            return { ...d, roundRobinSpokenSeats: spoken, currentSpeakerSeat: next, publicRoundRobinSeconds: timerDefaults.publicRoundRobinSeconds }
          }
          return { ...d, publicRoundRobinSeconds: d.publicRoundRobinSeconds - 1 }
        }
        if (d.phase === 'nomination' && d.nominationStep === 'waitingForNomination') {
          if (d.nominationWaitSeconds <= 1) { window.setTimeout(() => setIsTimerRunning(false), 0); return { ...d, nominationWaitSeconds: 0 } }
          return { ...d, nominationWaitSeconds: d.nominationWaitSeconds - 1 }
        }
        if (d.phase === 'nomination' && d.nominationStep === 'actorSpeech') {
          if (d.nominationActorSeconds <= 1) { window.setTimeout(() => setIsTimerRunning(false), 0); return { ...d, nominationActorSeconds: 0, nominationStep: 'readyForTargetSpeech' } }
          return { ...d, nominationActorSeconds: d.nominationActorSeconds - 1 }
        }
        if (d.phase === 'nomination' && d.nominationStep === 'targetSpeech') {
          if (d.nominationTargetSeconds <= 1) { window.setTimeout(() => setIsTimerRunning(false), 0); return { ...d, nominationTargetSeconds: 0, nominationStep: 'readyToVote' } }
          return { ...d, nominationTargetSeconds: d.nominationTargetSeconds - 1 }
        }
        if (d.phase === 'nomination' && d.nominationStep === 'voting' && d.votingState) {
          const vs = d.votingState
          if (vs.perPlayerSeconds <= 1) {
            const voter = vs.votingOrder[vs.votingIndex]
            const newVotes = { ...vs.votes, [voter]: vs.votes[voter] ?? false }
            const nextIdx = vs.votingIndex + 1
            if (nextIdx >= vs.votingOrder.length) {
              window.setTimeout(() => setIsTimerRunning(false), 0)
              const yesVoters = Object.entries(newVotes).filter(([, v]) => v).map(([k]) => Number(k))
              return { ...d, nominationStep: 'votingDone', voteDraft: { ...d.voteDraft, voters: yesVoters }, votingState: { ...vs, votes: newVotes, votingIndex: nextIdx, perPlayerSeconds: 0 } }
            }
            return { ...d, votingState: { ...vs, votingIndex: nextIdx, perPlayerSeconds: timerDefaults.nominationVoteSeconds, votes: newVotes } }
          }
          return { ...d, votingState: { ...vs, perPlayerSeconds: vs.perPlayerSeconds - 1 } }
        }
        return d
      })
    }, 1000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDay.id, isTimerRunning, skillOverlay, timerDefaults])

  // Countdown speech
  useEffect(() => {
    const isRoundRobin = currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin'
    const isVoting = currentDay.phase === 'nomination' && currentDay.nominationStep === 'voting'
    const threshold = isRoundRobin || isVoting ? 3 : currentTimerSeconds <= 10 ? currentTimerSeconds : 10
    const noTimer = currentDay.nominationStep === 'readyToVote' || currentDay.nominationStep === 'votingDone'
    if (!isTimerRunning || currentTimerSeconds <= 0 || noTimer) { lastCountdownRef.current = null; return }
    if (currentTimerSeconds <= threshold && currentTimerSeconds !== lastCountdownRef.current) {
      lastCountdownRef.current = currentTimerSeconds
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(String(currentTimerSeconds)))
      }
    }
  }, [currentDay.phase, currentDay.publicMode, currentDay.nominationStep, currentTimerSeconds, isTimerRunning])

  return { lastCountdownRef }
}
