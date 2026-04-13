// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION } from '../constants'


export function ModalsEndGame({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  return (
    <>
      {/* End Game Modal */}
      {endGameResult ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card storyteller-end-game-modal">
            <h3>{text.endGame}</h3>

            <div className="storyteller-chip-row">
              <span className="storyteller-console__label">{text.winner}:</span>
              <button
                className={`secondary-button${endGameResult.winner === 'evil' ? ' tab-button--active' : ''}`}
                onClick={() => setEndGameResult((c) => c ? { ...c, winner: 'evil' } : c)}
                type="button"
              >{text.evil}</button>
              <button
                className={`secondary-button${endGameResult.winner === 'good' ? ' tab-button--active' : ''}`}
                onClick={() => setEndGameResult((c) => c ? { ...c, winner: 'good' } : c)}
                type="button"
              >{text.good}</button>
            </div>

            <div className="storyteller-history">
              {currentDay.seats.map((s) => (
                <div className="storyteller-history__item" key={s.seat}>
                  <div className="storyteller-history__top">
                    <strong>#{s.seat} {s.name}</strong>
                    <select
                      onChange={(e) => setEndGameResult((c) => c ? { ...c, playerTeams: { ...c.playerTeams, [s.seat]: e.target.value } } : c)}
                      value={endGameResult.playerTeams[s.seat] ?? 'good'}
                    >
                      <option value="good">{text.good}</option>
                      <option value="evil">{text.evil}</option>
                    </select>
                  </div>
                  <input
                    className="storyteller-end-game-modal__note"
                    onChange={(e) => setEndGameResult((c) => c ? { ...c, playerNotes: { ...c.playerNotes, [s.seat]: e.target.value } } : c)}
                    placeholder={text.playerNotes}
                    type="text"
                    value={endGameResult.playerNotes[s.seat] ?? ''}
                  />
                </div>
              ))}
            </div>

            <div className="storyteller-chip-row">
              <button className="secondary-button" onClick={() => setEndGameResult(null)} type="button">{text.cancel}</button>
              <button className="print-button" onClick={confirmEndGame} type="button">{text.confirmEnd}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmation dialog */}
      {dialogState ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card">
            <h3>{dialogTitle}</h3>
            <div className="storyteller-chip-row">
              <button className="secondary-button" onClick={() => setDialogState(null)} type="button">{text.cancel}</button>
              <button className="print-button" onClick={confirmDialog} type="button">{text.confirm}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
