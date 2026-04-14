// @ts-nocheck
import React from 'react'
import { createPortal } from 'react-dom'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { useIsMobile } from './useIsMobile'


export function ArenaSeatTagPopout({ ctx, seat }: { ctx: any, seat: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;

  const isTagPopoutOpen = tagPopoutSeat === seat.seat;
  const isMobile = useIsMobile();

  if (!isTagPopoutOpen) return null;

  const content = (
    <>
      {isMobile && (
        <div className="storyteller-popout-backdrop" onClick={() => setTagPopoutSeat(null)} />
      )}
      <div className="storyteller-tag-popout" onClick={(e) => e.stopPropagation()}>
                        {/* Tag grid: status toggles + custom tag pool */}
                        <div className="storyteller-tag-popout__grid">
                          <button className={`secondary-button secondary-button--small${!seat.alive ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, alive: !s.alive }))} type="button">{text.aliveTag}</button>
                          <button className={`secondary-button secondary-button--small${seat.isExecuted ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, isExecuted: !s.isExecuted }))} type="button">{text.executedTag}</button>
                          <button className={`secondary-button secondary-button--small${seat.isTraveler ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, isTraveler: !s.isTraveler }))} type="button">{text.traveler}</button>
                          <button className={`secondary-button secondary-button--small${seat.hasNoVote ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, hasNoVote: !s.hasNoVote }))} type="button">{text.noVoteTag}</button>
                          {customTagPool.map((tag) => (
                            <button
                              className={`secondary-button secondary-button--small${seat.customTags.includes(tag) ? ' tab-button--active' : ''}`}
                              key={`pop-${tag}`}
                              onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v) => v !== tag) : [...s.customTags, tag] }))}
                              type="button"
                            >{tag}</button>
                          ))}
                        </div>
                        {/* Input + add button at bottom */}
                        <div className="storyteller-tag-popout__add-row">
                          <input
                            autoFocus
                            onChange={(e) => setSeatTagDrafts((c) => ({ ...c, [seat.seat]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(seat.seat); setSeatTagDrafts((c) => ({ ...c, [seat.seat]: '' })) } }}
                            placeholder={text.addTag}
                            type="text"
                            value={seatTagDrafts[seat.seat] ?? ''}
                          />
                          <button
                            className="storyteller-tag-popout__add-btn"
                            onMouseDown={(e) => { e.preventDefault(); addCustomTag(seat.seat); setSeatTagDrafts((c) => ({ ...c, [seat.seat]: '' })) }}
                            type="button"
                          >+</button>
                        </div>
      </div>
    </>
  );

  return isMobile ? createPortal(content, document.body) : content;
}
