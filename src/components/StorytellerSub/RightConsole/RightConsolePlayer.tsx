// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft, FAKE_NAMES, FAKE_NAMES_ZH, uniqueStrings } from '../constants'


export function RightConsolePlayer({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer } = ctx;

  const isCharacterTag = (tag: string) => tag.startsWith('💀');
  const getCharacterName = (tag: string) => {
    const charId = tag.slice(1);
    return getDisplayName(charId, language);
  };
  const displayTag = (tag: string) => isCharacterTag(tag) ? getCharacterName(tag) : tag;

  return (
    <>
      {/* ── Section 3: Player ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('player')} type="button">
              <span>{text.playerSection}</span>
              <span>{activeConsoleSections.has('player') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('player') ? (
              <div className="storyteller-console-section__body">
                {/* Player count info + edit button */}
                <div className="storyteller-chip-row" style={{ alignItems: 'center' }}>
                  <span className="storyteller-compact-count">
                    <strong>{aliveCount}/{totalCount}</strong>
                    {currentDay.seats.filter((s) => s.isTraveler).length > 0 ? (
                      <span>+{currentDay.seats.filter((s) => s.isTraveler).length}{text.travelersCount}</span>
                    ) : null}
                  </span>
                  <button className="secondary-button secondary-button--small" onClick={() => setShowEditPlayersModal(true)} type="button">{text.editPlayers}</button>
                </div>

                {/* Player name pool */}
                <div className="storyteller-console__section">
                  <span className="storyteller-console__label">{text.playerPool}</span>
                  <div className="storyteller-player-pool">
                    {playerNamePool.map((name, i) => {
                      const isUsed = currentDay.seats.some((s) => s.name === name)
                      return (
                        <span
                          className={`storyteller-player-pool__chip${isUsed ? ' storyteller-player-pool__chip--used' : ''}`}
                          key={`${name}-${i}`}
                          onClick={() => {
                            const seat = currentDay.seats.find((s) => s.name.startsWith('Player '))
                            if (seat) updateSeat(seat.seat, (s) => ({ ...s, name }))
                          }}
                          title={text.assignName}
                        >{name}</span>
                      )
                    })}
                  </div>
                  <div className="storyteller-chip-row">
                    <button className="secondary-button secondary-button--small" onClick={() => setPlayerNamePool(language === 'zh' ? [...FAKE_NAMES_ZH] : [...FAKE_NAMES])} type="button">{text.loadFakeNames}</button>
                    <button className="secondary-button secondary-button--small" onClick={resetSeatNames} type="button">{text.resetNames}</button>
                    <button className="secondary-button secondary-button--small" onClick={() => setPlayerNamePool([])} type="button">{text.clear}</button>
                  </div>
                </div>

                {/* Selected player editor */}
                {selectedSeat ? (
                  <div className="storyteller-console__section">
                    <div className="storyteller-seat-editor">
                      <div className="storyteller-seat-editor__section">
                        <strong>{text.selectedPlayer}</strong>
                        <span>#{selectedSeat.seat} {selectedSeat.name}</span>
                      </div>
                      <div className="storyteller-seat-editor__section">
                        <div className="storyteller-chip-row">
                          <button className={`secondary-button secondary-button--small${!selectedSeat.alive ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, alive: !s.alive }))} type="button">{text.aliveTag}</button>
                          <button className={`secondary-button secondary-button--small${selectedSeat.isExecuted ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, isExecuted: !s.isExecuted }))} type="button">{text.executedTag}</button>
                          <button className={`secondary-button secondary-button--small${selectedSeat.isTraveler ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, isTraveler: !s.isTraveler }))} type="button">{text.traveler}</button>
                          <button className={`secondary-button secondary-button--small${selectedSeat.hasNoVote ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, hasNoVote: !s.hasNoVote }))} type="button">{text.noVoteTag}</button>
                        </div>
                      </div>
                      {selectedSeatTags.length ? (
                        <div className="storyteller-chip-row">
                          {selectedSeatTags.map((tag) => <span className="storyteller-seat__pill" key={`${selectedSeat.seat}-${tag}`}>{displayTag(tag)}</span>)}
                        </div>
                      ) : null}
                      <div className="storyteller-seat-editor__section">
                        <label className="editor-field">
                          <span>{text.addTag}</span>
                          <div className="storyteller-seat-editor__add">
                            <input onChange={(e) => setSeatTagDrafts((c) => ({ ...c, [selectedSeat.seat]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(selectedSeat.seat); document.activeElement && 'blur' in document.activeElement && (document.activeElement as HTMLInputElement).blur() } }} placeholder={text.addTag} type="text" value={seatTagDrafts[selectedSeat.seat] ?? ''} />
                            <button className="secondary-button secondary-button--small" onClick={() => addCustomTag(selectedSeat.seat)} type="button">+</button>
                          </div>
                        </label>
                        {customTagPool.filter(tag => !isCharacterTag(tag)).length ? (
                          <>
                            <div className="storyteller-console__pool-header">
                              <span className="storyteller-console__label">{text.tagPool}</span>
                              <button className="secondary-button secondary-button--small" onClick={clearUnusedCustomTags} type="button">{text.clearUnusedTags}</button>
                            </div>
                            <div className="storyteller-chip-row">
                              {customTagPool.filter(tag => !isCharacterTag(tag)).map((tag) => (
                                <button className={`secondary-button secondary-button--small${selectedSeat.customTags.includes(tag) ? ' tab-button--active' : ''}`} key={`pool-${tag}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v) => v !== tag) : [...s.customTags, tag] }))} type="button">{tag}</button>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
    </>
  )
}
