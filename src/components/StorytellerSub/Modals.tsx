
// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { CHARACTER_DISTRIBUTION } from './constants' // We'll create a small constants file for the required ones

export function Modals({ ctx }: { ctx: any }) {
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

      {/* New Game Modal */}
      {newGamePanel ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card storyteller-new-game-modal">
            <h3>{text.startNewGame}</h3>

            <label className="editor-field">
              <span>{text.playerCount}</span>
              <input max="15" min="5" onChange={(e) => {
                const count = Number(e.target.value)
                setNewGamePanel((c) => {
                  if (!c) return c
                  // Keep existing seat names, remove ones beyond new count
                  const seatNames: Record<number, string> = {}
                  for (let i = 1; i <= count; i++) {
                    if (c.seatNames[i]) seatNames[i] = c.seatNames[i]
                  }
                  return { ...c, playerCount: count, assignments: [], seatNames }
                })
              }} type="range" value={newGamePanel.playerCount} />
              <strong>{newGamePanel.playerCount}</strong>
            </label>

            <label className="editor-field storyteller-script-select">
              <span>{text.script}</span>
              <select onChange={(e) => setNewGamePanel((c) => c ? { ...c, scriptSlug: e.target.value, assignments: [] } : c)} value={newGamePanel.scriptSlug}>
                {scriptOptions.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
              </select>
            </label>

            {/* Seat name assignment */}
            {playerNamePool.length > 0 ? (
              <div className="storyteller-console__section">
                <span className="storyteller-console__label">{text.seatAssignment}</span>
                <p className="storyteller-panel__hint" style={{ margin: '0 0 0.4rem' }}>{text.clickToAssign}</p>
                <div className="storyteller-player-pool">
                  {playerNamePool.map((name, i) => {
                    const assignedSeat = Object.entries(newGamePanel.seatNames).find(([, n]) => n === name)?.[0]
                    return (
                      <span
                        className={`storyteller-player-pool__chip${assignedSeat ? ' storyteller-player-pool__chip--used' : ''}`}
                        key={`${name}-${i}`}
                        onClick={() => {
                          if (assignedSeat) {
                            // Remove from seat
                            setNewGamePanel((c) => {
                              if (!c) return c
                              const seatNames = { ...c.seatNames }
                              delete seatNames[Number(assignedSeat)]
                              return { ...c, seatNames }
                            })
                          } else {
                            // Assign to first empty seat
                            setNewGamePanel((c) => {
                              if (!c) return c
                              const seatNames = { ...c.seatNames }
                              for (let s = 1; s <= c.playerCount; s++) {
                                if (!seatNames[s]) { seatNames[s] = name; break }
                              }
                              return { ...c, seatNames }
                            })
                          }
                        }}
                        title={assignedSeat ? `#${assignedSeat} — ${text.removeFromSeat}` : text.assignName}
                      >{name}{assignedSeat ? ` (#${assignedSeat})` : ''}</span>
                    )
                  })}
                </div>
                <div className="storyteller-new-game-seats">
                  {Array.from({ length: newGamePanel.playerCount }, (_, i) => i + 1).map((seatNum) => (
                    <div className="storyteller-new-game-seats__row" key={seatNum}>
                      <span>#{seatNum}</span>
                      <input
                        onChange={(e) => setNewGamePanel((c) => c ? { ...c, seatNames: { ...c.seatNames, [seatNum]: e.target.value } } : c)}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (val && !val.match(/^Player \d+$/) && !playerNamePool.includes(val)) {
                            setPlayerNamePool((cur) => [...cur, val])
                          }
                        }}
                        placeholder={`Player ${seatNum}`}
                        type="text"
                        value={newGamePanel.seatNames[seatNum] ?? ''}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Distribution table */}
            {CHARACTER_DISTRIBUTION[newGamePanel.playerCount] ? (
              <div className="storyteller-distribution-grid">
                <span className="storyteller-console__label">{text.distribution}</span>
                <div className="storyteller-distribution-grid__row">
                  <span>{text.townsfolk}: <strong>{CHARACTER_DISTRIBUTION[newGamePanel.playerCount].townsfolk}</strong></span>
                  <span>{text.outsider}: <strong>{CHARACTER_DISTRIBUTION[newGamePanel.playerCount].outsider}</strong></span>
                  <span>{text.minion}: <strong>{CHARACTER_DISTRIBUTION[newGamePanel.playerCount].minion}</strong></span>
                  <span>{text.demon}: <strong>{CHARACTER_DISTRIBUTION[newGamePanel.playerCount].demon}</strong></span>
                </div>
              </div>
            ) : null}

            {/* Random assign checkbox */}
            <div className="storyteller-chip-row">
              <button
                className={`secondary-button${newGamePanel.randomAssign ? ' tab-button--active' : ''}`}
                onClick={() => {
                  setNewGamePanel((c) => {
                    if (!c) return c
                    if (!c.randomAssign) {
                      const assigns = randomAssignCharacters(c)
                      return { ...c, randomAssign: true, assignments: assigns }
                    }
                    return { ...c, randomAssign: false, assignments: [] }
                  })
                }}
                type="button"
              >{text.randomAssign}</button>
              {newGamePanel.randomAssign ? (
                <button
                  className="secondary-button"
                  onClick={() => setNewGamePanel((c) => c ? { ...c, showAssignments: !c.showAssignments } : c)}
                  type="button"
                >{newGamePanel.showAssignments ? text.hideAssign : text.showAssign}</button>
              ) : null}
            </div>

            {/* Assignments display */}
            {newGamePanel.randomAssign && newGamePanel.showAssignments && newGamePanel.assignments.length ? (
              <div className="storyteller-history">
                {newGamePanel.assignments.map((a) => {
                  const charName = a.characterId ? getDisplayName(a.characterId, language) : '—'
                  return (
                    <div className="storyteller-history__item" key={a.seat}>
                      <div className="storyteller-history__top">
                        <strong>#{a.seat}</strong>
                        <span>{charName} ({a.team})</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}

            <div className="storyteller-chip-row">
              <button className="secondary-button" onClick={() => setNewGamePanel(null)} type="button">{text.cancelNewGame}</button>
              <button className="print-button" onClick={startNewGame} type="button">{text.startNewGame}</button>
            </div>
          </div>
        </div>
      ) : null}

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
