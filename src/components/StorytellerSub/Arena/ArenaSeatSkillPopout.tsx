// @ts-nocheck
import React from 'react'
import { createPortal } from 'react-dom'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { useIsMobile } from './useIsMobile'


export function ArenaSeatSkillPopout({ ctx, seat }: { ctx: any, seat: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;

  const isSkillPopoutOpen = skillPopoutSeat === seat.seat;
  const isMobile = useIsMobile();

  if (!isSkillPopoutOpen || !skillOverlay) return null;

  const content = (
    <>
      {isMobile && (
        <div className="storyteller-popout-backdrop" onClick={() => closeSkillOverlay(false)} />
      )}
      <div className="storyteller-skill-popout" onClick={(e) => e.stopPropagation()}>
                        {/* Actor */}
                        <div className="storyteller-skill-popout__actor">
                          <span>{language === 'zh' ? '发动者' : 'Actor'}</span>
                          <strong>#{seat.seat} {seat.name}</strong>
                        </div>

                        {/* Targets */}
                        <div className="storyteller-skill-popout__target-section">
                          <span className="storyteller-skill-popout__label">{language === 'zh' ? '目标' : 'Target'}</span>
                          <div className="storyteller-skill-popout__target-grid">
                            {currentDay.seats.map((s) => {
                              const isTarget = skillOverlay.draft.targets.includes(s.seat)
                              return (
                                <label className="storyteller-skill-popout__target-check" key={s.seat}>
                                  <input
                                    checked={isTarget}
                                    onChange={() => setSkillOverlay((p) => {
                                      if (!p) return p
                                      const targets = isTarget ? p.draft.targets.filter((t) => t !== s.seat) : [...p.draft.targets, s.seat]
                                      return { ...p, draft: { ...p.draft, targets } }
                                    })}
                                    type="checkbox"
                                  />
                                  <span>#{s.seat}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        {/* Role */}
                        {/* Claimed role — optional single dropdown with icons */}
                        <div className="storyteller-skill-popout__field">
                          <span>{text.skillRole}</span>
                          <div className="storyteller-skill-popout__role-dropdown">
                            <button
                              className="storyteller-skill-popout__role-trigger"
                              onClick={(e) => { e.stopPropagation(); setSkillRoleDropdownOpen((o) => !o) }}
                              type="button"
                            >
                              {skillOverlay.draft.roleId ? (
                                <>
                                  {getIconForCharacter(skillOverlay.draft.roleId) ? <img alt="" className="storyteller-skill-overlay__role-icon" src={getIconForCharacter(skillOverlay.draft.roleId) as string} /> : null}
                                  <span>{getDisplayName(skillOverlay.draft.roleId, language)}</span>
                                </>
                              ) : <span className="storyteller-skill-popout__role-placeholder">{language === 'zh' ? '— 未声明 —' : '— None —'}</span>}
                              <span className="storyteller-skill-popout__role-caret">▾</span>
                            </button>
                            {skillRoleDropdownOpen ? (
                              <div className="storyteller-skill-popout__role-options">
                                <button
                                  className="storyteller-skill-popout__role-option"
                                  onClick={() => { setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, roleId: '' } } : p); setSkillRoleDropdownOpen(false) }}
                                  type="button"
                                >{language === 'zh' ? '— 未声明 —' : '— None —'}</button>
                                {currentScriptCharacters.map((c) => {
                                  const icon = getIconForCharacter(c)
                                  const name = getDisplayName(c, language)
                                  return (
                                    <button
                                      className={`storyteller-skill-popout__role-option${skillOverlay.draft.roleId === c ? ' storyteller-skill-popout__role-option--active' : ''}`}
                                      key={c}
                                      onClick={() => { setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, roleId: c } } : p); setSkillRoleDropdownOpen(false) }}
                                      type="button"
                                    >
                                      {icon ? <img alt="" className="storyteller-skill-overlay__role-icon" src={icon as string} /> : null}
                                      <span>{name}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Statement */}
                        <label className="storyteller-skill-popout__field">
                          <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, statement: e.target.value } } : p)} placeholder={text.statement} type="text" value={skillOverlay.draft.statement} />
                        </label>

                        {/* Note */}
                        <label className="storyteller-skill-popout__field">
                          <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, note: e.target.value } } : p)} placeholder={text.note} type="text" value={skillOverlay.draft.note} />
                        </label>

                        {/* Per-target notes */}
                        {skillOverlay.draft.targets.map((t) => (
                          <label className="storyteller-skill-popout__field" key={t}>
                            <span>#{t} {text.targetNote}</span>
                            <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, targetNotes: { ...p.draft.targetNotes, [t]: e.target.value } } } : p)} type="text" value={skillOverlay.draft.targetNotes[t] ?? ''} />
                          </label>
                        ))}

                        {/* Result */}
                        <div className="storyteller-skill-popout__field">
                          <select
                            className="storyteller-skill-popout__result-select"
                            value={skillOverlay.draft.result ?? ''}
                            onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, result: e.target.value || null } } : p)}
                          >
                            <option value="">{language === 'zh' ? '— 未选择 —' : '— None —'}</option>
                            <option value="success">{language === 'zh' ? '成功' : 'Success'}</option>
                            <option value="failure">{language === 'zh' ? '失败' : 'Failure'}</option>
                          </select>
                        </div>

                        {/* Save / Cancel */}
                        <div className="storyteller-skill-popout__actions">
                          <button className="storyteller-skill-popout__action-btn storyteller-skill-popout__action-btn--save" onClick={() => closeSkillOverlay(true)} title={text.saveSkill} type="button">✓</button>
                          <button className="storyteller-skill-popout__action-btn storyteller-skill-popout__action-btn--cancel" onClick={() => closeSkillOverlay(false)} title={text.cancelSkill} type="button">✕</button>
                        </div>
      </div>
    </>
  );

  return isMobile ? createPortal(content, document.body) : content;
}
