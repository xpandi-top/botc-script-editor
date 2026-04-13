
// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { CHARACTER_DISTRIBUTION } from './constants' // We'll create a small constants file for the required ones

export function LeftLogPanel({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  
  return (
    <>
{/* ── Left side panel: Log ── */}
      <aside className={`storyteller-side-panel storyteller-side-panel--left${showLogPanel ? ' storyteller-side-panel--open' : ''}`}>
        <div className="storyteller-side-panel__header">
          <h3>{text.aggregatedLog}</h3>
          <button className="secondary-button secondary-button--small" onClick={() => setShowLogPanel(false)} type="button">{text.hideLog}</button>
        </div>
        <div className="storyteller-log-filters">
          <button className={`secondary-button secondary-button--small${logFilter.types.has('vote') ? ' tab-button--active' : ''}`} onClick={() => toggleLogFilterType('vote')} type="button">{text.filterVote}</button>
          <button className={`secondary-button secondary-button--small${logFilter.types.has('skill') ? ' tab-button--active' : ''}`} onClick={() => toggleLogFilterType('skill')} type="button">{text.filterSkill}</button>
          <button className={`secondary-button secondary-button--small${logFilter.types.has('event') ? ' tab-button--active' : ''}`} onClick={() => toggleLogFilterType('event')} type="button">{text.filterEvent}</button>
          <select
            className="storyteller-day-select"
            onChange={(e) => setLogFilter((prev) => ({ ...prev, dayFilter: e.target.value === 'all' ? 'all' : Number(e.target.value) }))}
            value={logFilter.dayFilter}
          >
            <option value="all">{text.allDays}</option>
            {days.map((d) => <option key={d.id} value={d.day}>Day {d.day}</option>)}
          </select>
          <button className="secondary-button secondary-button--small" onClick={() => setLogFilter((prev) => ({ ...prev, sortAsc: !prev.sortAsc }))} type="button">
            {logFilter.sortAsc ? text.sortAsc : text.sortDesc}
          </button>
        </div>
        <div className="storyteller-side-panel__entries">
          {aggregatedLog.length ? aggregatedLog.map((entry) => (
            <article className={`storyteller-log-entry storyteller-log-entry--${entry.type}`} key={entry.id}>
              <div className="storyteller-history__top">
                <span className="storyteller-log-badge" data-type={entry.type}>
                  {entry.type === 'vote' ? text.filterVote : entry.type === 'skill' ? text.filterSkill : text.filterEvent}
                </span>
                <span>Day {entry.day}</span>
              </div>
              <p>{entry.detail}</p>
            </article>
          )) : <p className="storyteller-panel__hint">—</p>}
        </div>
      </aside>
    </>
  )
}
