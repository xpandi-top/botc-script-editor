// @ts-nocheck
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { useIsMobile } from './useIsMobile'


export function ArenaSeatTagPopout({ ctx, seat }: { ctx: any, seat: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;

  const isTagPopoutOpen = tagPopoutSeat === seat.seat;
  const isMobile = useIsMobile();
  const [showCharacters, setShowCharacters] = useState(false);

  if (!isTagPopoutOpen) return null;

  const characterTag = (c: string) => `💀${c}`;
  const isCharacterTag = (tag: string) => tag.startsWith('💀');

  const content = (
    <>
      {isMobile && (
        <div className="storyteller-popout-backdrop" onClick={() => setTagPopoutSeat(null)} />
      )}
      <div className="storyteller-tag-popout" onClick={(e) => e.stopPropagation()}>
                        {/* Status toggles */}
                        <div className="storyteller-tag-popout__grid">
                          <button className={`secondary-button secondary-button--small${!seat.alive ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, alive: !s.alive }))} type="button">{text.aliveTag}</button>
                          <button className={`secondary-button secondary-button--small${seat.isExecuted ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, isExecuted: !s.isExecuted }))} type="button">{text.executedTag}</button>
                          <button className={`secondary-button secondary-button--small${seat.isTraveler ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, isTraveler: !s.isTraveler }))} type="button">{text.traveler}</button>
                          <button className={`secondary-button secondary-button--small${seat.hasNoVote ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, hasNoVote: !s.hasNoVote }))} type="button">{text.noVoteTag}</button>
                        </div>

                        {/* Input + add button */}
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

                        {/* Custom tag pool (scrollable) */}
                        {customTagPool.filter(tag => !isCharacterTag(tag)).length > 0 && (
                          <div className="storyteller-tag-popout__pool">
                            {customTagPool.filter(tag => !isCharacterTag(tag)).map((tag) => (
                              <button
                                className={`secondary-button secondary-button--small${seat.customTags.includes(tag) ? ' tab-button--active' : ''}`}
                                key={`pop-${tag}`}
                                onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v) => v !== tag) : [...s.customTags, tag] }))}
                                type="button"
                              >{tag}</button>
                            ))}
                          </div>
                        )}

                        {/* Characters section */}
                        {currentScriptCharacters && currentScriptCharacters.length > 0 && (
                          <>
                            <div className="storyteller-tag-popout__divider-row">
                              <div className="storyteller-tag-popout__divider" />
                              <button
                                className="storyteller-tag-popout__toggle"
                                onClick={() => setShowCharacters((v) => !v)}
                                type="button"
                              >
                                {showCharacters ? '▼' : '▶'} {text.characters || 'Characters'}
                              </button>
                              <div className="storyteller-tag-popout__divider" />
                            </div>

                            {showCharacters && (
                              <div className="storyteller-tag-popout__pool storyteller-tag-popout__pool--characters">
                                {currentScriptCharacters.map((c) => {
                                  const tag = characterTag(c);
                                  const icon = getIconForCharacter(c);
                                  const name = getDisplayName(c, language);
                                  return (
                                    <button
                                      className={`secondary-button secondary-button--small storyteller-tag-popout__character-btn${seat.customTags.includes(tag) ? ' tab-button--active' : ''}`}
                                      key={`char-${c}`}
                                      onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v) => v !== tag) : [...s.customTags, tag] }))}
                                      type="button"
                                    >
                                      {icon ? <img alt="" className="storyteller-tag-popout__char-icon" src={icon as string} /> : null}
                                      <span>{name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
      </div>
    </>
  );

  return isMobile ? createPortal(content, document.body) : content;
}
