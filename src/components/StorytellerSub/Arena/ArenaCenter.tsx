// @ts-nocheck
import React from 'react'
import { ArenaCenterLeft } from './ArenaCenterLeft'
import { ArenaCenterRight } from './ArenaCenterRight'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'

export function ArenaCenter({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  return (
    <>
      <section className={`storyteller-center${ctx.showNominationSheet && ctx.currentDay.phase === 'nomination' ? ' storyteller-center--sheet-open' : ''}`}>
        <ArenaCenterLeft ctx={ctx} />
        <ArenaCenterRight ctx={ctx} />
        <ArenaCenterNominationSheet ctx={ctx} />
      </section>
    </>
  )
}
