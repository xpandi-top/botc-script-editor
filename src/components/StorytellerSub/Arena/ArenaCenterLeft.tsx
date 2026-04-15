// @ts-nocheck
import React, { useState } from 'react'
import type { Phase, NominationStep, PublicMode } from '../types'

const NOM_STEPS: NominationStep[] = [
  'waitingForNomination', 'nominationDecision', 'actorSpeech',
  'readyForTargetSpeech', 'targetSpeech', 'readyToVote', 'voting', 'votingDone',
]

export function ArenaCenterLeft({ ctx }: { ctx: any }) {
  const {
    language, text, currentDay, updateCurrentDay,
    hasTimer, currentTimerSeconds, isTimerRunning, setIsTimerRunning,
    setCurrentTimer, syncDayTimers, setPickerMode,
    audioPlaying, setAudioPlaying, startNight, stopNight,
    canNominate, secondsUntilNomination,
    showNominationSheet, setShowNominationSheet,
    enterNomination, confirmNomination, confirmTargetSpeech, startVoting,
    moveToNextSpeaker, goToNextDay, setPhase,
    alarmActive, setAlarmActive,
    nightShowCharacter, setNightShowCharacter,
    nightShowWakeOrder, setNightShowWakeOrder,
    setNewGamePanel,
    activeScriptSlug,
    appendEvent,
  } = ctx

  const [quickNote, setQuickNote] = useState('')
  const stepIdx = NOM_STEPS.indexOf(currentDay.nominationStep)

  const handleAddQuickNote = () => {
    const note = quickNote.trim()
    if (!note) return
    const kind = currentDay.phase === 'night' ? 'tagChange' : 'stateChange'
    const updatedDay = appendEvent(currentDay, kind, `📝 ${note}`)
    updateCurrentDay(() => updatedDay)
    setQuickNote('')
  }

  const handleOpenCharacterEditor = () => {
    const regularSeats = currentDay.seats.filter(s => !s.isTraveler)
    const travelerSeats = currentDay.seats.filter(s => s.isTraveler)
    const assignments: Record<number, string> = {}
    const userAssignments: Record<number, string> = {}
    const seatNames: Record<number, string> = {}
    const seatNotes: Record<number, string> = {}

    for (const seat of currentDay.seats) {
      assignments[seat.seat] = seat.characterId || ''
      userAssignments[seat.seat] = seat.userCharacterId || ''
      seatNames[seat.seat] = seat.name
      seatNotes[seat.seat] = seat.note || ''
    }

    setNewGamePanel({
      playerCount: regularSeats.length,
      travelerCount: travelerSeats.length,
      scriptSlug: activeScriptSlug || '',
      allowDuplicateChars: false,
      allowEmptyChars: false,
      allowSameNames: false,
      assignments,
      userAssignments,
      seatNames,
      seatNotes,
      specialNote: '',
      demonBluffs: [],
      editMode: true,
    })
  }

  return (
    <div className="storyteller-center__left">
      {/* Phase tabs */}
      <div className="storyteller-center__phase-tabs">
        {(['night', 'private', 'public', 'nomination'] as Phase[]).map((p) => (
          <button
            className={`storyteller-center__phase-btn${currentDay.phase === p ? ' storyteller-center__phase-btn--active' : ''}`}
            key={p}
            onClick={(e) => { e.stopPropagation(); setPhase(p) }}
            type="button"
          >
            {p === 'night' ? text.nightPhase
              : p === 'private' ? text.privateChat
              : p === 'public' ? text.publicChat
              : text.nomination}
          </button>
        ))}
      </div>

      {/* Quick note */}
      <div className="storyteller-center__quick-note">
        <input
          className="storyteller-center__quick-note-input"
          placeholder={language === 'zh' ? '添加备注...' : 'Add note...'}
          type="text"
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddQuickNote() }}
        />
        <button
          className="secondary-button secondary-button--small"
          onClick={handleAddQuickNote}
          type="button"
        >
          {language === 'zh' ? '添加' : 'Add'}
        </button>
      </div>

      {/* Public mode select */}
      {currentDay.phase === 'public' && (
        <select
          className="storyteller-center__mode-select"
          onChange={(e) => updateCurrentDay((d: any) => ({ ...d, publicMode: e.target.value as PublicMode }))}
          value={currentDay.publicMode}
        >
          <option value="free">{text.freeSpeech}</option>
          <option value="roundRobin">{text.roundRobinMode}</option>
        </select>
      )}

      {/* Timer display + controls */}
      {hasTimer && (
        <div className="storyteller-center__timer-row">
          <input
            aria-label="Current timer"
            className={`storyteller-center__timer-input${alarmActive ? ' storyteller-center__timer-input--alarm' : ''}`}
            onChange={(e) => {
              const val = e.target.value
              if (val.includes(':')) {
                const [mPart, sPart] = val.split(':')
                setCurrentTimer((parseInt(mPart, 10) || 0) * 60 + (parseInt(sPart, 10) || 0))
              } else {
                const n = parseInt(val, 10)
                if (!isNaN(n)) setCurrentTimer(n)
              }
            }}
            inputMode="numeric"
            type="text"
            value={`${String(Math.floor(currentTimerSeconds / 60)).padStart(2, '0')}:${String(currentTimerSeconds % 60).padStart(2, '0')}`}
          />
          {alarmActive && (
            <button
              className="storyteller-center__alarm-dismiss"
              onClick={() => setAlarmActive(false)}
              title={language === 'zh' ? '关闭' : 'Dismiss'}
              type="button"
            >🔔</button>
          )}
        </div>
      )}

      {hasTimer && (
        <div className="storyteller-center__timer-controls">
          <button
            className={`storyteller-center__ctrl-btn${isTimerRunning ? ' storyteller-center__ctrl-btn--active' : ''}`}
            onClick={() => { setIsTimerRunning((c: boolean) => !c); if (alarmActive) setAlarmActive(false) }}
            title={text.start}
            type="button"
          >{isTimerRunning ? '⏸' : '▶'}</button>
          <button className="storyteller-center__ctrl-btn" onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }} title={text.resetTimer} type="button">↺</button>
          <button className="storyteller-center__ctrl-btn" onClick={() => setCurrentTimer(0)} title={text.endNow} type="button">■</button>
        </div>
      )}

      {/* Night phase BGM controls */}
      {currentDay.phase === 'night' && (
        <div className="storyteller-center__timer-controls">
          <button
            className={`storyteller-center__ctrl-btn${audioPlaying ? ' storyteller-center__ctrl-btn--active' : ''}`}
            onClick={(e) => { e.stopPropagation(); audioPlaying ? setAudioPlaying(false) : startNight() }}
            title={audioPlaying ? text.pause : text.play}
            type="button"
          >{audioPlaying ? '⏸' : '▶'}</button>
          <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); stopNight() }} title={text.endNow} type="button">■</button>
        </div>
      )}

      {/* Night phase show controls */}
      {currentDay.phase === 'night' && (
        <div className="storyteller-center__night-controls">
          <button
            className={`secondary-button secondary-button--small${nightShowCharacter ? ' tab-button--active' : ''}`}
            onClick={() => setNightShowCharacter((v: boolean) => !v)}
            type="button"
          >
            {language === 'zh' ? '👁 显示角色' : '👁 Show Character'}
          </button>
          <button
            className={`secondary-button secondary-button--small${nightShowWakeOrder ? ' tab-button--active' : ''}`}
            onClick={() => setNightShowWakeOrder((v: boolean) => !v)}
            type="button"
          >
            {language === 'zh' ? '🔢 唤醒顺序' : '🔢 Wake Order'}
          </button>
          <button
            className="secondary-button secondary-button--small"
            onClick={handleOpenCharacterEditor}
            type="button"
          >
            {language === 'zh' ? '🎭 编辑游戏' : '🎭 Edit Game'}
          </button>
        </div>
      )}

      {/* Round-robin current speaker + controls */}
      {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' && (
        <>
          <p className="storyteller-center__speaker">#{currentDay.currentSpeakerSeat ?? '—'}</p>
          <div className="storyteller-center__speaker-nav">
            <button className="secondary-button secondary-button--small" onClick={() => setPickerMode('speaker')} type="button">{text.chooseSpeaker}</button>
            <button className="secondary-button secondary-button--small" onClick={() => {
              const all = currentDay.seats.map((s: any) => s.seat)
              const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
              updateCurrentDay((d: any) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
            }} type="button">{text.randomSpeaker}</button>
            <button className="secondary-button secondary-button--small" onClick={moveToNextSpeaker} type="button">{text.nextSpeaker}</button>
          </div>
        </>
      )}

      {/* Public: nomination gate / button */}
      {currentDay.phase === 'public' && currentDay.publicMode === 'free' && (
        canNominate
          ? <button className="print-button storyteller-start-vote" onClick={enterNomination} type="button">{text.startNomination}</button>
          : <p className="storyteller-center__status storyteller-center__status--muted">
              {text.nominationGate}: {Math.ceil(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}
            </p>
      )}

      {/* Nomination phase — compact step buttons always visible */}
      {currentDay.phase === 'nomination' && (
        <>
          <div className="storyteller-center__nom-steps">
            <button
              className={`storyteller-center__nom-step-btn${stepIdx === 1 ? ' storyteller-center__nom-step-btn--active' : stepIdx > 2 ? ' storyteller-center__nom-step-btn--done' : ''}`}
              disabled={currentDay.nominationStep !== 'nominationDecision'}
              onClick={confirmNomination}
              title={language === 'zh' ? '提名者计时' : 'Nominator countdown'}
              type="button"
            >🎙{stepIdx > 2 ? ' ✓' : ''}</button>
            <button
              className={`storyteller-center__nom-step-btn${stepIdx === 3 ? ' storyteller-center__nom-step-btn--active' : stepIdx > 4 ? ' storyteller-center__nom-step-btn--done' : ''}`}
              disabled={currentDay.nominationStep !== 'readyForTargetSpeech'}
              onClick={confirmTargetSpeech}
              title={language === 'zh' ? '被提名者计时' : 'Nominee countdown'}
              type="button"
            >🎯{stepIdx > 4 ? ' ✓' : ''}</button>
            <button
              className={`storyteller-center__nom-step-btn${stepIdx === 5 ? ' storyteller-center__nom-step-btn--active' : stepIdx > 5 ? ' storyteller-center__nom-step-btn--done' : ''}`}
              disabled={currentDay.nominationStep !== 'readyToVote'}
              onClick={startVoting}
              title={language === 'zh' ? '开始投票' : 'Start vote'}
              type="button"
            >🗳{stepIdx > 5 ? ' ✓' : ''}</button>
          </div>

          <div className="storyteller-center__nominate-row">
            <button
              className={`storyteller-center__nom-nominate-btn${showNominationSheet ? ' storyteller-center__nom-nominate-btn--active' : ''}`}
              onClick={() => setShowNominationSheet((v: boolean) => !v)}
              type="button"
            >{language === 'zh' ? '📋 提名' : '📋 Nominate'}</button>
            <button
              className="storyteller-center__nom-nextday-btn"
              onClick={(e) => { e.stopPropagation(); goToNextDay() }}
              type="button"
            >{language === 'zh' ? '▶ 下一天' : '▶ Next Day'}</button>
          </div>
        </>
      )}
    </div>
  )
}
