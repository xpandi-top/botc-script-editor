// @ts-nocheck
import React from 'react'

export function ModalsEndGame({ ctx }: { ctx: any }) {
  const { 
    text, endGameResult, setEndGameResult, confirmEndGame,
    currentDay, language, dialogState, setDialogState, confirmDialog, dialogTitle 
  } = ctx

  if (!endGameResult && !dialogState) return null

  const renderRating = (label: string, field: string) => (
    <div className="storyteller-survey__field">
      <label className="survey-label">{label}</label>
      <div className="storyteller-survey__rating">
        {[1, 2, 3, 4, 5].map((num) => (
          <button
            key={num}
            type="button"
            className={`rating-btn ${endGameResult?.[field] === num ? 'active' : ''}`}
            onClick={() => setEndGameResult((c) => c ? { ...c, [field]: num } : c)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  )

  const togglePlayerTeam = (seat: number, team: 'evil' | 'good') => {
    setEndGameResult((c) => {
      if (!c) return c
      const currentTeam = c.playerTeams[seat]
      const nextTeam = currentTeam === team ? null : team
      return { ...c, playerTeams: { ...c.playerTeams, [seat]: nextTeam } }
    })
  }

  return (
    <>
      {/* End Game Modal */}
      {endGameResult ? (
        <div className="storyteller-modal" role="dialog" aria-modal="true">
          <div className="storyteller-modal__card storyteller-end-game-modal">
            <h3 style={{ marginBottom: '1rem' }}>{language === 'zh' ? '结算与调查' : 'Game End & Survey'}</h3>

            <div className="storyteller-survey">
              {/* 1. Who wins */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? '谁获胜了？(可选)' : 'Who wins the game (Optional)'}</label>
                <div className="storyteller-survey__winner-group">
                  {['good', 'evil', 'storyteller'].map(w => (
                    <label key={w} className={`winner-option ${endGameResult.winner === w ? 'selected' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={endGameResult.winner === w}
                        onChange={() => setEndGameResult(c => c ? { ...c, winner: c.winner === w ? null : w } : c)}
                      />
                      <span>{w === 'storyteller' ? (language === 'zh' ? '说书人' : 'StoryTeller') : (text[w] || w)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 2. Who are evil */}
              <div className="storyteller-survey__field">
                <label className="survey-label">
                  {language === 'zh' ? '谁是邪恶阵营（输入正义阵营号码）' : 'Who are evil (multiple choices): enter the numbers of the good team'}
                </label>
                <div className="storyteller-survey__seat-grid">
                  {currentDay.seats.map(s => (
                    <label key={s.seat} className={`seat-checkbox ${endGameResult.playerTeams[s.seat] === 'evil' ? 'checked-evil' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={endGameResult.playerTeams[s.seat] === 'evil'}
                        onChange={() => togglePlayerTeam(s.seat, 'evil')}
                      />
                      <span>{s.seat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Who are good */}
              <div className="storyteller-survey__field">
                <label className="survey-label">
                  {language === 'zh' ? '谁是正义阵营（输入邪恶阵营号码）' : 'Who are Good (multiple choices): enter the seat numbers of the evil'}
                </label>
                <div className="storyteller-survey__seat-grid">
                  {currentDay.seats.map(s => (
                    <label key={s.seat} className={`seat-checkbox ${endGameResult.playerTeams[s.seat] === 'good' ? 'checked-good' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={endGameResult.playerTeams[s.seat] === 'good'}
                        onChange={() => togglePlayerTeam(s.seat, 'good')}
                      />
                      <span>{s.seat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. MVP */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? 'MVP (可选)' : 'MVP (Optional)'}</label>
                <select 
                  className="survey-select"
                  value={endGameResult.mvp ?? ''}
                  onChange={(e) => setEndGameResult(c => c ? { ...c, mvp: e.target.value ? Number(e.target.value) : null } : c)}
                >
                  <option value="">--</option>
                  {currentDay.seats.map(s => (
                    <option key={s.seat} value={s.seat}>#{s.seat} {s.name}</option>
                  ))}
                </select>
              </div>

              {/* 5. Ratings */}
              <div className="storyteller-survey__ratings-grid">
                {renderRating(language === 'zh' ? '平衡性' : 'Is it balanced', 'balanced')}
                {renderRating(language === 'zh' ? '邪恶方乐趣' : 'Fun for evil', 'funEvil')}
                {renderRating(language === 'zh' ? '正义方乐趣' : 'Fun for good', 'funGood')}
                {renderRating(language === 'zh' ? '重玩愿望' : 'Replay this script', 'replay')}
              </div>

              {/* 6. Other Note */}
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? '其他改进建议' : 'Other Note to improve'}</label>
                <textarea 
                  className="survey-textarea"
                  rows={2}
                  value={endGameResult.otherNote}
                  onChange={(e) => setEndGameResult(c => c ? { ...c, otherNote: e.target.value } : c)}
                  placeholder="..."
                />
              </div>
            </div>

            <div className="storyteller-chip-row" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(23,32,42,0.1)' }}>
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
