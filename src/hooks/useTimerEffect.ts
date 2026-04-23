import { useEffect, useRef } from 'react'
import { getNextRoundRobinSeat } from '../components/StorytellerSub/constants'
import type { DayState, SkillOverlayState, TimerDefaults } from '../components/StorytellerSub/types'

interface TimerEffectDeps {
  currentDay: DayState
  currentTimerSeconds: number
  isTimerRunning: boolean
  skillOverlay: SkillOverlayState | null
  timerDefaults: TimerDefaults
  updateCurrentDay: (updater: (d: DayState) => DayState) => void
  setIsTimerRunning: (v: boolean) => void
  setAlarmActive: (v: boolean) => void
  alarmActive: boolean
}

// ── Web Audio helpers ──────────────────────────────────────────────────────

function playTone(freq: number, duration: number, gain = 0.35) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.connect(g); g.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
    setTimeout(() => ctx.close(), (duration + 0.1) * 1000)
  } catch (_) { /* AudioContext not available */ }
}

/** Short ascending chime — phase start signal */
function playChime() {
  playTone(523, 0.12, 0.22)
  setTimeout(() => playTone(659, 0.12, 0.22), 130)
  setTimeout(() => playTone(784, 0.24, 0.28), 260)
}

/** Alarm pulse — one "bip-bip" */
function playAlarmPulse() {
  playTone(880, 0.15, 0.4)
  setTimeout(() => playTone(660, 0.15, 0.3), 200)
}

let currentAlarmAudio: HTMLAudioElement | null = null
let alarmSrc: string | null = null

function playCustomAlarm(src: string) {
  if (currentAlarmAudio && alarmSrc === src && !currentAlarmAudio.paused) {
    return
  }
  if (currentAlarmAudio) {
    currentAlarmAudio.pause()
    currentAlarmAudio = null
  }
  alarmSrc = src
  try {
    const audio = new Audio(src)
    currentAlarmAudio = audio
    audio.loop = true
    audio.play().catch(() => {})
  } catch (_) { /* fallback to tone */ }
}

function stopCustomAlarm() {
  if (currentAlarmAudio) {
    currentAlarmAudio.pause()
    currentAlarmAudio.loop = false
    currentAlarmAudio.currentTime = 0
    currentAlarmAudio = null
    alarmSrc = null
  }
}

export function useTimerEffect(deps: TimerEffectDeps) {
  const { currentDay, currentTimerSeconds, isTimerRunning, skillOverlay, timerDefaults, updateCurrentDay, setIsTimerRunning, setAlarmActive, alarmActive } = deps
  const lastCountdownRef = useRef<number | null>(null)
  const prevPhaseRef = useRef<string>('')
  const alarmIntervalRef = useRef<number | null>(null)
  const soundEnabledRef = useRef(timerDefaults.phaseSwitchSoundEnabled !== false)
  soundEnabledRef.current = timerDefaults.phaseSwitchSoundEnabled !== false

  // ── Persistent alarm interval ──────────────────────────────────────────
  useEffect(() => {
    if (alarmActive) {
      if (timerDefaults.alarmSound) {
        playCustomAlarm(timerDefaults.alarmSound)
      } else {
        playAlarmPulse()
        alarmIntervalRef.current = window.setInterval(playAlarmPulse, 1400)
      }
    } else {
      if (alarmIntervalRef.current) { window.clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null }
      stopCustomAlarm()
    }
    return () => { if (alarmIntervalRef.current) { window.clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null } }
  }, [alarmActive, timerDefaults.alarmSound])

  // ── Timer tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTimerRunning || skillOverlay) return
    const timer = window.setInterval(() => {
      updateCurrentDay((d) => {
        if (d.phase === 'private') {
          if (d.privateSeconds <= 1) {
            // Alarm only — user manually transitions to next phase
            window.setTimeout(() => { setIsTimerRunning(false); setAlarmActive(true) }, 0)
            return { ...d, privateSeconds: 0 }
          }
          return { ...d, privateSeconds: d.privateSeconds - 1 }
        }
        if (d.phase === 'public' && d.publicMode === 'free') {
          const nextElapsed = d.publicElapsedSeconds + 1
          if (d.publicFreeSeconds <= 1) {
            // Alarm only — user manually transitions to nomination
            window.setTimeout(() => { setIsTimerRunning(false); setAlarmActive(true) }, 0)
            return { ...d, publicFreeSeconds: 0, publicElapsedSeconds: nextElapsed }
          }
          return { ...d, publicFreeSeconds: d.publicFreeSeconds - 1, publicElapsedSeconds: nextElapsed }
        }
        if (d.phase === 'public' && d.publicMode === 'roundRobin') {
          if (d.publicRoundRobinSeconds <= 1) {
            const spoken = d.currentSpeakerSeat ? [...new Set([...d.roundRobinSpokenSeats, d.currentSpeakerSeat])] : d.roundRobinSpokenSeats
            const next = getNextRoundRobinSeat(d.seats, d.currentSpeakerSeat, spoken)
            if (!next) {
              // All players spoken — stop and alarm
              window.setTimeout(() => { setIsTimerRunning(false); setAlarmActive(true) }, 0)
              return { ...d, roundRobinSpokenSeats: spoken, publicRoundRobinSeconds: 0 }
            }
            // Advance to next speaker, restart per-player timer
            window.setTimeout(() => playChime(), 0)
            return { ...d, roundRobinSpokenSeats: spoken, currentSpeakerSeat: next, publicRoundRobinSeconds: timerDefaults.publicRoundRobinSeconds }
          }
          return { ...d, publicRoundRobinSeconds: d.publicRoundRobinSeconds - 1 }
        }
        if (d.phase === 'nomination' && d.nominationStep === 'waitingForNomination') {
          if (d.nominationWaitSeconds <= 1) {
            window.setTimeout(() => { setIsTimerRunning(false); setAlarmActive(true) }, 0)
            return { ...d, nominationWaitSeconds: 0 }
          }
          return { ...d, nominationWaitSeconds: d.nominationWaitSeconds - 1 }
        }
        if (d.phase === 'nomination' && d.nominationStep === 'actorSpeech') {
          if (d.nominationActorSeconds <= 1) {
            // Advance step but stop timer — user clicks 🎯 to continue
            window.setTimeout(() => { setIsTimerRunning(false); setAlarmActive(true) }, 0)
            return { ...d, nominationActorSeconds: 0, nominationStep: 'readyForTargetSpeech' }
          }
          return { ...d, nominationActorSeconds: d.nominationActorSeconds - 1 }
        }
        if (d.phase === 'nomination' && d.nominationStep === 'targetSpeech') {
          if (d.nominationTargetSeconds <= 1) {
            // Advance step but stop timer — user clicks 🗳 to continue
            window.setTimeout(() => { setIsTimerRunning(false); setAlarmActive(true) }, 0)
            return { ...d, nominationTargetSeconds: 0, nominationStep: 'readyToVote' }
          }
          return { ...d, nominationTargetSeconds: d.nominationTargetSeconds - 1 }
        }
        if (d.phase === 'nomination' && d.nominationStep === 'voting' && d.votingState) {
          const vs = d.votingState
          if (vs.perPlayerSeconds <= 1) {
            const voter = vs.votingOrder[vs.votingIndex]
            const newVotes = { ...vs.votes, [voter]: vs.votes[voter] ?? false }
            const nextIdx = vs.votingIndex + 1
            if (nextIdx >= vs.votingOrder.length) {
              window.setTimeout(() => { setIsTimerRunning(false); setAlarmActive(true) }, 0)
              const yesVoters = Object.entries(newVotes).filter(([, v]) => v).map(([k]) => Number(k))
              return { ...d, nominationStep: 'votingDone', voteDraft: { ...d.voteDraft, voters: yesVoters }, votingState: { ...vs, votes: newVotes, votingIndex: nextIdx, perPlayerSeconds: 0 } }
            }
            // Next voter — keep timer running
            window.setTimeout(() => playChime(), 0)
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

  // ── Phase-change chime ────────────────────────────────────────────────
  useEffect(() => {
    const key = `${currentDay.phase}-${currentDay.nominationStep}`
    if (prevPhaseRef.current && prevPhaseRef.current !== key && soundEnabledRef.current) {
      playChime()
    }
    prevPhaseRef.current = key
  }, [currentDay.phase, currentDay.nominationStep])

  // ── Countdown speech ─────────────────────────────────────────────────
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
