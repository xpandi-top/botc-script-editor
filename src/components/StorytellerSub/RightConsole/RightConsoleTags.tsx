// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft, FAKE_NAMES, FAKE_NAMES_ZH, uniqueStrings } from '../constants'


export function RightConsoleTags({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer } = ctx;
  return (
    <>
      {/* ── Section 5: Tags ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('tags')} type="button">
              <span>{text.tagSettings}</span>
              <span>{activeConsoleSections.has('tags') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('tags') ? (
              <div className="storyteller-console-section__body">
                {/* Default tags */}
                <div className="storyteller-console__section">
                  <span className="storyteller-console__label">{text.defaultTags}</span>
                  <div className="storyteller-chip-row">
                    {(language === 'zh'
                      ? ['死亡', '处决', '中毒', '醉酒', '保护', '被提名']
                      : ['Dead', 'Executed', 'Poisoned', 'Drunk', 'Protected', 'Nominated']
                    ).map((tag) => (
                      <span className="storyteller-seat__pill" key={`default-${tag}`}>{tag}</span>
                    ))}
                  </div>
                </div>
                {/* Load predefined tags */}
                <div className="storyteller-console__section">
                  <span className="storyteller-console__label">{text.loadPredefinedTags}</span>
                  <div className="storyteller-seat-editor__add">
                    <textarea
                      className="storyteller-preset-textarea"
                      onChange={(e) => setLoadTagsPreset(e.target.value)}
                      placeholder={language === 'zh' ? '逗号分隔标签...' : 'Comma-separated tags...'}
                      rows={2}
                      value={loadTagsPreset}
                    />
                    <button
                      className="secondary-button secondary-button--small"
                      onClick={() => {
                        const tags = loadTagsPreset.split(',').map((t) => t.trim()).filter(Boolean)
                        setCustomTagPool((cur) => uniqueStrings([...cur, ...tags]))
                        setLoadTagsPreset('')
                      }}
                      type="button"
                    >{text.loadPreset}</button>
                  </div>
                </div>
                {/* Current custom tag pool */}
                <div className="storyteller-console__section">
                  <div className="storyteller-console__pool-header">
                    <span className="storyteller-console__label">{text.tagPool}</span>
                    <button className="secondary-button secondary-button--small" onClick={clearUnusedCustomTags} type="button">{text.clearUnusedTags}</button>
                  </div>
                  <div className="storyteller-chip-row">
                    {customTagPool.map((tag) => (
                      <span className="storyteller-tag-pool-item" key={`tagpool-${tag}`}>
                        <span>{tag}</span>
                        <button
                          className="storyteller-tag-pool-item__remove"
                          onClick={() => setCustomTagPool((cur) => cur.filter((t) => t !== tag))}
                          type="button"
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
    </>
  )
}
