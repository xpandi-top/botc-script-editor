// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft } from '../constants'


export function ArenaCenterRight({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  return (
    <>
      {/* Right: Day info */}
                <div className="storyteller-center__right">
                  {/* Day navigation */}
                  <div className="storyteller-center__day-nav">
                    <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); goToPreviousDay() }} type="button">◀</button>
                    <select className="storyteller-center__mode-select" onChange={(e) => setSelectedDayId(e.target.value)} value={currentDay.id}>
                      {days.map((d) => <option key={d.id} value={d.id}>Day {d.day}</option>)}
                    </select>
                    <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); goToNextDay() }} type="button">▶</button>
                  </div>

                  <div className="storyteller-center__game-stats">
                    <span>{text.aliveCount}: <strong>{aliveCount}/{totalCount}</strong></span>
                    <span>{text.requiredVotes}: <strong>{requiredVotes}</strong></span>
                  </div>

                  {/* Leading candidate(s) */}
                  {leadingCandidates.length > 0 ? (
                    <div className="storyteller-center__leading">
                      <span className="storyteller-center__leading-label">{text.leadingCandidate}</span>
                      {leadingCandidates.map((c) => (
                        <div className="storyteller-center__leading-row" key={c.seat}>
                          <span className="storyteller-center__leading-name">#{c.seat} {c.name}</span>
                          <span className="storyteller-center__leading-votes">{c.votes}<small>/{requiredVotes}</small></span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Nomination status */}
                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'waitingForNomination' ? (
                    <p className="storyteller-center__status">
                      {currentDay.voteDraft.actor ? `${text.actor}: #${currentDay.voteDraft.actor} → ${text.pickNominee}` : text.waitingForNomination}
                    </p>
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep !== 'waitingForNomination' ? (
                    <div className="storyteller-center__vote-mini">
                      <span>#{currentDay.voteDraft.actor ?? '?'} → #{currentDay.voteDraft.target ?? '?'}</span>
                      <span className="storyteller-center__vote-count">
                        {currentDay.votingState ? Object.values(currentDay.votingState.votes).filter(Boolean).length : currentDay.voteDraft.voters.length}
                        <small>/{requiredVotes}</small>
                      </span>
                      {isVotingComplete ? (
                        <span className={draftPassed ? 'storyteller-pass' : 'storyteller-fail'}>
                          {draftPassed ? text.pass : text.fail}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Today's nominations summary */}
                  {nominatorsThisDay.length > 0 ? (
                    <div className="storyteller-center__summary">
                      <span>{text.todayNominators}: {nominatorsThisDay.map((s) => `#${s}`).join(', ')}</span>
                      <span>{text.todayNominees}: {nomineesThisDay.map((s) => `#${s}`).join(', ')}</span>
                    </div>
                  ) : null}
                </div>
    </>
  )
}
