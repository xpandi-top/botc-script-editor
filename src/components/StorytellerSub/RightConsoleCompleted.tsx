// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft, FAKE_NAMES, FAKE_NAMES_ZH, uniqueStrings } from './constants'


export function RightConsoleCompleted({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer } = ctx;
  return (
    <>
      {/* Completed Games */}
          <div className="storyteller-console__section" style={{ marginTop: '0.5rem' }}>
            <span className="storyteller-console__label">{text.completedGames}</span>
            <div className="storyteller-history" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {gameRecords.length ? gameRecords.map((r) => (
                <article className="storyteller-history__item" key={r.id}>
                  <div className="storyteller-history__top">
                    <strong>{r.scriptTitle ?? 'BOTC'}</strong>
                    <span>{new Date(r.endedAt).toLocaleString()}</span>
                  </div>
                  {r.winner ? <p>{text.winner}: {r.winner === 'evil' ? text.evil : text.good}</p> : null}
                  <p>{r.days.map((d) => `D${d.day}`).join(', ')}</p>
                </article>
              )) : <p className="storyteller-panel__hint">{text.noCompletedGames}</p>}
            </div>
          </div>
    </>
  )
}
