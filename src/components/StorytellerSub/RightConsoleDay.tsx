// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft, FAKE_NAMES, FAKE_NAMES_ZH, uniqueStrings } from './constants'


export function RightConsoleDay({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer } = ctx;
  return (
    <>
      {/* ── Section 2: Day / Nomination ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('day')} type="button">
              <span>{text.daySection}</span>
              <span>{activeConsoleSections.has('day') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('day') ? (
              <div className="storyteller-console-section__body">
                {/* Add Traveler */}
                <div className="storyteller-chip-row">
                  <button className="secondary-button" onClick={addTravelerSeat} type="button">{text.addTraveler}</button>
                </div>

                {/* Nomination controls */}
                {currentDay.phase === 'nomination' ? (
                  <div className="storyteller-console__section">
                    <span className="storyteller-console__label">{text.nomination}</span>
                    <div className="storyteller-chip-row">
                      <button className="secondary-button" onClick={() => setPickerMode('nominator')} type="button">{text.pickNominator}</button>
                      <button className="secondary-button" onClick={() => setPickerMode('nominee')} type="button">{text.pickNominee}</button>
                    </div>
                    <div className="storyteller-vote-summary">
                      <div><span>{text.actor}</span><strong>{currentDay.voteDraft.actor ? `#${currentDay.voteDraft.actor}` : '—'}</strong></div>
                      <div><span>{text.target}</span><strong>{currentDay.voteDraft.target ? `#${currentDay.voteDraft.target}` : '—'}</strong></div>
                      <div><span>{text.requiredVotes}</span><strong>{requiredVotes}</strong></div>
                      <div><span>{text.voters}</span><strong>{votingYesCount}</strong></div>
                    </div>
                    <label className="editor-field">
                      <span>{text.note}</span>
                      <input onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))} type="text" value={currentDay.voteDraft.note} />
                    </label>
                    {isVotingComplete ? (
                      <div className="storyteller-chip-row">
                        <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: true, systemValue: draftPassedBySystem })} type="button">{text.systemOverridePass}</button>
                        <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: false, systemValue: draftPassedBySystem })} type="button">{text.systemOverrideFail}</button>
                        <button className="secondary-button" onClick={() => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, manualPassed: null } }))} type="button">{text.clearOverride}</button>
                      </div>
                    ) : null}
                    <div className="storyteller-chip-row">
                      <button className="secondary-button" onClick={() => { updateCurrentDay((d) => ({ ...d, nominationStep: 'waitingForNomination', nominationWaitSeconds: timerDefaults.nominationWaitSeconds, voteDraft: createDefaultVoteDraft(), votingState: null })); setPickerMode('nominator') }} type="button">{text.clear}</button>
                    </div>
                  </div>
                ) : null}

              </div>
            ) : null}
          </div>
    </>
  )
}
