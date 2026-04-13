// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION } from '../constants'


export function ArenaQuickStrip({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  return (
    <>
      {/* ── Quick action strip ── */}
          <nav className="storyteller-quick-strip">
            <button
              className={`storyteller-quick-btn${showLogPanel ? ' storyteller-quick-btn--active' : ''}`}
              onClick={() => setShowLogPanel((c) => !c)}
              type="button"
            >{showLogPanel ? text.hideLog : text.showLog}</button>

            {currentDay.phase === 'nomination' ? (
              <button
                className="storyteller-quick-btn"
                onClick={() => setPickerMode('nominator')}
                type="button"
              >{text.quickNomination}</button>
            ) : null}

            <button
              className="storyteller-quick-btn"
              onClick={openSkillOverlay}
              type="button"
            >{text.quickSkill}</button>

            <button
              className="storyteller-quick-btn"
              onClick={goToNextDay}
              type="button"
            >{text.nextDay}</button>

            <button
              className="storyteller-quick-btn"
              onClick={openEndGamePanel}
              type="button"
            >{text.endGame}</button>

            <button
              className="storyteller-quick-btn"
              onClick={exportGameJson}
              type="button"
            >{text.exportJson}</button>

            <button
              className={`storyteller-quick-btn${showRightPanel ? ' storyteller-quick-btn--active' : ''}`}
              onClick={() => setShowRightPanel((c) => !c)}
              type="button"
            >{showRightPanel ? text.hidePanel : text.showPanel}</button>
          </nav>
    </>
  )
}
