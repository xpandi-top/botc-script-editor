// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { CHARACTER_DISTRIBUTION } from './constants'


export function ModalsEditPlayers({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  return (
    <>
      {/* Edit Players Modal */}
      {showEditPlayersModal ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true" onClick={() => setShowEditPlayersModal(false)}>
          <div className="storyteller-modal__card storyteller-edit-players-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{text.editPlayers}</h3>

            {/* Preset loader */}
            <div className="editor-field">
              <span>{language === 'zh' ? '批量加载（逗号分隔）' : 'Batch load (comma-separated)'}</span>
              <div className="storyteller-seat-editor__add">
                <textarea
                  className="storyteller-preset-textarea"
                  onChange={(e) => setEditPlayersPreset(e.target.value)}
                  placeholder={language === 'zh' ? '张三, 李四, 王五...' : 'Alice, Bob, Charlie...'}
                  rows={2}
                  value={editPlayersPreset}
                />
                <button
                  className="secondary-button secondary-button--small"
                  onClick={() => {
                    const names = editPlayersPreset.split(',').map((n) => n.trim()).filter(Boolean)
                    updateCurrentDay((d) => {
                      const newSeats = d.seats.map((s, i) => names[i] ? { ...s, name: names[i] } : s)
                      return { ...d, seats: newSeats }
                    })
                    setPlayerNamePool((cur) => uniqueStrings([...cur, ...names.filter((n) => !n.match(/^Player \d+$/) && !n.match(/^Traveler \d+$/))]))
                    setEditPlayersPreset('')
                  }}
                  type="button"
                >{text.loadPreset}</button>
              </div>
            </div>

            {/* Player count control */}
            <div className="storyteller-edit-players__count-row">
              <span>{language === 'zh' ? '玩家人数（不含旅人）' : 'Players (excl. travelers)'}</span>
              <div className="storyteller-center__day-nav">
                <button className="storyteller-center__ctrl-btn" onClick={removeLastPlayerSeat} type="button" disabled={currentDay.seats.filter((s) => !s.isTraveler).length <= 5}>−</button>
                <strong style={{ minWidth: '2rem', textAlign: 'center' }}>{currentDay.seats.filter((s) => !s.isTraveler).length}</strong>
                <button className="storyteller-center__ctrl-btn" onClick={addPlayerSeat} type="button" disabled={currentDay.seats.filter((s) => !s.isTraveler).length >= 15}>+</button>
              </div>
            </div>

            {/* Regular seat rows */}
            <div className="storyteller-new-game-seats">
              {currentDay.seats.filter((s) => !s.isTraveler).map((seat) => (
                <div className="storyteller-new-game-seats__row" key={seat.seat}>
                  <span>#{seat.seat}</span>
                  <input
                    list="name-pool-list"
                    onChange={(e) => updateSeat(seat.seat, (s) => ({ ...s, name: e.target.value }))}
                    onBlur={(e) => {
                      const val = e.target.value.trim()
                      if (val && !val.match(/^Player \d+$/) && !playerNamePool.includes(val)) {
                        setPlayerNamePool((cur) => [...cur, val])
                      }
                    }}
                    placeholder={`Player ${seat.seat}`}
                    type="text"
                    value={seat.name}
                  />
                </div>
              ))}
            </div>

            {/* Traveler count control */}
            <div className="storyteller-edit-players__count-row" style={{ marginTop: '0.75rem' }}>
              <span>{language === 'zh' ? '旅人人数' : 'Travelers'}</span>
              <div className="storyteller-center__day-nav">
                <button className="storyteller-center__ctrl-btn" onClick={removeLastTraveler} type="button" disabled={currentDay.seats.filter((s) => s.isTraveler).length === 0}>−</button>
                <strong style={{ minWidth: '2rem', textAlign: 'center' }}>{currentDay.seats.filter((s) => s.isTraveler).length}</strong>
                <button className="storyteller-center__ctrl-btn" onClick={addTravelerSeat} type="button">+</button>
              </div>
            </div>

            {/* Traveler rows */}
            {currentDay.seats.filter((s) => s.isTraveler).length > 0 ? (
              <div className="storyteller-new-game-seats">
                {currentDay.seats.filter((s) => s.isTraveler).map((seat) => (
                  <div className="storyteller-new-game-seats__row" key={seat.seat}>
                    <span>✈ #{seat.seat}</span>
                    <input
                      list="name-pool-list"
                      onChange={(e) => updateSeat(seat.seat, (s) => ({ ...s, name: e.target.value }))}
                      placeholder={`Traveler ${seat.seat}`}
                      type="text"
                      value={seat.name}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <datalist id="name-pool-list">
              {playerNamePool.map((name) => <option key={name} value={name} />)}
            </datalist>

            <div className="storyteller-chip-row" style={{ marginTop: '0.75rem' }}>
              <button className="secondary-button" onClick={resetSeatNames} type="button">{text.resetNames}</button>
              <button className="print-button" onClick={() => setShowEditPlayersModal(false)} type="button">{language === 'zh' ? '完成' : 'Done'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
