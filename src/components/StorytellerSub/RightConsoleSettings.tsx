// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft, FAKE_NAMES, FAKE_NAMES_ZH, uniqueStrings } from './constants'


export function RightConsoleSettings({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer } = ctx;
  return (
    <>
      {/* ── Section 4: Settings (CountDown) ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('settings')} type="button">
              <span>{text.settings}</span>
              <span>{activeConsoleSections.has('settings') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('settings') ? (
              <div className="storyteller-console-section__body">
                <div className="storyteller-settings-grid">
                  <label className="editor-field"><span>{text.privateDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, privateSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.privateSeconds} /></label>
                  <label className="editor-field"><span>{text.publicFreeDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, publicFreeSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.publicFreeSeconds} /></label>
                  <label className="editor-field"><span>{text.publicRoundRobinDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, publicRoundRobinSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.publicRoundRobinSeconds} /></label>
                  <label className="editor-field"><span>{text.nominationDelayDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationDelayMinutes: Number(e.target.value) }))} type="number" value={timerDefaults.nominationDelayMinutes} /></label>
                  <label className="editor-field"><span>{text.nominationWaitDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationWaitSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationWaitSeconds} /></label>
                  <label className="editor-field"><span>{text.actorSpeechDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationActorSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationActorSeconds} /></label>
                  <label className="editor-field"><span>{text.targetSpeechDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationTargetSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationTargetSeconds} /></label>
                  <label className="editor-field"><span>{text.voteDefault}</span><input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationVoteSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationVoteSeconds} /></label>
                </div>
              </div>
            ) : null}
          </div>
    </>
  )
}
