// @ts-nocheck
import React, { useState } from 'react'

const TEAM_COLORS: Record<string, string> = { evil: '#b91c1c', good: '#2563ab', storyteller: '#7c3aed' }

export function RightConsoleRecords({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { language, text, gameRecords, setGameRecords, activeConsoleSections } = ctx
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
                    <span className="record-card__date">{date}</span>
                    <span className="record-card__script">{rec.scriptTitle ?? '—'}</span>
                    {rec.winner && (
                      <span className="record-card__winner" style={{ color: TEAM_COLORS[rec.winner] ?? '#555' }}>
                        {rec.winner === 'evil' ? (language === 'zh' ? '邪恶胜' : '🔴 Evil')
                          : rec.winner === 'good' ? (language === 'zh' ? '善良胜' : '🔵 Good')
                          : (language === 'zh' ? '讲故事人胜' : '👁 ST')}
                      </span>
                    )}
                    <span className="record-card__chevron">{isExpanded ? '▲' : '▼'}</span>
                  </button>

                  {/* ── Expanded body ── */}
                  {isExpanded && (
                    <div className="record-card__body">
                      {/* Stats row */}
                      <div className="record-stats">
                        <span>📅 {rec.days?.length ?? 1} {language === 'zh' ? '天' : 'd'}</span>
                        <span>🗳 {totalVotes} {language === 'zh' ? '票' : 'votes'}</span>
                        <span>✨ {totalSkills} {language === 'zh' ? '技' : 'skills'}</span>
                        {typeof rec.balanced === 'number' && <span>⚖️ {rec.balanced}★</span>}
                      </div>

                      {/* Per-day breakdown */}
                      {rec.days && rec.days.length > 0 && (
                        <div className="record-days">
                          {rec.days.map((d: any) => (
                            <span key={d.day} className="record-day-chip">
                              D{d.day}: {d.votes}🗳 {d.skills}✨
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Player summaries */}
                      {rec.playerSummaries && rec.playerSummaries.length > 0 && (
                        <div className="record-players">
                          {rec.playerSummaries.map((p: any) => (
                            <span
                              key={p.seat}
                              className="record-player-chip"
                              style={{ borderColor: p.team === 'evil' ? 'rgba(180,50,50,0.4)' : 'rgba(37,99,171,0.3)' }}
                            >
                              <span className="record-player-num">#{p.seat}</span>
                              <span className="record-player-name">{p.name}</span>
                              {p.seat === rec.mvp && <span className="record-player-mvp">MVP</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {rec.otherNote && (
                        <p className="record-note">{rec.otherNote}</p>
                      )}

                      {/* Delete */}
                      <button
                        className="secondary-button secondary-button--small"
                        onClick={() => setGameRecords((cur: any[]) => cur.filter((r) => r.id !== rec.id))}
                        type="button"
                        style={{ marginTop: '0.4rem', color: '#b91c1c', borderColor: 'rgba(180,50,50,0.3)' }}
                      >
                        🗑 {language === 'zh' ? '删除' : 'Delete'}
                      </button>
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
