
// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../catalog'
import { CHARACTER_DISTRIBUTION } from './constants' // We'll create a small constants file for the required ones

export function Arena({ ctx }: { ctx: any }) {
  const { activeScriptSlug, activeScriptTitle, language, onSelectScript, scriptOptions, days, setDays, selectedDayId, setSelectedDayId, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool, gameRecords, setGameRecords, playerNamePool, setPlayerNamePool, pickerMode, setPickerMode, isTimerRunning, setIsTimerRunning, dialogState, setDialogState, seatTagDrafts, setSeatTagDrafts, selectedSeatNumber, setSelectedSeatNumber, showLogPanel, setShowLogPanel, showRightPanel, setShowRightPanel, skillOverlay, setSkillOverlay, audioTracks, setAudioTracks, selectedAudioSrc, setSelectedAudioSrc, audioPlaying, setAudioPlaying, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, logFilter, setLogFilter, activeConsoleSections, setActiveConsoleSections, tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, skillRoleDropdownOpen, setSkillRoleDropdownOpen, showNominationSheet, setShowNominationSheet, showEditPlayersModal, setShowEditPlayersModal, editPlayersPreset, setEditPlayersPreset, loadTagsPreset, setLoadTagsPreset, lastCountdownRef, audioRef, text, selectedDayIndex, currentDay, updateCurrentDay, currentTimerSeconds, currentScriptCharacters, livingNonTravelerSeats, requiredVotes, eligibleVoterSeats, nonVoters, draftPassedBySystem, draftPassed, isVotingComplete, currentVoterSeat, pointerSeat, selectedSeat, selectedSeatTags, dialogTitle, aliveCount, totalCount, highestVoteThisDay, nominatorsThisDay, nomineesThisDay, leadingCandidates, nominationDelaySeconds, secondsUntilNomination, canNominate, aggregatedLog, getPhaseContext, setCurrentTimer, syncDayTimers, appendEvent, handleLocalFileChange, resetSeatNames, updateSeat, updateSeatWithLog, addCustomTag, clearUnusedCustomTags, enterNomination, confirmNomination, rejectNomination, confirmTargetSpeech, startVoting, handleVoteYes, recordVote, openSkillOverlay, openSeatSkill, closeSkillOverlay, moveToNextSpeaker, goToNextDay, goToPreviousDay, saveCurrentGame, resetCurrentGame, confirmDialog, handleSeatClick, removeSeatTag, setPhase, startNight, stopNight, addPlayerSeat, removeLastPlayerSeat, addTravelerSeat, removeLastTraveler, openNewGamePanel, randomAssignCharacters, startNewGame, openEndGamePanel, confirmEndGame, exportGameJson, toggleLogFilterType, votingYesCount, NIGHT_BGM_SRC, hasTimer, toggleConsoleSection } = ctx;
  
  return (
    <>
{/* ── Arena: round table + quick strip ── */}
        <div className="storyteller-arena">

          {/* Round table */}
          <div className="storyteller-table-card">
            <div className="storyteller-table" onClick={() => { setSelectedSeatNumber(null); if (pickerMode === 'none') setPickerMode('none'); setTagPopoutSeat(null) }} role="presentation">
              <div className="storyteller-table__ring" />
              {pointerSeat ? (
                <div className="storyteller-table__hand" style={{ '--pointer-angle': `${((pointerSeat - 1) / currentDay.seats.length) * 360 - 90}deg` } as CSSProperties} />
              ) : null}

              {/* ── Center ── */}
              <section className={`storyteller-center${showNominationSheet && currentDay.phase === 'nomination' ? ' storyteller-center--sheet-open' : ''}`}>
                {/* Left: Stage / Timer */}
                <div className="storyteller-center__left">
                  {/* Phase tabs */}
                  <div className="storyteller-center__phase-tabs">
                    {(['night', 'private', 'public', 'nomination'] as Phase[]).map((p) => (
                      <button
                        className={`storyteller-center__phase-btn${currentDay.phase === p ? ' storyteller-center__phase-btn--active' : ''}`}
                        key={p}
                        onClick={(e) => { e.stopPropagation(); setPhase(p) }}
                        type="button"
                      >
                        {p === 'night' ? text.nightPhase : p === 'private' ? text.privateChat : p === 'public' ? text.publicChat : text.nomination}
                      </button>
                    ))}
                  </div>
                  {/* Public mode select */}
                  {currentDay.phase === 'public' ? (
                    <select
                      className="storyteller-center__mode-select"
                      onChange={(e) => updateCurrentDay((d) => ({ ...d, publicMode: e.target.value as PublicMode }))}
                      value={currentDay.publicMode}
                    >
                      <option value="free">{text.freeSpeech}</option>
                      <option value="roundRobin">{text.roundRobinMode}</option>
                    </select>
                  ) : null}

                  {/* Timer */}
                  {hasTimer ? (
                    <input
                      aria-label="Current timer"
                      className="storyteller-center__timer-input"
                      onChange={(e) => {
                        const val = e.target.value
                        if (val.includes(':')) {
                          const [mPart, sPart] = val.split(':')
                          setCurrentTimer((parseInt(mPart, 10) || 0) * 60 + (parseInt(sPart, 10) || 0))
                        } else {
                          const n = parseInt(val, 10)
                          if (!isNaN(n)) setCurrentTimer(n)
                        }
                      }}
                      type="text"
                      inputMode="numeric"
                      value={`${String(Math.floor(currentTimerSeconds / 60)).padStart(2, '0')}:${String(currentTimerSeconds % 60).padStart(2, '0')}`}
                    />
                  ) : null}

                  {/* Timer controls */}
                  {hasTimer ? (
                    <div className="storyteller-center__timer-controls">
                      <button
                        className={`storyteller-center__ctrl-btn${isTimerRunning ? ' storyteller-center__ctrl-btn--active' : ''}`}
                        onClick={() => setIsTimerRunning((c) => !c)}
                        title={text.start}
                        type="button"
                      >
                        {isTimerRunning ? '⏸' : '▶'}
                      </button>
                      <button className="storyteller-center__ctrl-btn" onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }} title={text.resetTimer} type="button">↺</button>
                      <button className="storyteller-center__ctrl-btn" onClick={() => setCurrentTimer(0)} title={text.endNow} type="button">■</button>
                    </div>
                  ) : null}

                  {/* Night phase BGM controls */}
                  {currentDay.phase === 'night' ? (
                    <div className="storyteller-center__timer-controls">
                      <button
                        className={`storyteller-center__ctrl-btn${audioPlaying ? ' storyteller-center__ctrl-btn--active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); audioPlaying ? setAudioPlaying(false) : startNight() }}
                        title={audioPlaying ? text.pause : text.play}
                        type="button"
                      >
                        {audioPlaying ? '⏸' : '▶'}
                      </button>
                      <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); stopNight() }} title={text.endNow} type="button">■</button>
                    </div>
                  ) : null}

                  {/* RoundRobin speaker */}
                  {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' ? (
                    <p className="storyteller-center__speaker">#{currentDay.currentSpeakerSeat ?? '—'}</p>
                  ) : null}

                  {/* RoundRobin speaker nav */}
                  {currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' ? (
                    <div className="storyteller-center__speaker-nav">
                      <button className="secondary-button secondary-button--small" onClick={() => setPickerMode('speaker')} type="button">{text.chooseSpeaker}</button>
                      <button className="secondary-button secondary-button--small" onClick={() => {
                        const all = currentDay.seats.map((s) => s.seat)
                        const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
                        updateCurrentDay((d) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
                      }} type="button">{text.randomSpeaker}</button>
                      <button className="secondary-button secondary-button--small" onClick={moveToNextSpeaker} type="button">{text.nextSpeaker}</button>
                    </div>
                  ) : null}

                  {/* Public: nomination button */}
                  {currentDay.phase === 'public' && currentDay.publicMode === 'free' ? (
                    canNominate ? (
                      <button className="print-button storyteller-start-vote" onClick={enterNomination} type="button">{text.startNomination}</button>
                    ) : (
                      <p className="storyteller-center__status storyteller-center__status--muted">
                        {text.nominationGate}: {Math.ceil(secondsUntilNomination / 60)}:{String(secondsUntilNomination % 60).padStart(2, '0')}
                      </p>
                    )
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'nominationDecision' ? (
                    <div className="storyteller-center__timer-controls">
                      <button className="print-button" onClick={confirmNomination} type="button">{language === 'zh' ? '提名者计时' : 'Nominator Countdown'}</button>
                    </div>
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'readyForTargetSpeech' ? (
                    <div className="storyteller-center__timer-controls">
                      <button className="print-button" onClick={confirmTargetSpeech} type="button">{language === 'zh' ? '被提名者计时' : 'Nominee Countdown'}</button>
                    </div>
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'readyToVote' ? (
                    <div className="storyteller-center__timer-controls">
                      <button className="print-button" onClick={startVoting} type="button">{language === 'zh' ? '开始投票计时' : 'Start Vote'}</button>
                    </div>
                  ) : null}

                  {/* Nominate button + Next Day (nomination phase) */}
                  {currentDay.phase === 'nomination' ? (
                    <div className="storyteller-center__nominate-row">
                      <button
                        className={`print-button storyteller-start-vote${showNominationSheet ? ' tab-button--active' : ''}`}
                        onClick={() => setShowNominationSheet((v) => !v)}
                        type="button"
                      >{language === 'zh' ? '提名' : 'Nominate'}</button>
                      <button
                        className="secondary-button storyteller-center__next-day-btn"
                        onClick={(e) => { e.stopPropagation(); goToNextDay() }}
                        type="button"
                      >{language === 'zh' ? '下一天' : 'Next Day'}</button>
                    </div>
                  ) : null}
                </div>

                {/* Right: Day info */}
                <div className="storyteller-center__right">
                  {/* Day navigation */}
                  <div className="storyteller-center__day-nav">
                    <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); goToPreviousDay() }} type="button">◀</button>
                    <select className="storyteller-center__mode-select" onChange={(e) => setSelectedDayId(e.target.value)} value={currentDay.id}>
                      {days.map((d) => <option key={d.id} value={d.id}>Day {d.day}</option>)}
                    </select>
                    <button className="storyteller-center__ctrl-btn" onClick={(e) => { e.stopPropagation(); goToNextDay() }} type="button">▶</button>
                  </div>

                  <div className="storyteller-center__game-stats">
                    <span>{text.aliveCount}: <strong>{aliveCount}/{totalCount}</strong></span>
                    <span>{text.requiredVotes}: <strong>{requiredVotes}</strong></span>
                  </div>

                  {/* Leading candidate(s) */}
                  {leadingCandidates.length > 0 ? (
                    <div className="storyteller-center__leading">
                      <span className="storyteller-center__leading-label">{text.leadingCandidate}</span>
                      {leadingCandidates.map((c) => (
                        <div className="storyteller-center__leading-row" key={c.seat}>
                          <span className="storyteller-center__leading-name">#{c.seat} {c.name}</span>
                          <span className="storyteller-center__leading-votes">{c.votes}<small>/{requiredVotes}</small></span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Nomination status */}
                  {currentDay.phase === 'nomination' && currentDay.nominationStep === 'waitingForNomination' ? (
                    <p className="storyteller-center__status">
                      {currentDay.voteDraft.actor ? `${text.actor}: #${currentDay.voteDraft.actor} → ${text.pickNominee}` : text.waitingForNomination}
                    </p>
                  ) : null}

                  {currentDay.phase === 'nomination' && currentDay.nominationStep !== 'waitingForNomination' ? (
                    <div className="storyteller-center__vote-mini">
                      <span>#{currentDay.voteDraft.actor ?? '?'} → #{currentDay.voteDraft.target ?? '?'}</span>
                      <span className="storyteller-center__vote-count">
                        {currentDay.votingState ? Object.values(currentDay.votingState.votes).filter(Boolean).length : currentDay.voteDraft.voters.length}
                        <small>/{requiredVotes}</small>
                      </span>
                      {isVotingComplete ? (
                        <span className={draftPassed ? 'storyteller-pass' : 'storyteller-fail'}>
                          {draftPassed ? text.pass : text.fail}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Today's nominations summary */}
                  {nominatorsThisDay.length > 0 ? (
                    <div className="storyteller-center__summary">
                      <span>{text.todayNominators}: {nominatorsThisDay.map((s) => `#${s}`).join(', ')}</span>
                      <span>{text.todayNominees}: {nomineesThisDay.map((s) => `#${s}`).join(', ')}</span>
                    </div>
                  ) : null}
                </div>

                {/* ── Nomination sheet ── */}
                {showNominationSheet && currentDay.phase === 'nomination' ? (
                  <div className="storyteller-nomination-sheet" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="storyteller-nomination-sheet__header">
                      <span className="storyteller-nomination-sheet__title">{language === 'zh' ? '提名' : 'Nominate'}</span>
                      <button className="secondary-button secondary-button--small" onClick={() => { setShowNominationSheet(false); setPickerMode('none') }} type="button">{language === 'zh' ? '隐藏' : 'Hide'}</button>
                    </div>

                    <div className="storyteller-nomination-sheet__body">
                      {/* Left: inputs */}
                      <div className="storyteller-nomination-sheet__inputs">
                        {/* Nominator */}
                        <div className="storyteller-nomination-sheet__row">
                          <span className="storyteller-nomination-sheet__label">{text.actor}</span>
                          <select
                            className="storyteller-nomination-sheet__select"
                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: v } })); setPickerMode('nominee') } else { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: null } })) } }}
                            value={currentDay.voteDraft.actor ?? ''}
                          >
                            <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                            {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                          </select>
                          <button
                            className={`storyteller-nomination-sheet__pick-btn${pickerMode === 'nominator' ? ' storyteller-picker-active' : ''}`}
                            onClick={() => setPickerMode(pickerMode === 'nominator' ? 'none' : 'nominator')}
                            type="button"
                          >⊕</button>
                        </div>

                        {/* Nominee */}
                        <div className="storyteller-nomination-sheet__row">
                          <span className="storyteller-nomination-sheet__label">{text.target}</span>
                          <select
                            className="storyteller-nomination-sheet__select"
                            onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) updateCurrentDay((d) => ({ ...d, nominationStep: 'nominationDecision', voteDraft: { ...d.voteDraft, target: v, voters: [] } })); else updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, target: null } })) }}
                            value={currentDay.voteDraft.target ?? ''}
                          >
                            <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                            {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                          </select>
                          <button
                            className={`storyteller-nomination-sheet__pick-btn${pickerMode === 'nominee' ? ' storyteller-picker-active' : ''}`}
                            onClick={() => setPickerMode(pickerMode === 'nominee' ? 'none' : 'nominee')}
                            type="button"
                          >⊕</button>
                        </div>

                        {/* Nomination result */}
                        <div className="storyteller-nomination-sheet__row">
                          <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '结果' : 'Result'}</span>
                          <select
                            className={`storyteller-nomination-sheet__select storyteller-nomination-sheet__select--result${currentDay.voteDraft.nominationResult === 'fail' ? ' storyteller-nomination-sheet__select--fail' : ' storyteller-nomination-sheet__select--succeed'}`}
                            onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, nominationResult: e.target.value as 'succeed' | 'fail' } }))}
                            value={currentDay.voteDraft.nominationResult}
                          >
                            <option value="succeed">{language === 'zh' ? '✓ 提名成功' : '✓ Succeed'}</option>
                            <option value="fail">{language === 'zh' ? '✗ 提名失败' : '✗ Failed'}</option>
                          </select>
                        </div>

                        {pickerMode === 'nominator' || pickerMode === 'nominee' ? (
                          <p className="storyteller-nomination-sheet__hint">{language === 'zh' ? '← 点击圆桌上的座位进行选择' : '← Click a seat on the table to select'}</p>
                        ) : null}

                        {/* Vote override: seat checkboxes */}
                        {currentDay.nominationStep !== 'waitingForNomination' && currentDay.voteDraft.nominationResult === 'succeed' ? (
                          <div className="storyteller-nomination-sheet__votes">
                            <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '投票' : 'Votes'} ({language === 'zh' ? '手动覆盖' : 'override'})</span>
                            <div className="storyteller-nomination-sheet__vote-grid">
                              {currentDay.seats.map((s) => {
                                const voted = currentDay.votingState?.votes[s.seat]
                                const isChecked = voted === true || currentDay.voteDraft.voters.includes(s.seat)
                                return (
                                  <label className="storyteller-nomination-sheet__vote-check" key={s.seat}>
                                    <input
                                      checked={isChecked}
                                      onChange={() => {
                                        if (currentDay.votingState) {
                                          updateCurrentDay((d) => ({
                                            ...d,
                                            votingState: d.votingState ? {
                                              ...d.votingState,
                                              votes: { ...d.votingState.votes, [s.seat]: !isChecked },
                                            } : null,
                                          }))
                                        } else {
                                          updateCurrentDay((d) => ({
                                            ...d,
                                            voteDraft: {
                                              ...d.voteDraft,
                                              voters: isChecked ? d.voteDraft.voters.filter((v) => v !== s.seat) : [...d.voteDraft.voters, s.seat],
                                            },
                                          }))
                                        }
                                      }}
                                      type="checkbox"
                                    />
                                    <span>#{s.seat}</span>
                                  </label>
                                )
                              })}
                            </div>
                            <span className="storyteller-nomination-sheet__vote-count">
                              {language === 'zh' ? '同意' : 'Yes'}: <strong>{Object.values(currentDay.votingState?.votes ?? {}).filter(Boolean).length || currentDay.voteDraft.voters.length}</strong> / {requiredVotes}
                            </span>
                          </div>
                        ) : null}

                        {/* Note */}
                        <label className="storyteller-nomination-sheet__row storyteller-nomination-sheet__row--note">
                          <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '备注' : 'Note'}</span>
                          <input
                            className="storyteller-nomination-sheet__note-input"
                            onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))}
                            placeholder={language === 'zh' ? '可选备注…' : 'Optional note…'}
                            type="text"
                            value={currentDay.voteDraft.note}
                          />
                        </label>

                        {/* Agree / Disagree */}
                        {isVotingComplete && currentDay.voteDraft.nominationResult === 'succeed' ? (
                          <div className="storyteller-chip-row">
                            <button className="print-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: true, systemValue: draftPassedBySystem })} type="button">✓ {language === 'zh' ? '同意' : 'Agree'}</button>
                            <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: false, systemValue: draftPassedBySystem })} type="button">✗ {language === 'zh' ? '不同意' : 'Disagree'}</button>
                          </div>
                        ) : null}

                        {/* Record + Clear */}
                        <div className="storyteller-chip-row">
                          <button
                            className="print-button"
                            disabled={!currentDay.voteDraft.actor || !currentDay.voteDraft.target}
                            onClick={() => currentDay.voteDraft.nominationResult === 'fail' ? rejectNomination() : recordVote()}
                            type="button"
                          >{language === 'zh' ? '记录' : 'Record'}</button>
                          <button className="secondary-button secondary-button--small" onClick={() => { updateCurrentDay((d) => ({ ...d, nominationStep: 'waitingForNomination', voteDraft: createDefaultVoteDraft(), votingState: null })); setPickerMode('none') }} type="button">{text.clear}</button>
                        </div>
                      </div>

                      {/* Right: today's nomination history */}
                      <div className="storyteller-nomination-sheet__history">
                        <span className="storyteller-nomination-sheet__history-title">{language === 'zh' ? '今日提名记录' : "Today's Nominations"}</span>
                        {currentDay.voteHistory.length === 0 ? (
                          <p className="storyteller-nomination-sheet__history-empty">{language === 'zh' ? '暂无记录' : 'None yet'}</p>
                        ) : (
                          currentDay.voteHistory.map((record) => (
                            <div className={`storyteller-nomination-sheet__history-item${record.failed ? ' storyteller-nomination-sheet__history-item--failed' : record.passed ? ' storyteller-nomination-sheet__history-item--passed' : ' storyteller-nomination-sheet__history-item--failed'}`} key={record.id}>
                              <span className="storyteller-nomination-sheet__history-pair">
                                #{record.actor} → #{record.target}
                              </span>
                              {record.failed ? (
                                <span className="storyteller-nomination-sheet__history-result">{language === 'zh' ? '提名失败' : 'Nom. Failed'}</span>
                              ) : (
                                <>
                                  <span className="storyteller-nomination-sheet__history-votes">
                                    {language === 'zh' ? '票' : 'vote'}({record.voteCount}/{record.requiredVotes}){record.voters.length > 0 ? `: ${record.voters.map(v => `#${v}`).join(', ')}` : ''}
                                  </span>
                                  <span className={`storyteller-nomination-sheet__history-result${record.passed ? ' storyteller-nomination-sheet__history-result--pass' : ''}`}>
                                    {record.passed ? (language === 'zh' ? '通过' : 'Pass') : (language === 'zh' ? '失败' : 'Fail')}
                                    {record.note ? ` · ${record.note}` : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              {/* ── Seat cards ── */}
              {currentDay.seats.map((seat, index) => {
                // Rectangular perimeter positioning (3:2 aspect ratio table)
                const total = currentDay.seats.length
                const W = 3, H = 2
                const perimeter = 2 * (W + H) // = 10
                const offset = (0.5 / total) * perimeter
                const p = (offset + (index / total) * perimeter) % perimeter
                const padX = 9, padY = 9
                let left: number, top: number
                if (p < W) {
                  left = padX + (p / W) * (100 - 2 * padX); top = padY
                } else if (p < W + H) {
                  left = 100 - padX; top = padY + ((p - W) / H) * (100 - 2 * padY)
                } else if (p < 2 * W + H) {
                  left = (100 - padX) - ((p - W - H) / W) * (100 - 2 * padX); top = 100 - padY
                } else {
                  left = padX; top = (100 - padY) - ((p - 2 * W - H) / H) * (100 - 2 * padY)
                }
                const tags = [!seat.alive ? text.aliveTag : '', seat.isExecuted ? text.executedTag : '', seat.isTraveler ? text.traveler : '', seat.hasNoVote ? text.noVoteTag : '', ...seat.customTags].filter(Boolean)
                const isSpoken = currentDay.roundRobinSpokenSeats.includes(seat.seat)
                const isVoteActor = currentDay.voteDraft.actor === seat.seat
                const isVoteTarget = currentDay.voteDraft.target === seat.seat
                const isSkillActor = skillOverlay?.draft.actor === seat.seat
                const isSkillTarget = skillOverlay?.draft.targets.includes(seat.seat) ?? false
                const isCurrentVoter = currentVoterSeat === seat.seat
                const hasVoted = currentDay.votingState?.votes[seat.seat] !== undefined
                const votedYes = currentDay.votingState?.votes[seat.seat] === true
                const isInNomination = currentDay.phase === 'nomination' && currentDay.nominationStep !== 'waitingForNomination'
                const cardVotedYes = currentDay.votingState
                  ? currentDay.votingState.votes[seat.seat] === true
                  : currentDay.voteDraft.voters.includes(seat.seat)
                const cardVotedNo = currentDay.votingState
                  ? currentDay.votingState.votes[seat.seat] === false
                  : currentDay.voteDraft.noVoters.includes(seat.seat)
                const isTagPopoutOpen = tagPopoutSeat === seat.seat
                const isSkillPopoutOpen = skillPopoutSeat === seat.seat

                return (
                  <article
                    className={[
                      'storyteller-seat',
                      !seat.alive ? 'storyteller-seat--dead' : '',
                      seat.isExecuted ? 'storyteller-seat--executed' : '',
                      seat.isTraveler ? 'storyteller-seat--traveler' : '',
                      selectedSeat?.seat === seat.seat ? 'storyteller-seat--speaker' : '',
                      isSpoken ? 'storyteller-seat--spoken' : '',
                      isVoteActor || isSkillActor ? 'storyteller-seat--actor' : '',
                      isVoteTarget ? 'storyteller-seat--target' : '',
                      isSkillTarget ? 'storyteller-seat--skill-target' : '',
                      isCurrentVoter ? 'storyteller-seat--current-voter' : '',
                      pickerMode !== 'none' ? 'storyteller-seat--picker' : '',
                      isTagPopoutOpen || isSkillPopoutOpen ? 'storyteller-seat--tag-open' : '',
                    ].filter(Boolean).join(' ')}
                    key={seat.seat}
                    style={{ left: `${left}%`, top: `${top}%` } as CSSProperties}
                  >
                    <button className="storyteller-seat__surface" onClick={() => handleSeatClick(seat.seat)} type="button">
                      <div className="storyteller-seat__header">
                        <span className="storyteller-seat__nameline">
                          <span className="storyteller-seat__number">#{seat.seat}</span>
                          <span className="storyteller-seat__name">{seat.name}</span>
                        </span>
                        {hasVoted ? <span className={`storyteller-seat__vote-mark${votedYes ? '' : ' storyteller-seat__vote-mark--no'}`}>{votedYes ? '✓' : '✗'}</span> : null}
                      </div>
                    </button>

                    {/* Use Skill button */}
                    <button
                      className={`storyteller-seat__skill-btn${isSkillPopoutOpen ? ' storyteller-seat__skill-btn--open' : ''}`}
                      onClick={(e) => { e.stopPropagation(); if (isSkillPopoutOpen) { closeSkillOverlay(false) } else { openSeatSkill(seat.seat) } }}
                      type="button"
                    >{language === 'zh' ? '发动技能' : 'Use Skill'}</button>

                    {/* Tag button */}
                    <button
                      className={`storyteller-seat__tag-btn${isTagPopoutOpen ? ' storyteller-seat__tag-btn--open' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setTagPopoutSeat(isTagPopoutOpen ? null : seat.seat); setSkillPopoutSeat(null); if (skillOverlay && !isTagPopoutOpen) closeSkillOverlay(false) }}
                      type="button"
                    >{text.addTagLabel}</button>

                    {/* Agree / Disagree buttons during nomination */}
                    {isInNomination ? (
                      cardVotedYes ? (
                        <button
                          className="storyteller-seat__vote-indicator storyteller-seat__vote-indicator--yes"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (currentDay.votingState) {
                              updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: undefined as unknown as boolean } } : null }))
                            } else {
                              updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } }))
                            }
                          }}
                          type="button"
                        >✓</button>
                      ) : cardVotedNo ? (
                        <button
                          className="storyteller-seat__vote-indicator storyteller-seat__vote-indicator--no"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (currentDay.votingState) {
                              updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: undefined as unknown as boolean } } : null }))
                            } else {
                              updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } }))
                            }
                          }}
                          type="button"
                        >✗</button>
                      ) : (
                        <div className="storyteller-seat__vote-btns">
                          <button
                            className="storyteller-seat__vote-btn storyteller-seat__vote-btn--yes"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (currentDay.votingState) {
                                updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: true } } : null }))
                              } else {
                                updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: [...d.voteDraft.voters, seat.seat], noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } }))
                              }
                            }}
                            type="button"
                          >✓</button>
                          <button
                            className="storyteller-seat__vote-btn storyteller-seat__vote-btn--no"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (currentDay.votingState) {
                                updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: false } } : null }))
                              } else {
                                updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: [...d.voteDraft.noVoters, seat.seat], voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } }))
                              }
                            }}
                            type="button"
                          >✗</button>
                        </div>
                      )
                    ) : null}

                    {tags.length ? (
                      <div className="storyteller-seat__tag-list">
                        {tags.map((tag) => (
                          <span
                            className="storyteller-seat__pill"
                            key={`${seat.seat}-${tag}`}
                            onContextMenu={(e) => { if (!seat.customTags.includes(tag)) return; e.preventDefault(); removeSeatTag(seat.seat, tag) }}
                            title={seat.customTags.includes(tag) ? 'Right click to remove' : undefined}
                          >{tag}</span>
                        ))}
                      </div>
                    ) : null}

                    {/* Tag popout */}
                    {isTagPopoutOpen ? (
                      <div className="storyteller-tag-popout" onClick={(e) => e.stopPropagation()}>
                        {/* Tag grid: status toggles + custom tag pool */}
                        <div className="storyteller-tag-popout__grid">
                          <button className={`secondary-button secondary-button--small${!seat.alive ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, alive: !s.alive }))} type="button">{text.aliveTag}</button>
                          <button className={`secondary-button secondary-button--small${seat.isExecuted ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, isExecuted: !s.isExecuted }))} type="button">{text.executedTag}</button>
                          <button className={`secondary-button secondary-button--small${seat.isTraveler ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, isTraveler: !s.isTraveler }))} type="button">{text.traveler}</button>
                          <button className={`secondary-button secondary-button--small${seat.hasNoVote ? ' tab-button--active' : ''}`} onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, hasNoVote: !s.hasNoVote }))} type="button">{text.noVoteTag}</button>
                          {customTagPool.map((tag) => (
                            <button
                              className={`secondary-button secondary-button--small${seat.customTags.includes(tag) ? ' tab-button--active' : ''}`}
                              key={`pop-${tag}`}
                              onClick={() => updateSeatWithLog(seat.seat, (s) => ({ ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v) => v !== tag) : [...s.customTags, tag] }))}
                              type="button"
                            >{tag}</button>
                          ))}
                        </div>
                        {/* Input + add button at bottom */}
                        <div className="storyteller-tag-popout__add-row">
                          <input
                            autoFocus
                            onChange={(e) => setSeatTagDrafts((c) => ({ ...c, [seat.seat]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(seat.seat); setSeatTagDrafts((c) => ({ ...c, [seat.seat]: '' })) } }}
                            placeholder={text.addTag}
                            type="text"
                            value={seatTagDrafts[seat.seat] ?? ''}
                          />
                          <button
                            className="storyteller-tag-popout__add-btn"
                            onMouseDown={(e) => { e.preventDefault(); addCustomTag(seat.seat); setSeatTagDrafts((c) => ({ ...c, [seat.seat]: '' })) }}
                            type="button"
                          >+</button>
                        </div>
                      </div>
                    ) : null}

                    {/* Skill popout */}
                    {isSkillPopoutOpen && skillOverlay ? (
                      <div className="storyteller-skill-popout" onClick={(e) => e.stopPropagation()}>
                        {/* Actor */}
                        <div className="storyteller-skill-popout__actor">
                          <span>{language === 'zh' ? '发动者' : 'Actor'}</span>
                          <strong>#{seat.seat} {seat.name}</strong>
                        </div>

                        {/* Targets */}
                        <div className="storyteller-skill-popout__target-section">
                          <span className="storyteller-skill-popout__label">{language === 'zh' ? '目标' : 'Target'}</span>
                          <div className="storyteller-skill-popout__target-grid">
                            {currentDay.seats.map((s) => {
                              const isTarget = skillOverlay.draft.targets.includes(s.seat)
                              return (
                                <label className="storyteller-skill-popout__target-check" key={s.seat}>
                                  <input
                                    checked={isTarget}
                                    onChange={() => setSkillOverlay((p) => {
                                      if (!p) return p
                                      const targets = isTarget ? p.draft.targets.filter((t) => t !== s.seat) : [...p.draft.targets, s.seat]
                                      return { ...p, draft: { ...p.draft, targets } }
                                    })}
                                    type="checkbox"
                                  />
                                  <span>#{s.seat}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        {/* Role */}
                        {/* Claimed role — optional single dropdown with icons */}
                        <div className="storyteller-skill-popout__field">
                          <span>{text.skillRole}</span>
                          <div className="storyteller-skill-popout__role-dropdown">
                            <button
                              className="storyteller-skill-popout__role-trigger"
                              onClick={(e) => { e.stopPropagation(); setSkillRoleDropdownOpen((o) => !o) }}
                              type="button"
                            >
                              {skillOverlay.draft.roleId ? (
                                <>
                                  {getIconForCharacter(skillOverlay.draft.roleId) ? <img alt="" className="storyteller-skill-overlay__role-icon" src={getIconForCharacter(skillOverlay.draft.roleId) as string} /> : null}
                                  <span>{getDisplayName(skillOverlay.draft.roleId, language)}</span>
                                </>
                              ) : <span className="storyteller-skill-popout__role-placeholder">{language === 'zh' ? '— 未声明 —' : '— None —'}</span>}
                              <span className="storyteller-skill-popout__role-caret">▾</span>
                            </button>
                            {skillRoleDropdownOpen ? (
                              <div className="storyteller-skill-popout__role-options">
                                <button
                                  className="storyteller-skill-popout__role-option"
                                  onClick={() => { setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, roleId: '' } } : p); setSkillRoleDropdownOpen(false) }}
                                  type="button"
                                >{language === 'zh' ? '— 未声明 —' : '— None —'}</button>
                                {currentScriptCharacters.map((c) => {
                                  const icon = getIconForCharacter(c)
                                  const name = getDisplayName(c, language)
                                  return (
                                    <button
                                      className={`storyteller-skill-popout__role-option${skillOverlay.draft.roleId === c ? ' storyteller-skill-popout__role-option--active' : ''}`}
                                      key={c}
                                      onClick={() => { setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, roleId: c } } : p); setSkillRoleDropdownOpen(false) }}
                                      type="button"
                                    >
                                      {icon ? <img alt="" className="storyteller-skill-overlay__role-icon" src={icon as string} /> : null}
                                      <span>{name}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Statement */}
                        <label className="storyteller-skill-popout__field">
                          <span>{text.statement}</span>
                          <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, statement: e.target.value } } : p)} placeholder={text.statement} type="text" value={skillOverlay.draft.statement} />
                        </label>

                        {/* Note */}
                        <label className="storyteller-skill-popout__field">
                          <span>{text.note}</span>
                          <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, note: e.target.value } } : p)} placeholder={text.note} type="text" value={skillOverlay.draft.note} />
                        </label>

                        {/* Per-target notes */}
                        {skillOverlay.draft.targets.map((t) => (
                          <label className="storyteller-skill-popout__field" key={t}>
                            <span>#{t} {text.targetNote}</span>
                            <input onChange={(e) => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, targetNotes: { ...p.draft.targetNotes, [t]: e.target.value } } } : p)} type="text" value={skillOverlay.draft.targetNotes[t] ?? ''} />
                          </label>
                        ))}

                        {/* Result */}
                        <div className="storyteller-chip-row">
                          <button className={`secondary-button secondary-button--small${skillOverlay.draft.result === 'success' ? ' tab-button--active' : ''}`} onClick={() => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, result: p.draft.result === 'success' ? null : 'success' } } : p)} type="button">{text.success}</button>
                          <button className={`secondary-button secondary-button--small${skillOverlay.draft.result === 'failure' ? ' tab-button--active' : ''}`} onClick={() => setSkillOverlay((p) => p ? { ...p, draft: { ...p.draft, result: p.draft.result === 'failure' ? null : 'failure' } } : p)} type="button">{text.failure}</button>
                        </div>

                        {/* Save / Cancel */}
                        <div className="storyteller-chip-row">
                          <button className="print-button" onClick={() => closeSkillOverlay(true)} type="button">{text.saveSkill}</button>
                          <button className="secondary-button" onClick={() => closeSkillOverlay(false)} type="button">{text.cancelSkill}</button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
            {/* nomination sheet moved into center card above */}
            {false ? (
              <div className="storyteller-nomination-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="storyteller-nomination-sheet__header">
                  <span className="storyteller-nomination-sheet__title">{language === 'zh' ? '提名' : 'Nominate'}</span>
                  <button className="secondary-button secondary-button--small" onClick={() => { setShowNominationSheet(false); setPickerMode('none') }} type="button">{language === 'zh' ? '隐藏' : 'Hide'}</button>
                </div>

                {/* Nominator */}
                <div className="storyteller-nomination-sheet__row">
                  <span className="storyteller-nomination-sheet__label">{text.actor}</span>
                  <select
                    className="storyteller-nomination-sheet__select"
                    onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: v } })); setPickerMode('nominee') } else { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, actor: null } })) } }}
                    value={currentDay.voteDraft.actor ?? ''}
                  >
                    <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                    {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                  </select>
                  <button
                    className={`secondary-button secondary-button--small${pickerMode === 'nominator' ? ' storyteller-picker-active' : ''}`}
                    onClick={() => setPickerMode(pickerMode === 'nominator' ? 'none' : 'nominator')}
                    type="button"
                  >{language === 'zh' ? '点击座位' : 'Pick seat'}</button>
                </div>

                {/* Nominee */}
                <div className="storyteller-nomination-sheet__row">
                  <span className="storyteller-nomination-sheet__label">{text.target}</span>
                  <select
                    className="storyteller-nomination-sheet__select"
                    onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) updateCurrentDay((d) => ({ ...d, nominationStep: 'nominationDecision', voteDraft: { ...d.voteDraft, target: v, voters: [] } })); else updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, target: null } })) }}
                    value={currentDay.voteDraft.target ?? ''}
                  >
                    <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                    {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                  </select>
                  <button
                    className={`secondary-button secondary-button--small${pickerMode === 'nominee' ? ' storyteller-picker-active' : ''}`}
                    onClick={() => setPickerMode(pickerMode === 'nominee' ? 'none' : 'nominee')}
                    type="button"
                  >{language === 'zh' ? '点击座位' : 'Pick seat'}</button>
                </div>

                {pickerMode === 'nominator' || pickerMode === 'nominee' ? (
                  <p className="storyteller-nomination-sheet__hint">{language === 'zh' ? '↑ 点击圆桌上的座位进行选择' : '↑ Click a seat on the table to select'}</p>
                ) : null}

                {/* Vote override: seat checkboxes */}
                {currentDay.nominationStep !== 'waitingForNomination' ? (
                  <div className="storyteller-nomination-sheet__votes">
                    <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '投票' : 'Votes'} ({language === 'zh' ? '手动覆盖' : 'override'})</span>
                    <div className="storyteller-nomination-sheet__vote-grid">
                      {currentDay.seats.map((s) => {
                        const voted = currentDay.votingState?.votes[s.seat]
                        const isChecked = voted === true || currentDay.voteDraft.voters.includes(s.seat)
                        return (
                          <label className="storyteller-nomination-sheet__vote-check" key={s.seat}>
                            <input
                              checked={isChecked}
                              onChange={() => {
                                if (currentDay.votingState) {
                                  updateCurrentDay((d) => ({
                                    ...d,
                                    votingState: d.votingState ? {
                                      ...d.votingState,
                                      votes: { ...d.votingState.votes, [s.seat]: !isChecked },
                                    } : null,
                                  }))
                                } else {
                                  updateCurrentDay((d) => ({
                                    ...d,
                                    voteDraft: {
                                      ...d.voteDraft,
                                      voters: isChecked ? d.voteDraft.voters.filter((v) => v !== s.seat) : [...d.voteDraft.voters, s.seat],
                                    },
                                  }))
                                }
                              }}
                              type="checkbox"
                            />
                            <span>#{s.seat}</span>
                          </label>
                        )
                      })}
                    </div>
                    <span className="storyteller-nomination-sheet__vote-count">
                      {language === 'zh' ? '同意' : 'Yes'}: <strong>{Object.values(currentDay.votingState?.votes ?? {}).filter(Boolean).length || currentDay.voteDraft.voters.length}</strong> / {requiredVotes}
                    </span>
                  </div>
                ) : null}

                {/* Note */}
                <label className="storyteller-nomination-sheet__row storyteller-nomination-sheet__row--note">
                  <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '备注' : 'Note'}</span>
                  <input
                    className="storyteller-nomination-sheet__note-input"
                    onChange={(e) => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, note: e.target.value } }))}
                    placeholder={language === 'zh' ? '可选备注…' : 'Optional note…'}
                    type="text"
                    value={currentDay.voteDraft.note}
                  />
                </label>

                {/* Agree / Disagree */}
                {isVotingComplete ? (
                  <div className="storyteller-chip-row">
                    <button className="print-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: true, systemValue: draftPassedBySystem })} type="button">✓ {language === 'zh' ? '同意' : 'Agree'}</button>
                    <button className="secondary-button" onClick={() => setDialogState({ kind: 'voteResult', nextValue: false, systemValue: draftPassedBySystem })} type="button">✗ {language === 'zh' ? '不同意' : 'Disagree'}</button>
                  </div>
                ) : null}

                {/* Record + Clear */}
                <div className="storyteller-chip-row">
                  <button className="print-button" disabled={!currentDay.voteDraft.actor || !currentDay.voteDraft.target} onClick={recordVote} type="button">{language === 'zh' ? '记录' : 'Record'}</button>
                  <button className="secondary-button secondary-button--small" onClick={() => { updateCurrentDay((d) => ({ ...d, nominationStep: 'waitingForNomination', voteDraft: createDefaultVoteDraft(), votingState: null })); setPickerMode('none') }} type="button">{text.clear}</button>
                </div>
              </div>
            ) : null}

            <p className="storyteller-panel__hint">{text.seatHint}</p>
          </div>

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
        </div>
    </>
  )
}
