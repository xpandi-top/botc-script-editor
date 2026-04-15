// @ts-nocheck
import React from 'react'
import { createDefaultVoteDraft } from '../constants'


export function ArenaCenterNominationSheet({ ctx }: { ctx: any }) {
  const { language, text, currentDay, updateCurrentDay, pickerMode, setPickerMode, showNominationSheet, setShowNominationSheet, requiredVotes, exileRequiredVotes, effectiveRequiredVotes, draftPassedBySystem, draftPassed, isVotingComplete, rejectNomination, recordVote, setDialogState, votingYesCount } = ctx;
  return (
    <>
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
                            onChange={(e) => {
                              const v = parseInt(e.target.value)
                              if (!isNaN(v)) {
                                const targetSeat = currentDay.seats.find((s: any) => s.seat === v)
                                const autoExile = targetSeat?.isTraveler ?? false
                                updateCurrentDay((d: any) => ({ ...d, nominationStep: 'nominationDecision', voteDraft: { ...d.voteDraft, target: v, voters: [], isExile: autoExile } }))
                              } else {
                                updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, target: null, isExile: false } }))
                              }
                            }}
                            value={currentDay.voteDraft.target ?? ''}
                          >
                            <option value="">{language === 'zh' ? '— 选择 —' : '— Select —'}</option>
                            {currentDay.seats.map((s: any) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}{s.isTraveler ? ` (${language === 'zh' ? '旅人' : 'Traveler'})` : ''}</option>)}
                          </select>
                          <button
                            className={`storyteller-nomination-sheet__pick-btn${pickerMode === 'nominee' ? ' storyteller-picker-active' : ''}`}
                            onClick={() => setPickerMode(pickerMode === 'nominee' ? 'none' : 'nominee')}
                            type="button"
                          >⊕</button>
                        </div>

                        {/* Exile mode toggle */}
                        <div className="storyteller-nomination-sheet__row">
                          <label className="storyteller-nomination-sheet__exile-toggle">
                            <input
                              checked={currentDay.voteDraft.isExile}
                              onChange={(e) => updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, isExile: e.target.checked } }))}
                              type="checkbox"
                            />
                            <span>
                              {language === 'zh' ? '放逐模式' : 'Exile'}
                              <small className="storyteller-nomination-sheet__exile-hint">
                                {currentDay.voteDraft.isExile
                                  ? ` (≥${exileRequiredVotes}/${currentDay.seats.length})`
                                  : ` (≥${requiredVotes})`}
                              </small>
                            </span>
                          </label>
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
                              {language === 'zh' ? '同意' : 'Yes'}: <strong>{Object.values(currentDay.votingState?.votes ?? {}).filter(Boolean).length || currentDay.voteDraft.voters.length}</strong> / {effectiveRequiredVotes}
                              {currentDay.voteDraft.isExile && <span className="storyteller-nomination-sheet__exile-badge"> {language === 'zh' ? '放逐' : 'Exile'}</span>}
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

                        {/* Vote count adjuster */}
                        {currentDay.nominationStep !== 'waitingForNomination' && currentDay.voteDraft.nominationResult === 'succeed' ? (
                          <div className="storyteller-nomination-sheet__row storyteller-nomination-sheet__row--adjuster">
                            <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '票数' : 'Count'}</span>
                            <div className="ns-vote-adjuster">
                              <button
                                className="ns-vote-adjuster__btn"
                                onClick={() => {
                                  const cur = currentDay.voteDraft.voteCountOverride !== null ? currentDay.voteDraft.voteCountOverride : votingYesCount
                                  updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: Math.max(0, cur - 1) } }))
                                }}
                                type="button"
                              >−</button>
                              <span className={`ns-vote-adjuster__count${currentDay.voteDraft.voteCountOverride !== null ? ' ns-vote-adjuster__count--overridden' : ''}`}>
                                {votingYesCount}
                                <small> / {effectiveRequiredVotes}</small>
                              </span>
                              <button
                                className="ns-vote-adjuster__btn"
                                onClick={() => {
                                  const cur = currentDay.voteDraft.voteCountOverride !== null ? currentDay.voteDraft.voteCountOverride : votingYesCount
                                  updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: cur + 1 } }))
                                }}
                                type="button"
                              >+</button>
                              {currentDay.voteDraft.voteCountOverride !== null && (
                                <button
                                  className="ns-vote-adjuster__reset"
                                  onClick={() => updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voteCountOverride: null } }))}
                                  title={language === 'zh' ? '重置为自动' : 'Reset to auto'}
                                  type="button"
                                >↺</button>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {/* Override dropdown */}
                        {currentDay.voteDraft.nominationResult === 'succeed' ? (
                          <div className="storyteller-nomination-sheet__row">
                            <span className="storyteller-nomination-sheet__label">{language === 'zh' ? '覆盖' : 'Override'}</span>
                            <select
                              className={`storyteller-nomination-sheet__select${currentDay.voteDraft.manualPassed === true ? ' storyteller-nomination-sheet__select--succeed' : currentDay.voteDraft.manualPassed === false ? ' storyteller-nomination-sheet__select--fail' : ''}`}
                              value={currentDay.voteDraft.manualPassed === true ? 'agree' : currentDay.voteDraft.manualPassed === false ? 'disagree' : 'auto'}
                              onChange={(e) => {
                                const v = e.target.value
                                updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, manualPassed: v === 'agree' ? true : v === 'disagree' ? false : null } }))
                              }}
                            >
                              <option value="auto">{language === 'zh' ? '自动判定' : 'Auto'}</option>
                              <option value="agree">{language === 'zh' ? '✓ 强制通过' : '✓ Override Pass'}</option>
                              <option value="disagree">{language === 'zh' ? '✗ 强制失败' : '✗ Override Fail'}</option>
                            </select>
                          </div>
                        ) : null}

                        {/* Record + Clear — compact */}
                        <div className="ns-action-row">
                          <button
                            className="ns-btn ns-btn--primary"
                            disabled={!currentDay.voteDraft.actor || !currentDay.voteDraft.target}
                            onClick={() => currentDay.voteDraft.nominationResult === 'fail' ? rejectNomination() : recordVote()}
                            type="button"
                          >{language === 'zh' ? '📝 记录' : '📝 Record'}</button>
                          <button
                            className="ns-btn ns-btn--secondary"
                            onClick={() => { updateCurrentDay((d) => ({ ...d, nominationStep: 'waitingForNomination', voteDraft: createDefaultVoteDraft(), votingState: null })); setPickerMode('none') }}
                            type="button"
                          >{language === 'zh' ? '↺ 清空' : '↺ Clear'}</button>
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
    </>
  )
}
