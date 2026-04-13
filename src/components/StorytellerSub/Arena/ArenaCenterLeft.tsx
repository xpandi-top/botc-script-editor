// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft } from '../constants'


export function ArenaCenterLeft({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  return (
    <>
      {/* Left: Stage / Timer */}
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
                        {p === 'night' ? text.nightPhase : p === 'private' ? text.privateChat : p === 'public' ? text.publicChat : text.nomination}
                      </button>
                    ))}
                  </div>
                  {/* Public mode select */}
                  {currentDay.phase === 'public' ? (
                    <select
                      className="storyteller-center__mode-select"
                      onChange={(e) => updateCurrentDay((d) => ({ ...d, publicMode: e.target.value as PublicMode }))}
                      value={currentDay.publicMode}
                    >
                      <option value="free">{text.freeSpeech}</option>
                      <option value="roundRobin">{text.roundRobinMode}</option>
                    </select>
                  ) : null}

                  {/* Timer */}
                  {hasTimer ? (
                    <input
                      aria-label="Current timer"
                      className="storyteller-center__timer-input"
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
                      type="text"
                      inputMode="numeric"
                      value={`${String(Math.floor(currentTimerSeconds / 60)).padStart(2, '0')}:${String(currentTimerSeconds % 60).padStart(2, '0')}`}
                    />
                  ) : null}

                  {/* Timer controls */}
                  {hasTimer ? (
                    <div className="storyteller-center__timer-controls">
                      <button
                        className={`storyteller-center__ctrl-btn${isTimerRunning ? ' storyteller-center__ctrl-btn--active' : ''}`}
                        onClick={() => setIsTimerRunning((c) => !c)}
                        title={text.start}
                        type="button"
                      >
                        {isTimerRunning ? '⏸' : '▶'}
                      </button>
                      <button className="storyteller-center__ctrl-btn" onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }} title={text.resetTimer} type="button">↺</button>
                      <button className="storyteller-center__ctrl-btn" onClick={() => setCurrentTimer(0)} title={text.endNow} type="button">■</button>
                    </div>
                  ) : null}

                  {/* Night phase BGM controls */}
                  {currentDay.phase === 'night' ? (
                    <div className="storyteller-center__timer-controls">
                      <button
                        className={`storyteller-center__ctrl-btn${audioPlaying ? ' storyteller-center__ctrl-btn--active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); audioPlaying ? setAudioPlaying(false) : startNight() }}
                        title={audioPlaying ? text.pause : text.play}
                        type="button"
                      >
                        {audioPlaying ? '⏸' : '▶'}
                      </button>
                      <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); stopNight() }} title={text.endNow} type="button">■</button>
                    </div>
                  ) : null}

                  {/* RoundRobin speaker */}
                  {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' ? (
                    <p className="storyteller-center__speaker">#{currentDay.currentSpeakerSeat ?? '—'}</p>
                  ) : null}

                  {/* RoundRobin speaker nav */}
                  {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' ? (
                    <div className="storyteller-center__speaker-nav">
                      <button className="secondary-button secondary-button--small" onClick={() => setPickerMode('speaker')} type="button">{text.chooseSpeaker}</button>
                      <button className="secondary-button secondary-button--small" onClick={() => {
                        const all = currentDay.seats.map((s) => s.seat)
                        const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
                        updateCurrentDay((d) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
                      }} type="button">{text.randomSpeaker}</button>
                      <button className="secondary-button secondary-button--small" onClick={moveToNextSpeaker} type="button">{text.nextSpeaker}</button>
                    </div>
                  ) : null}

                  {/* Public: nomination button */}
                  {currentDay.phase === 'public' && currentDay.publicMode === 'free' ? (
                    canNominate ? (
                      <button className="print-button storyteller-start-vote" onClick={enterNomination} type="button">{text.startNomination}</button>
                    ) : (
                      <p className="storyteller-center__status storyteller-center__status--muted">
                        {text.nominationGate}: {Math.ceil(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}
                      </p>
                    )
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'nominationDecision' ? (
                    <div className="storyteller-center__timer-controls">
                      <button className="print-button" onClick={confirmNomination} type="button">{language === 'zh' ? '提名者计时' : 'Nominator Countdown'}</button>
                    </div>
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'readyForTargetSpeech' ? (
                    <div className="storyteller-center__timer-controls">
                      <button className="print-button" onClick={confirmTargetSpeech} type="button">{language === 'zh' ? '被提名者计时' : 'Nominee Countdown'}</button>
                    </div>
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'readyToVote' ? (
                    <div className="storyteller-center__timer-controls">
                      <button className="print-button" onClick={startVoting} type="button">{language === 'zh' ? '开始投票计时' : 'Start Vote'}</button>
                    </div>
                  ) : null}

                  {/* Nominate button + Next Day (nomination phase) */}
                  {currentDay.phase === 'nomination' ? (
                    <div className="storyteller-center__nominate-row">
                      <button
                        className={`print-button storyteller-start-vote${showNominationSheet ? ' tab-button--active' : ''}`}
                        onClick={() => setShowNominationSheet((v) => !v)}
                        type="button"
                      >{language === 'zh' ? '提名' : 'Nominate'}</button>
                      <button
                        className="secondary-button storyteller-center__next-day-btn"
                        onClick={(e) => { e.stopPropagation(); goToNextDay() }}
                        type="button"
                      >{language === 'zh' ? '下一天' : 'Next Day'}</button>
                    </div>
                  ) : null}
                </div>
    </>
  )
}
