// @ts-nocheck
import React from 'react'
import { ArenaSeatTagPopout } from './ArenaSeatTagPopout'
import { ArenaSeatSkillPopout } from './ArenaSeatSkillPopout'
import { ArenaSeatCharacterPopout } from './ArenaSeatCharacterPopout'
import { getDisplayName, getIconForCharacter, nightOrder } from '../../../catalog'
import { getSeatPosition } from '../../../utils/seats'

export function ArenaSeat({ ctx, seat, index, isPortrait }: { ctx: any, seat: any, index: number, isPortrait: boolean }) {
  const { language, pickerMode, skillOverlay, currentDay, updateCurrentDay, currentVoterSeat, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, selectedSeat, text, handleSeatClick, handleVoteYes, handleVoteNo, removeSeatTag, openSeatSkill, closeSkillOverlay, currentScriptCharacters, nightShowCharacter, nightShowWakeOrder, characterPopoutSeat, setCharacterPopoutSeat, toggleNightVisitedSeat } = ctx;

  const { left, top } = getSeatPosition(index, currentDay.seats.length, isPortrait)
                const isCharacterTag = (tag: string) => tag.startsWith('💀');
                const getCharacterName = (tag: string) => {
                  const charId = tag.slice(1);
                  return getDisplayName(charId, language);
                };
                const displayTag = (tag: string) => isCharacterTag(tag) ? getCharacterName(tag) : tag;
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
                const isCharacterPopoutOpen = characterPopoutSeat === seat.seat
                const isNightPhase = currentDay.phase === 'night'

                const actualCharId = seat.characterId
                const perceivedCharId = seat.userCharacterId || seat.characterId
                const showDifferentPerception = seat.userCharacterId && seat.userCharacterId !== seat.characterId
                const charIcon = actualCharId ? getIconForCharacter(actualCharId) : null
                const actualCharName = actualCharId ? getDisplayName(actualCharId, language) : ''
                const perceivedCharName = perceivedCharId && perceivedCharId !== actualCharId ? getDisplayName(perceivedCharId, language) : ''
                const perceivedIcon = perceivedCharId && perceivedCharId !== actualCharId ? getIconForCharacter(perceivedCharId) : null
                const isVisited = currentDay.nightVisitedSeats.includes(seat.seat)

                const isFirstNight = currentDay.day === 1
                const nightList = isFirstNight
                  ? (nightOrder?.first_night ?? [])
                  : (nightOrder?.other_nights ?? [])

                const getNightOrderPosition = (charId: string | null) => {
                  if (!charId) return null
                  const idx = nightList.indexOf(charId)
                  if (idx !== -1) return idx + 1
                  return null
                }

                const playerWakeOrder = actualCharId ? getNightOrderPosition(actualCharId) : null

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
                      isTagPopoutOpen || isSkillPopoutOpen || isCharacterPopoutOpen ? 'storyteller-seat--tag-open' : '',
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
                        {tags.map((tag) => {
                          const isCharTag = isCharacterTag(tag);
                          const charId = isCharTag ? tag.slice(1) : '';
                          const charIcon = isCharTag ? getIconForCharacter(charId) : null;
                          const charName = isCharTag ? getCharacterName(tag) : '';
                          return (
                            <span
                              className={`storyteller-seat__pill${isCharTag ? ' storyteller-seat__pill--character' : ''}`}
                              key={`${seat.seat}-${tag}`}
                              onContextMenu={(e) => { if (!seat.customTags.includes(tag)) return; e.preventDefault(); removeSeatTag(seat.seat, tag) }}
                              title={seat.customTags.includes(tag) ? 'Right click to remove' : undefined}
                            >
                              {isCharTag ? (
                                <>
                                  {charIcon ? <img alt="" className="storyteller-seat__pill-icon" src={charIcon as string} /> : null}
                                  <span>{charName}</span>
                                </>
                              ) : displayTag(tag)}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Night phase: Show character + wake order */}
                    {isNightPhase && nightShowCharacter ? (
                      <div className="storyteller-seat__night-info">
                        {actualCharId ? (
                          <>
                            <button
                              className={`storyteller-seat__char-display${isCharacterPopoutOpen ? ' storyteller-seat__char-display--open' : ''}`}
                              onClick={(e) => { e.stopPropagation(); setCharacterPopoutSeat(isCharacterPopoutOpen ? null : seat.seat) }}
                              type="button"
                            >
                              {charIcon ? <img alt="" className="storyteller-seat__char-icon" src={charIcon as string} /> : null}
                              <span>{actualCharName}</span>
                            </button>
                            {showDifferentPerception && perceivedIcon ? (
                              <button
                                className="storyteller-seat__perceived-char"
                                onClick={(e) => { e.stopPropagation(); setCharacterPopoutSeat(isCharacterPopoutOpen ? null : seat.seat) }}
                                type="button"
                              >
                                <img alt="" className="storyteller-seat__char-icon storyteller-seat__char-icon--perceived" src={perceivedIcon as string} />
                                <span>{perceivedCharName}</span>
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <button
                            className="storyteller-seat__char-assign"
                            onClick={(e) => { e.stopPropagation(); setCharacterPopoutSeat(isCharacterPopoutOpen ? null : seat.seat) }}
                            type="button"
                          >
                            {language === 'zh' ? '+ 分配角色' : '+ Assign Character'}
                          </button>
                        )}
                      </div>
                    ) : null}

                    {/* Night phase: Show wake order */}
                    {isNightPhase && nightShowWakeOrder && playerWakeOrder !== null ? (
                      <div className="storyteller-seat__wake-order">
                        <button
                          className={`storyteller-seat__wake-checkbox${isVisited ? ' storyteller-seat__wake-checkbox--checked' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleNightVisitedSeat(seat.seat) }}
                          type="button"
                          title={language === 'zh' ? '点击标记已访问' : 'Click to mark visited'}
                        >
                          {isVisited ? '✓' : ''}
                        </button>
                        <span className="storyteller-seat__wake-order-num">#{playerWakeOrder}</span>
                      </div>
                    ) : null}

        <ArenaSeatTagPopout ctx={ctx} seat={seat} />
        <ArenaSeatSkillPopout ctx={ctx} seat={seat} />
        <ArenaSeatCharacterPopout ctx={ctx} seat={seat} />
      </article>
    </>
  )
}
