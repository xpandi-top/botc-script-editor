// @ts-nocheck
import React, { useState } from 'react'
import { StarRating } from '../../ui/StarRating'

export function ModalsEndGame({ ctx }: { ctx: any }) {
  const { text, endGameResult, setEndGameResult, confirmEndGame, unmarkGameEnded, currentDay, language, dialogState, setDialogState, confirmDialog, dialogTitle } = ctx
  const [recordName, setRecordName] = useState('')

  if (!endGameResult && !dialogState) return null

  function togglePlayerTeam(seat: number, team: 'evil' | 'good') {
    setEndGameResult((c) => {
      if (!c) return c
      const next = c.playerTeams[seat] === team ? null : team
      return { ...c, playerTeams: { ...c.playerTeams, [seat]: next } }
    })
  }

  return (
    <>
      {endGameResult ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card storyteller-end-game-modal">
            <h3 style={{ marginBottom: '1rem' }}>{language === 'zh' ? '结算与调查' : 'Game End & Survey'}</h3>
            <div className="storyteller-survey">

              {/* 1. Winner */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? '谁获胜了？(可选)' : 'Who wins the game (Optional)'}</label>
                <div className="storyteller-survey__winner-group">
                  {['good', 'evil', 'storyteller'].map((w) => (
                    <label key={w} className={`winner-option${endGameResult.winner === w ? ' selected' : ''}`}>
                      <input type="checkbox" checked={endGameResult.winner === w} onChange={() => setEndGameResult((c) => c ? { ...c, winner: c.winner === w ? null : w } : c)} />
                      <span>{w === 'storyteller' ? (language === 'zh' ? '说书人' : 'StoryTeller') : (text[w] || w)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Evil seats */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? 'evil阵营' : 'Who are evil (multiple choices)'}</label>
                <div className="storyteller-survey__seat-grid">
                  {currentDay.seats.map((s) => (
                    <label key={s.seat} className={`seat-checkbox${endGameResult.playerTeams[s.seat] === 'evil' ? ' checked-evil' : ''}`}>
                      <input type="checkbox" checked={endGameResult.playerTeams[s.seat] === 'evil'} onChange={() => togglePlayerTeam(s.seat, 'evil')} />
                      <span>{s.seat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Good seats */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? '正义阵营' : 'Who are Good (multiple choices)'}</label>
                <div className="storyteller-survey__seat-grid">
                  {currentDay.seats.map((s) => (
                    <label key={s.seat} className={`seat-checkbox${endGameResult.playerTeams[s.seat] === 'good' ? ' checked-good' : ''}`}>
                      <input type="checkbox" checked={endGameResult.playerTeams[s.seat] === 'good'} onChange={() => togglePlayerTeam(s.seat, 'good')} />
                      <span>{s.seat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. MVP */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? 'MVP (可选)' : 'MVP (Optional)'}</label>
                <select className="survey-select" value={endGameResult.mvp ?? ''} onChange={(e) => setEndGameResult((c) => c ? { ...c, mvp: e.target.value ? Number(e.target.value) : null } : c)}>
                  <option value="">--</option>
                  {currentDay.seats.map((s) => <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>)}
                </select>
              </div>

              {/* 5. Ratings */}
              <div className="storyteller-survey__ratings-grid">
                <StarRating label={language === 'zh' ? '平衡性' : 'Is it balanced'} value={endGameResult.balanced} onChange={(n) => setEndGameResult((c) => c ? { ...c, balanced: n } : c)} />
                <StarRating label={language === 'zh' ? 'evil方乐趣' : 'Fun for evil'} value={endGameResult.funEvil} onChange={(n) => setEndGameResult((c) => c ? { ...c, funEvil: n } : c)} />
                <StarRating label={language === 'zh' ? '正义方乐趣' : 'Fun for good'} value={endGameResult.funGood} onChange={(n) => setEndGameResult((c) => c ? { ...c, funGood: n } : c)} />
                <StarRating label={language === 'zh' ? '重玩愿望' : 'Replay this script'} value={endGameResult.replay} onChange={(n) => setEndGameResult((c) => c ? { ...c, replay: n } : c)} />
              </div>

              {/* 6. Note */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? '其他改进建议' : 'Other Note to improve'}</label>
                <textarea className="survey-textarea" rows={2} value={endGameResult.otherNote} onChange={(e) => setEndGameResult((c) => c ? { ...c, otherNote: e.target.value } : c)} placeholder="..." />
              </div>
            </div>

            <div className="storyteller-end-game-actions" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(23,32,42,0.1)' }}>
              <button className="secondary-button" onClick={() => setEndGameResult(null)} type="button">{language === 'zh' ? '取消' : 'Cancel'}</button>
              <button className="print-button" onClick={() => {
                const name = window.prompt(language === 'zh' ? '输入记录名称（可选）:' : 'Enter record name (optional):', recordName)
                setRecordName(name || '')
                confirmEndGame(name || undefined)
              }} type="button">{language === 'zh' ? '💾 保存游戏' : '💾 Save Game'}</button>
              <div className="storyteller-end-game-dropdown">
                <select
                  className="storyteller-end-game-dropdown__select"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value === 'unmark') {
                      unmarkGameEnded()
                      setEndGameResult(null)
                    } else if (e.target.value === 'markAndSave') {
                      const name = window.prompt(language === 'zh' ? '输入记录名称（可选）:' : 'Enter record name (optional):', recordName)
                      setRecordName(name || '')
                      confirmEndGame(name || undefined)
                    }
                    e.target.value = ''
                  }}
                >
                  <option value="" disabled>{language === 'zh' ? '更多选项...' : 'More options...'}</option>
                  <option value="unmark">{language === 'zh' ? '标记为未结束' : 'Mark as Not Finished'}</option>
                  <option value="markAndSave">{language === 'zh' ? '标记结束并保存记录' : 'Mark as Finished & Save Record'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {dialogState ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card">
            <h3 style={{ marginBottom: '1.5rem' }}>{dialogTitle}</h3>
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
