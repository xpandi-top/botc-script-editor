// @ts-nocheck
import React from 'react'
import { ArenaSeatTagPopout } from './ArenaSeatTagPopout'
import { ArenaSeatSkillPopout } from './ArenaSeatSkillPopout'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { getSeatPosition } from '../../../utils/seats'

export function ArenaSeat({ ctx, seat, index, isPortrait }: { ctx: any, seat: any, index: number, isPortrait: boolean }) {
  const { language, pickerMode, skillOverlay, currentDay, updateCurrentDay, currentVoterSeat, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, selectedSeat, text, handleSeatClick, handleVoteYes, handleVoteNo, removeSeatTag, openSeatSkill, closeSkillOverlay } = ctx;

  const { left, top } = getSeatPosition(index, currentDay.seats.length, isPortrait)
                const tags = [!seat.alive ? text.aliveTag : '', seat.isExecuted ? text.executedTag : '', seat.isTraveler ? text.traveler : '', seat.hasNoVote ? text.noVoteTag : '', ...seat.customTags].filter(Boolean)
                const isRoundRobinSpeaker = currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' && currentDay.currentSpeakerSeat === seat.seat
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
                      isRoundRobinSpeaker ? 'storyteller-seat--rr-speaker' : '',
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
                              if (isCurrentVoter) {
                                // Auto-advance sequential voting
                                handleVoteYes(seat.seat)
                              } else if (currentDay.votingState) {
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
                              if (isCurrentVoter) {
                                // Auto-advance sequential voting
                                handleVoteNo(seat.seat)
                              } else if (currentDay.votingState) {
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
