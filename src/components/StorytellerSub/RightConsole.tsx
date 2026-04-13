
// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { CHARACTER_DISTRIBUTION } from './constants' // We'll create a small constants file for the required ones

export function RightConsole({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  
  return (
    <>
{/* ── Right side panel: Console ── */}
      <aside className={`storyteller-side-panel storyteller-side-panel--right${showRightPanel ? ' storyteller-side-panel--open' : ''}`}>
        <section className="storyteller-console storyteller-console-sections">

          {/* ── Section 1: Game ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('game')} type="button">
              <span>{text.gameSection}</span>
              <span>{activeConsoleSections.has('game') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('game') ? (
              <div className="storyteller-console-section__body">
                <label className="editor-field storyteller-script-select">
                  <span>{text.script}</span>
                  <select onChange={(e) => onSelectScript?.(e.target.value)} value={activeScriptSlug ?? scriptOptions[0]?.slug ?? ''}>
                    {scriptOptions.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                  </select>
                </label>
                <div className="storyteller-chip-row">
                  <button className="secondary-button" onClick={() => setDialogState({ kind: 'restartGame' })} type="button">{text.restartGame}</button>
                  <button className="secondary-button" onClick={exportGameJson} type="button">{text.exportJson}</button>
                </div>
              </div>
            ) : null}
          </div>

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

          {/* ── Section 3: Player ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('player')} type="button">
              <span>{text.playerSection}</span>
              <span>{activeConsoleSections.has('player') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('player') ? (
              <div className="storyteller-console-section__body">
                {/* Player count info + edit button */}
                <div className="storyteller-chip-row" style={{ alignItems: 'center' }}>
                  <span className="storyteller-compact-count">
                    <strong>{aliveCount}/{totalCount}</strong>
                    {currentDay.seats.filter((s) => s.isTraveler).length > 0 ? (
                      <span>+{currentDay.seats.filter((s) => s.isTraveler).length}{text.travelersCount}</span>
                    ) : null}
                  </span>
                  <button className="secondary-button secondary-button--small" onClick={() => setShowEditPlayersModal(true)} type="button">{text.editPlayers}</button>
                </div>

                {/* Player name pool */}
                <div className="storyteller-console__section">
                  <span className="storyteller-console__label">{text.playerPool}</span>
                  <div className="storyteller-player-pool">
                    {playerNamePool.map((name, i) => {
                      const isUsed = currentDay.seats.some((s) => s.name === name)
                      return (
                        <span
                          className={`storyteller-player-pool__chip${isUsed ? ' storyteller-player-pool__chip--used' : ''}`}
                          key={`${name}-${i}`}
                          onClick={() => {
                            const seat = currentDay.seats.find((s) => s.name.startsWith('Player '))
                            if (seat) updateSeat(seat.seat, (s) => ({ ...s, name }))
                          }}
                          title={text.assignName}
                        >{name}</span>
                      )
                    })}
                  </div>
                  <div className="storyteller-chip-row">
                    <button className="secondary-button secondary-button--small" onClick={() => setPlayerNamePool(language === 'zh' ? [...FAKE_NAMES_ZH] : [...FAKE_NAMES])} type="button">{text.loadFakeNames}</button>
                    <button className="secondary-button secondary-button--small" onClick={resetSeatNames} type="button">{text.resetNames}</button>
                    <button className="secondary-button secondary-button--small" onClick={() => setPlayerNamePool([])} type="button">{text.clear}</button>
                  </div>
                </div>

                {/* Selected player editor */}
                {selectedSeat ? (
                  <div className="storyteller-console__section">
                    <div className="storyteller-seat-editor">
                      <div className="storyteller-seat-editor__section">
                        <strong>{text.selectedPlayer}</strong>
                        <span>#{selectedSeat.seat} {selectedSeat.name}</span>
                      </div>
                      <div className="storyteller-seat-editor__section">
                        <div className="storyteller-chip-row">
                          <button className={`secondary-button secondary-button--small${!selectedSeat.alive ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, alive: !s.alive }))} type="button">{text.aliveTag}</button>
                          <button className={`secondary-button secondary-button--small${selectedSeat.isExecuted ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, isExecuted: !s.isExecuted }))} type="button">{text.executedTag}</button>
                          <button className={`secondary-button secondary-button--small${selectedSeat.isTraveler ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, isTraveler: !s.isTraveler }))} type="button">{text.traveler}</button>
                          <button className={`secondary-button secondary-button--small${selectedSeat.hasNoVote ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, hasNoVote: !s.hasNoVote }))} type="button">{text.noVoteTag}</button>
                        </div>
                      </div>
                      {selectedSeatTags.length ? (
                        <div className="storyteller-chip-row">
                          {selectedSeatTags.map((tag) => <span className="storyteller-seat__pill" key={`${selectedSeat.seat}-${tag}`}>{tag}</span>)}
                        </div>
                      ) : null}
                      <div className="storyteller-seat-editor__section">
                        <label className="editor-field">
                          <span>{text.addTag}</span>
                          <div className="storyteller-seat-editor__add">
                            <input onChange={(e) => setSeatTagDrafts((c) => ({ ...c, [selectedSeat.seat]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(selectedSeat.seat) } }} placeholder={text.addTag} type="text" value={seatTagDrafts[selectedSeat.seat] ?? ''} />
                            <button className="secondary-button secondary-button--small" onClick={() => addCustomTag(selectedSeat.seat)} type="button">+</button>
                          </div>
                        </label>
                        {customTagPool.length ? (
                          <>
                            <div className="storyteller-console__pool-header">
                              <span className="storyteller-console__label">{text.tagPool}</span>
                              <button className="secondary-button secondary-button--small" onClick={clearUnusedCustomTags} type="button">{text.clearUnusedTags}</button>
                            </div>
                            <div className="storyteller-chip-row">
                              {customTagPool.map((tag) => (
                                <button className={`secondary-button secondary-button--small${selectedSeat.customTags.includes(tag) ? ' tab-button--active' : ''}`} key={`pool-${tag}`} onClick={() => updateSeatWithLog(selectedSeat.seat, (s) => ({ ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v) => v !== tag) : [...s.customTags, tag] }))} type="button">{tag}</button>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

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

          {/* ── Section 5: Tags ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('tags')} type="button">
              <span>{text.tagSettings}</span>
              <span>{activeConsoleSections.has('tags') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('tags') ? (
              <div className="storyteller-console-section__body">
                {/* Default tags */}
                <div className="storyteller-console__section">
                  <span className="storyteller-console__label">{text.defaultTags}</span>
                  <div className="storyteller-chip-row">
                    {(language === 'zh'
                      ? ['死亡', '处决', '中毒', '醉酒', '保护', '被提名']
                      : ['Dead', 'Executed', 'Poisoned', 'Drunk', 'Protected', 'Nominated']
                    ).map((tag) => (
                      <span className="storyteller-seat__pill" key={`default-${tag}`}>{tag}</span>
                    ))}
                  </div>
                </div>
                {/* Load predefined tags */}
                <div className="storyteller-console__section">
                  <span className="storyteller-console__label">{text.loadPredefinedTags}</span>
                  <div className="storyteller-seat-editor__add">
                    <textarea
                      className="storyteller-preset-textarea"
                      onChange={(e) => setLoadTagsPreset(e.target.value)}
                      placeholder={language === 'zh' ? '逗号分隔标签...' : 'Comma-separated tags...'}
                      rows={2}
                      value={loadTagsPreset}
                    />
                    <button
                      className="secondary-button secondary-button--small"
                      onClick={() => {
                        const tags = loadTagsPreset.split(',').map((t) => t.trim()).filter(Boolean)
                        setCustomTagPool((cur) => uniqueStrings([...cur, ...tags]))
                        setLoadTagsPreset('')
                      }}
                      type="button"
                    >{text.loadPreset}</button>
                  </div>
                </div>
                {/* Current custom tag pool */}
                <div className="storyteller-console__section">
                  <div className="storyteller-console__pool-header">
                    <span className="storyteller-console__label">{text.tagPool}</span>
                    <button className="secondary-button secondary-button--small" onClick={clearUnusedCustomTags} type="button">{text.clearUnusedTags}</button>
                  </div>
                  <div className="storyteller-chip-row">
                    {customTagPool.map((tag) => (
                      <span className="storyteller-tag-pool-item" key={`tagpool-${tag}`}>
                        <span>{tag}</span>
                        <button
                          className="storyteller-tag-pool-item__remove"
                          onClick={() => setCustomTagPool((cur) => cur.filter((t) => t !== tag))}
                          type="button"
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

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
        </section>
      </aside>
    </>
  )
}
