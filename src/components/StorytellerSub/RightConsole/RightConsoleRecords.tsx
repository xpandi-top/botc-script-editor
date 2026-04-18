// @ts-nocheck
import React, { useState } from 'react'

const TEAM_COLORS: Record<string, string> = { evil: '#b91c1c', good: '#2563ab', storyteller: '#7c3aed' }

export function RightConsoleRecords({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { language, text, gameRecords, setGameRecords, activeConsoleSections, loadGameRecord, exportRecordJson, saveGame } = ctx
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!activeConsoleSections.has('records')) {
    return (
      <div className="storyteller-console-section">
        <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('records')} type="button">
          <span>{language === 'zh' ? '历史记录' : 'Game Records'}</span>
          <span>▶</span>
        </button>
      </div>
    )
  }

  return (
    <div className="storyteller-console-section">
      <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('records')} type="button">
        <span>{language === 'zh' ? '历史记录' : 'Game Records'} <small>({gameRecords.length})</small></span>
        <span>▼</span>
      </button>

      <div className="storyteller-console-section__body">
        {gameRecords.length === 0 ? (
          <p className="storyteller-panel__hint">{text.noCompletedGames}</p>
        ) : (
          <div className="records-list">
            {gameRecords.map((rec: any) => {
              const isExpanded = expandedId === rec.id
              const date = new Date(rec.endedAt).toLocaleDateString()
              const totalVotes = rec.days?.reduce((s: number, d: any) => s + (d.votes ?? 0), 0) ?? 0
              const totalSkills = rec.days?.reduce((s: number, d: any) => s + (d.skills ?? 0), 0) ?? 0

              return (
                <div key={rec.id} className={`record-card${isExpanded ? ' record-card--open' : ''}`}>
                  {/* ── Header row ── */}
                  <button
                    className="record-card__header"
                    onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    type="button"
                  >
                    <span className="record-card__filename">{rec.recordName ?? (rec.scriptTitle ? `${rec.scriptTitle} - ${date}` : date)}</span>
                    <span className="record-card__chevron">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* ── Expanded body ── */}
                  {isExpanded && (
                    <div className="record-card__body">
                      {/* Action buttons */}
                      <div className="record-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {rec.savedDays && (
                          <button
                            className="secondary-button secondary-button--small"
                            onClick={() => loadGameRecord(rec)}
                            type="button"
                          >
                            {language === 'zh' ? '📂 加载' : '📂 Load'}
                          </button>
                        )}
                        <button
                          className="secondary-button secondary-button--small"
                          onClick={() => {
                            const name = window.prompt(language === 'zh' ? '输入新文件名：' : 'Enter new file name:', rec.recordName)
                            if (name) saveGame(name)
                          }}
                          type="button"
                        >
                          {language === 'zh' ? '💾 另存' : '💾 Save As'}
                        </button>
                        <button
                          className="secondary-button secondary-button--small"
                          onClick={() => exportRecordJson(rec)}
                          type="button"
                        >
                          {language === 'zh' ? '📥 导出JSON' : '📥 Export JSON'}
                        </button>
                        <button
                          className="secondary-button secondary-button--small"
                          onClick={() => setGameRecords((cur: any[]) => cur.filter((r) => r.id !== rec.id))}
                          type="button"
                          style={{ color: '#b91c1c', borderColor: 'rgba(180,50,50,0.3)' }}
                        >
                          🗑 {language === 'zh' ? '删除' : 'Delete'}
                        </button>
                      </div>

                      {/* Stats row */}
                      <div className="record-stats" style={{ marginTop: '0.75rem' }}>
                        <span>📅 {rec.days?.length ?? 1} {language === 'zh' ? '天' : 'd'}</span>
                        <span>🗳 {totalVotes} {language === 'zh' ? '票' : 'votes'}</span>
                        <span>✨ {totalSkills} {language === 'zh' ? '技' : 'skills'}</span>
                        {rec.scriptTitle && <span>📖 {rec.scriptTitle}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
