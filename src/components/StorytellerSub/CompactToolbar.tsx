
// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { CHARACTER_DISTRIBUTION } from './constants' // We'll create a small constants file for the required ones

export function CompactToolbar({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  
  return (
    <>
{/* ── Compact toolbar ── */}
        <div className="storyteller-compact-toolbar">
          <div className="storyteller-compact-toolbar__left">
            <span className="storyteller-compact-count">
              <strong>{aliveCount}/{totalCount}</strong>
              {currentDay.seats.filter((s) => s.isTraveler).length > 0 ? (
                <span>+{currentDay.seats.filter((s) => s.isTraveler).length}{text.travelersCount}</span>
              ) : null}
            </span>
            {activeScriptTitle ? <span className="storyteller-script-badge">{activeScriptTitle}</span> : null}
            <button className="secondary-button secondary-button--small" onClick={() => setShowEditPlayersModal(true)} type="button">{text.editPlayers}</button>
          </div>
          <div className="storyteller-compact-toolbar__right">
            <audio ref={audioRef} />
            <div className="storyteller-bgm-mini">
              <button className="secondary-button secondary-button--small" onClick={() => setAudioPlaying((c) => !c)} type="button">{audioPlaying ? text.pause : text.play}</button>
              <select className="storyteller-bgm-mini__select" onChange={(e) => setSelectedAudioSrc(e.target.value)} value={selectedAudioSrc}>
                {audioTracks.map((t) => <option key={t.src} value={t.src}>{t.name}</option>)}
              </select>
              <label className="secondary-button secondary-button--small">
                {text.loadLocalFile}
                <input type="file" accept=".mp3" onChange={handleLocalFileChange} style={{ display: 'none' }} />
              </label>
            </div>
            <button className="print-button" onClick={openNewGamePanel} type="button">{text.newGame}</button>
            <button className="secondary-button secondary-button--small" onClick={() => { setShowRightPanel(true); setActiveConsoleSections((c) => { const n = new Set(c); n.add('settings'); return n }) }} type="button">{text.settings}</button>
            <button className="secondary-button secondary-button--small" onClick={() => setShowLogPanel((c) => !c)} type="button">{showLogPanel ? text.hideLog : text.showLog}</button>
            <button className="secondary-button secondary-button--small" onClick={() => setShowRightPanel((c) => !c)} type="button">{showRightPanel ? text.hidePanel : text.showPanel}</button>
          </div>
        </div>
    </>
  )
}
