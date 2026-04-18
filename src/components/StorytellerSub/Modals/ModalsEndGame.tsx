// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { StarRating } from '../../ui/StarRating'

export function ModalsEndGame({ ctx }: { ctx: any }) {
  const { text, endGameResult, setEndGameResult, confirmEndGame, unmarkGameEnded, saveGame, currentDay, language, dialogState, setDialogState, confirmDialog, dialogTitle, activeScriptTitle, gameRecords, setDays, currentRecordName, showEndGameModal, setShowEndGameModal } = ctx
  const playerCount = currentDay.seats.filter((s: any) => !s.isTraveler).length
  const today = new Date().toISOString().split('T')[0]
  const defaultName = activeScriptTitle ? `${activeScriptTitle.replace(/\s+/g, '_')}_${playerCount}p_${today}` : `Game_${today}`

  const [recordName, setRecordName] = useState(currentRecordName || defaultName)
  const [markOption, setMarkOption] = useState(currentDay.gameEnded ? 'markDone' : 'unmark')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setRecordName(currentRecordName || defaultName)
  }, [currentRecordName, defaultName])

  // When showEndGameModal is true (user clicked button), show modal
  useEffect(() => {
    if (showEndGameModal) {
      setIsVisible(true)
    }
  }, [showEndGameModal])

  function togglePlayerTeam(seat: number, team: 'evil' | 'good') {
    setEndGameResult((c) => {
      if (!c) return c
      const next = c.playerTeams[seat] === team ? null : team
      return { ...c, playerTeams: { ...c.playerTeams, [seat]: next } }
    })
  }

  function handleSave() {
    const existing = gameRecords?.find((r: any) => r.recordName === recordName)
    const surveyData = {
      winner: endGameResult.winner,
      mvp: endGameResult.mvp,
      balanced: endGameResult.balanced,
      funEvil: endGameResult.funEvil,
      funGood: endGameResult.funGood,
      replay: endGameResult.replay,
      otherNote: endGameResult.otherNote,
      playerTeams: endGameResult.playerTeams,
    }
    if (existing) {
      saveGame(recordName, existing.id, surveyData)
    } else {
      confirmEndGame(recordName, surveyData)
    }
    // Close the modal by hiding it, but keep endGameResult data
    setIsVisible(false)
    setShowEndGameModal(false)
  }

  function handleCancel() {
    setIsVisible(false)
    setShowEndGameModal(false)
    // Also clear the data so next "End Game" click starts fresh (unless loaded)
    setTimeout(() => setEndGameResult(null), 100)
  }

  // Only show when explicitly made visible
  if (!isVisible && !dialogState) return null

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

              {/* 2. MVP */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? 'MVP' : 'MVP'}</label>
                <select className="survey-select" value={endGameResult.mvp ?? ''} onChange={(e) => setEndGameResult((c) => c ? { ...c, mvp: e.target.value ? Number(e.target.value) : null } : c)}>
                  <option value="">{language === 'zh' ? '选择玩家' : 'Select player'}</option>
                  {currentDay.seats.filter((s: any) => !s.isTraveler).map((s: any) => (
                    <option key={s.seat} value={s.seat}>{s.seat}. {s.name || `Player ${s.seat}`}</option>
                  ))}
                </select>
              </div>

              {/* 3. Ratings */}
              <div className="storyteller-survey__field">
                <StarRating label={language === 'zh' ? '平衡性' : 'Is it balanced'} value={endGameResult.balanced} onChange={(n) => setEndGameResult((c) => c ? { ...c, balanced: n } : c)} />
                <StarRating label={language === 'zh' ? 'evil方乐趣' : 'Fun for evil'} value={endGameResult.funEvil} onChange={(n) => setEndGameResult((c) => c ? { ...c, funEvil: n } : c)} />
                <StarRating label={language === 'zh' ? '正义方乐趣' : 'Fun for good'} value={endGameResult.funGood} onChange={(n) => setEndGameResult((c) => c ? { ...c, funGood: n } : c)} />
                <StarRating label={language === 'zh' ? '重玩愿望' : 'Replay this script'} value={endGameResult.replay} onChange={(n) => setEndGameResult((c) => c ? { ...c, replay: n } : c)} />
              </div>

              {/* 4. Other notes */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? '其他备注' : 'Other notes'}</label>
                <textarea className="survey-textarea" rows={2} value={endGameResult.otherNote} onChange={(e) => setEndGameResult((c) => c ? { ...c, otherNote: e.target.value } : c)} placeholder="..." />
              </div>

              {/* 5. Team assignments */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? '阵营 (可选)' : 'Team assignments (Optional)'}</label>
                <div className="storyteller-survey__teams">
                  {currentDay.seats.filter((s: any) => !s.isTraveler).map((s: any) => (
                    <button key={s.seat} type="button" className={`team-chip ${endGameResult.playerTeams?.[s.seat] || ''}`} onClick={() => togglePlayerTeam(s.seat, endGameResult.playerTeams?.[s.seat] === 'evil' ? 'good' : 'evil')}>
                      {s.seat}. {s.name || `P${s.seat}`} {endGameResult.playerTeams?.[s.seat] === 'evil' ? '🔴' : endGameResult.playerTeams?.[s.seat] === 'good' ? '🔵' : '⚪'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="text" value={recordName} onChange={(e) => setRecordName(e.target.value)} placeholder={language === 'zh' ? '文件名' : 'File name'} style={{ flex: 1, minWidth: '150px', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }} />
              <select value={markOption} onChange={(e) => { setMarkOption(e.target.value); if (e.target.value === 'unmark') { unmarkGameEnded() } else if (e.target.value === 'markDone') { setDays((d: any) => d.map((day: any) => day.id === currentDay.id ? { ...day, gameEnded: true } : day)) } }} style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem' }}>
                <option value="unmark">{language === 'zh' ? '标记为未结束' : 'Mark as Not Finished'}</option>
                <option value="markDone">{language === 'zh' ? '标记为已结束' : 'Mark as Finished'}</option>
              </select>
            </div>

            <div className="storyteller-end-game-actions" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(23,32,42,0.1)' }}>
              <button className="secondary-button" onClick={handleCancel} type="button">{language === 'zh' ? '取消' : 'Cancel'}</button>
              <button className="print-button" onClick={handleSave} type="button">{language === 'zh' ? '💾 保存' : '💾 Save'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Dialog (if any) */}
      {dialogState && (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card">
            <h3>{dialogTitle || (language === 'zh' ? '确认' : 'Confirm')}</h3>
            <p>{dialogState.message}</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="secondary-button" onClick={() => setDialogState(null)} type="button">{language === 'zh' ? '取消' : 'Cancel'}</button>
              <button className="print-button" onClick={confirmDialog} type="button">{language === 'zh' ? '确认' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}