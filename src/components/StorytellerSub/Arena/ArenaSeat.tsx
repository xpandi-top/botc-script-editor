// @ts-nocheck
import React from 'react'
import { ArenaSeatTagPopout } from './ArenaSeatTagPopout'
import { ArenaSeatSkillPopout } from './ArenaSeatSkillPopout'
import { getDisplayName, getIconForCharacter } from '../../../catalog'


export function ArenaSeat({ ctx, seat, index, isPortrait }: { ctx: any, seat: any, index: number, isPortrait: boolean }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  // Rectangular perimeter positioning (dynamically adjusts to aspect ratio)
                const total = currentDay.seats.length
                const W = isPortrait ? 2 : 3
                const H = isPortrait ? 3 : 2
                const perimeter = 2 * (W + H) // = 10
                const offset = (0.5 / total) * perimeter
                const p = (offset + (index / total) * perimeter) % perimeter
                const padX = 9, padY = 9
                let left: number, top: number
                if (p < W) {
                  left = padX + (p / W) * (100 - 2 * padX); top = padY
                } else if (p < W + H) {
                  left = 100 - padX; top = padY + ((p - W) / H) * (100 - 2 * padY)
                } else if (p < 2 * W + H) {
                  left = (100 - padX) - ((p - W - H) / W) * (100 - 2 * padX); top = 100 - padY
                } else {
                  left = padX; top = (100 - padY) - ((p - 2 * W - H) / H) * (100 - 2 * padY)
                }
                const tags = [!seat.alive ? text.aliveTag : '', seat.isExecuted ? text.executedTag : '', seat.isTraveler ? text.traveler : '', seat.hasNoVote ? text.noVoteTag : '', ...seat.customTags].filter(Boolean)
                const isSpoken = currentDay.roundRobinSpokenSeats.includes(seat.seat)
                const isVoteActor = currentDay.voteDraft.actor === seat.seat
                const isVoteTarget = currentDay.voteDraft.target === seat.seat
                const isSkillActor = skillOverlay?.draft.actor === seat.seat
                const isSkillTarget = skillOverlay?.draft.targets.includes(seat.seat) ?? false
                const isCurrentVoter = currentVoterSeat === seat.seat
                const hasVoted = currentDay.votingState?.votes[seat.seat] !== undefined
                const votedYes = currentDay.votingState?.votes[seat.seat] === true
                const isInNomination = currentDay.phase === 'nomination' && currentDay.nominationStep !== 'waitingForNomination'
                const cardVotedYes = currentDay.votingState
                  ? currentDay.votingState.votes[seat.seat] === true
                  : currentDay.voteDraft.voters.includes(seat.seat)
                const cardVotedNo = currentDay.votingState
                  ? currentDay.votingState.votes[seat.seat] === false
                  : currentDay.voteDraft.noVoters.includes(seat.seat)
                const isTagPopoutOpen = tagPopoutSeat === seat.seat
                const isSkillPopoutOpen = skillPopoutSeat === seat.seat

  return (
    <>
      <article
                    className={[
                      'storyteller-seat',
                      !seat.alive ? 'storyteller-seat--dead' : '',
                      seat.isExecuted ? 'storyteller-seat--executed' : '',
                      seat.isTraveler ? 'storyteller-seat--traveler' : '',
                      selectedSeat?.seat === seat.seat ? 'storyteller-seat--speaker' : '',
                      isSpoken ? 'storyteller-seat--spoken' : '',
                      isVoteActor || isSkillActor ? 'storyteller-seat--actor' : '',
                      isVoteTarget ? 'storyteller-seat--target' : '',
                      isSkillTarget ? 'storyteller-seat--skill-target' : '',
                      isCurrentVoter ? 'storyteller-seat--current-voter' : '',
                      pickerMode !== 'none' ? 'storyteller-seat--picker' : '',
                      isTagPopoutOpen || isSkillPopoutOpen ? 'storyteller-seat--tag-open' : '',
                    ].filter(Boolean).join(' ')}
                    key={seat.seat}
                    style={{ left: `${left}%`, top: `${top}%` } as CSSProperties}
                  >
                    <button className="storyteller-seat__surface" onClick={() => handleSeatClick(seat.seat)} type="button">
                      <div className="storyteller-seat__header">
                        <span className="storyteller-seat__nameline">
                          <span className="storyteller-seat__number">#{seat.seat}</span>
                          <span className="storyteller-seat__name">{seat.name}</span>
                        </span>
                        {hasVoted ? <span className={`storyteller-seat__vote-mark${votedYes ? '' : ' storyteller-seat__vote-mark--no'}`}>{votedYes ? '✓' : '✗'}</span> : null}
                      </div>
                    </button>

                    {/* Use Skill button */}
                    <button
                      className={`storyteller-seat__skill-btn${isSkillPopoutOpen ? ' storyteller-seat__skill-btn--open' : ''}`}
                      onClick={(e) => { e.stopPropagation(); if (isSkillPopoutOpen) { closeSkillOverlay(false) } else { openSeatSkill(seat.seat) } }}
                      type="button"
                    >{language === 'zh' ? '发动技能' : 'Use Skill'}</button>

                    {/* Tag button */}
                    <button
                      className={`storyteller-seat__tag-btn${isTagPopoutOpen ? ' storyteller-seat__tag-btn--open' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setTagPopoutSeat(isTagPopoutOpen ? null : seat.seat); setSkillPopoutSeat(null); if (skillOverlay && !isTagPopoutOpen) closeSkillOverlay(false) }}
                      type="button"
                    >{text.addTagLabel}</button>

                    {/* Agree / Disagree buttons during nomination */}
                    {isInNomination ? (
                      cardVotedYes ? (
                        <button
                          className="storyteller-seat__vote-indicator storyteller-seat__vote-indicator--yes"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (currentDay.votingState) {
                              updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: undefined as unknown as boolean } } : null }))
                            } else {
                              updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } }))
                            }
                          }}
                          type="button"
                        >✓</button>
                      ) : cardVotedNo ? (
                        <button
                          className="storyteller-seat__vote-indicator storyteller-seat__vote-indicator--no"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (currentDay.votingState) {
                              updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: undefined as unknown as boolean } } : null }))
                            } else {
                              updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } }))
                            }
                          }}
                          type="button"
                        >✗</button>
                      ) : (
                        <div className="storyteller-seat__vote-btns">
                          <button
                            className="storyteller-seat__vote-btn storyteller-seat__vote-btn--yes"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (currentDay.votingState) {
                                updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: true } } : null }))
                              } else {
                                updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: [...d.voteDraft.voters, seat.seat], noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } }))
                              }
                            }}
                            type="button"
                          >✓</button>
                          <button
                            className="storyteller-seat__vote-btn storyteller-seat__vote-btn--no"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (currentDay.votingState) {
                                updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: false } } : null }))
                              } else {
                                updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: [...d.voteDraft.noVoters, seat.seat], voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } }))
                              }
                            }}
                            type="button"
                          >✗</button>
                        </div>
                      )
                    ) : null}

                    {tags.length ? (
                      <div className="storyteller-seat__tag-list">
                        {tags.map((tag) => (
                          <span
                            className="storyteller-seat__pill"
                            key={`${seat.seat}-${tag}`}
                            onContextMenu={(e) => { if (!seat.customTags.includes(tag)) return; e.preventDefault(); removeSeatTag(seat.seat, tag) }}
                            title={seat.customTags.includes(tag) ? 'Right click to remove' : undefined}
                          >{tag}</span>
                        ))}
                      </div>
                    ) : null}

                    
        <ArenaSeatTagPopout ctx={ctx} seat={seat} />
        <ArenaSeatSkillPopout ctx={ctx} seat={seat} />
      </article>
    </>
  )
}
