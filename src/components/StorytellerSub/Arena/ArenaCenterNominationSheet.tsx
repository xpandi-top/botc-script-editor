// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft } from '../constants'


export function ArenaCenterNominationSheet({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  return (
    <>
      {/* ── Nomination sheet ── */}
                {showNominationSheet && currentDay.phase === 'nomination' ? (
                  <div className="storyteller-nomination-sheet" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="storyteller-nomination-sheet__header">
                      <span className="storyteller-nomination-sheet__title">{language === 'zh' ? '提名' : 'Nominate'}</span>
                      <button className="secondary-button secondary-button--small" onClick={() => { setShowNominationSheet(false); setPickerMode('none') }} type="button">{language === 'zh' ? '隐藏' : 'Hide'}</button>
                    </div>

                    <div className="storyteller-nomination-sheet__body">
                      {/* Left: inputs */}
                      <div className="storyteller-nomination-sheet__inputs">
                        {/* Nominator */}
                        <div className="storyteller-nomination-sheet__row">
                          <span className="storyteller-nomination-sheet__label">{text.actor}</span>
                          <select
                            className="storyteller-nomination-sheet__select"
                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: v } })); setPickerMode('nominee') } else { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: null } })) } }}
                            value={currentDay.voteDraft.actor ?? ''}
                          >
                            <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                            {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                          </select>
                          <button
                            className={`storyteller-nomination-sheet__pick-btn${pickerMode === 'nominator' ? ' storyteller-picker-active' : ''}`}
                            onClick={() => setPickerMode(pickerMode === 'nominator' ? 'none' : 'nominator')}
                            type="button"
                          >⊕</button>
                        </div>

                        {/* Nominee */}
                        <div className="storyteller-nomination-sheet__row">
                          <span className="storyteller-nomination-sheet__label">{text.target}</span>
                          <select
                            className="storyteller-nomination-sheet__select"
                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) updateCurrentDay((d) => ({ ...d, nominationStep: 'nominationDecision', voteDraft: { ...d.voteDraft, target: v, voters: [] } })); else updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, target: null } })) }}
                            value={currentDay.voteDraft.target ?? ''}
                          >
                            <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                            {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                          </select>
                          <button
                            className={`storyteller-nomination-sheet__pick-btn${pickerMode === 'nominee' ? ' storyteller-picker-active' : ''}`}
                            onClick={() => setPickerMode(pickerMode === 'nominee' ? 'none' : 'nominee')}
                            type="button"
                          >⊕</button>
                        </div>

                        {/* Nomination result */}
                        <div className="storyteller-nomination-sheet__row">
                          <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '结果' : 'Result'}</span>
                          <select
                            className={`storyteller-nomination-sheet__select storyteller-nomination-sheet__select--result${currentDay.voteDraft.nominationResult === 'fail' ? ' storyteller-nomination-sheet__select--fail' : ' storyteller-nomination-sheet__select--succeed'}`}
                            onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, nominationResult: e.target.value as 'succeed' | 'fail' } }))}
                            value={currentDay.voteDraft.nominationResult}
                          >
                            <option value="succeed">{language === 'zh' ? '✓ 提名成功' : '✓ Succeed'}</option>
                            <option value="fail">{language === 'zh' ? '✗ 提名失败' : '✗ Failed'}</option>
                          </select>
                        </div>

                        {pickerMode === 'nominator' || pickerMode === 'nominee' ? (
                          <p className="storyteller-nomination-sheet__hint">{language === 'zh' ? '← 点击圆桌上的座位进行选择' : '← Click a seat on the table to select'}</p>
                        ) : null}

                        {/* Vote override: seat checkboxes */}
                        {currentDay.nominationStep !== 'waitingForNomination' && currentDay.voteDraft.nominationResult === 'succeed' ? (
                          <div className="storyteller-nomination-sheet__votes">
                            <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '投票' : 'Votes'} ({language === 'zh' ? '手动覆盖' : 'override'})</span>
                            <div className="storyteller-nomination-sheet__vote-grid">
                              {currentDay.seats.map((s) => {
                                const voted = currentDay.votingState?.votes[s.seat]
                                const isChecked = voted === true || currentDay.voteDraft.voters.includes(s.seat)
                                return (
                                  <label className="storyteller-nomination-sheet__vote-check" key={s.seat}>
                                    <input
                                      checked={isChecked}
                                      onChange={() => {
                                        if (currentDay.votingState) {
                                          updateCurrentDay((d) => ({
                                            ...d,
                                            votingState: d.votingState ? {
                                              ...d.votingState,
                                              votes: { ...d.votingState.votes, [s.seat]: !isChecked },
                                            } : null,
                                          }))
                                        } else {
                                          updateCurrentDay((d) => ({
                                            ...d,
                                            voteDraft: {
                                              ...d.voteDraft,
                                              voters: isChecked ? d.voteDraft.voters.filter((v) => v !== s.seat) : [...d.voteDraft.voters, s.seat],
                                            },
                                          }))
                                        }
                                      }}
                                      type="checkbox"
                                    />
                                    <span>#{s.seat}</span>
                                  </label>
                                )
                              })}
                            </div>
                            <span className="storyteller-nomination-sheet__vote-count">
                              {language === 'zh' ? '同意' : 'Yes'}: <strong>{Object.values(currentDay.votingState?.votes ?? {}).filter(Boolean).length || currentDay.voteDraft.voters.length}</strong> / {requiredVotes}
                            </span>
                          </div>
                        ) : null}

                        {/* Note */}
                        <label className="storyteller-nomination-sheet__row storyteller-nomination-sheet__row--note">
                          <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '备注' : 'Note'}</span>
                          <input
                            className="storyteller-nomination-sheet__note-input"
                            onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))}
                            placeholder={language === 'zh' ? '可选备注…' : 'Optional note…'}
                            type="text"
                            value={currentDay.voteDraft.note}
                          />
                        </label>

                        {/* Agree / Disagree */}
                        {isVotingComplete && currentDay.voteDraft.nominationResult === 'succeed' ? (
                          <div className="storyteller-chip-row">
                            <button className="print-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: true, systemValue: draftPassedBySystem })} type="button">✓ {language === 'zh' ? '同意' : 'Agree'}</button>
                            <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: false, systemValue: draftPassedBySystem })} type="button">✗ {language === 'zh' ? '不同意' : 'Disagree'}</button>
                          </div>
                        ) : null}

                        {/* Record + Clear */}
                        <div className="storyteller-chip-row">
                          <button
                            className="print-button"
                            disabled={!currentDay.voteDraft.actor || !currentDay.voteDraft.target}
                            onClick={() => currentDay.voteDraft.nominationResult === 'fail' ? rejectNomination() : recordVote()}
                            type="button"
                          >{language === 'zh' ? '记录' : 'Record'}</button>
                          <button className="secondary-button secondary-button--small" onClick={() => { updateCurrentDay((d) => ({ ...d, nominationStep: 'waitingForNomination', voteDraft: createDefaultVoteDraft(), votingState: null })); setPickerMode('none') }} type="button">{text.clear}</button>
                        </div>
                      </div>

                      {/* Right: today's nomination history */}
                      <div className="storyteller-nomination-sheet__history">
                        <span className="storyteller-nomination-sheet__history-title">{language === 'zh' ? '今日提名记录' : "Today's Nominations"}</span>
                        {currentDay.voteHistory.length === 0 ? (
                          <p className="storyteller-nomination-sheet__history-empty">{language === 'zh' ? '暂无记录' : 'None yet'}</p>
                        ) : (
                          currentDay.voteHistory.map((record) => (
                            <div className={`storyteller-nomination-sheet__history-item${record.failed ? ' storyteller-nomination-sheet__history-item--failed' : record.passed ? ' storyteller-nomination-sheet__history-item--passed' : ' storyteller-nomination-sheet__history-item--failed'}`} key={record.id}>
                              <span className="storyteller-nomination-sheet__history-pair">
                                #{record.actor} → #{record.target}
                              </span>
                              {record.failed ? (
                                <span className="storyteller-nomination-sheet__history-result">{language === 'zh' ? '提名失败' : 'Nom. Failed'}</span>
                              ) : (
                                <>
                                  <span className="storyteller-nomination-sheet__history-votes">
                                    {language === 'zh' ? '票' : 'vote'}({record.voteCount}/{record.requiredVotes}){record.voters.length > 0 ? `: ${record.voters.map(v => `#${v}`).join(', ')}` : ''}
                                  </span>
                                  <span className={`storyteller-nomination-sheet__history-result${record.passed ? ' storyteller-nomination-sheet__history-result--pass' : ''}`}>
                                    {record.passed ? (language === 'zh' ? '通过' : 'Pass') : (language === 'zh' ? '失败' : 'Fail')}
                                    {record.note ? ` · ${record.note}` : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
    </>
  )
}
