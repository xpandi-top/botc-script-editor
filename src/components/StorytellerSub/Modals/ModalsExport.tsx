// @ts-nocheck
import React from 'react'

export function ModalsExport({ ctx }: { ctx: any }) {
  const {
    language, days, gameRecords,
    showExportModal, setShowExportModal,
    exportConfig, setExportConfig,
    exportGameJson, exportGameSetup, exportEndGameResults,
  } = ctx
  if (!showExportModal) return null

  const allDayNums = days.map((d: any) => d.day)
  const selectedDays = exportConfig.dayFilter === 'all' ? allDayNums : exportConfig.dayFilter as number[]
  const zh = language === 'zh'

  function toggleDay(day: number) {
    const cur = exportConfig.dayFilter === 'all' ? allDayNums : exportConfig.dayFilter as number[]
    const next = cur.includes(day) ? cur.filter((d: number) => d !== day) : [...cur, day]
    setExportConfig((c: any) => ({ ...c, dayFilter: next.length === allDayNums.length ? 'all' : next }))
  }

  function handleExportLog() {
    exportGameJson(exportConfig)
    setShowExportModal(false)
  }

  function handleExportSetup() {
    exportGameSetup()
    setShowExportModal(false)
  }

  function handleExportResults() {
    exportEndGameResults(gameRecords)
    setShowExportModal(false)
  }

  return (
    <div className="storyteller-modal" role="dialog" aria-modal="true" onClick={() => setShowExportModal(false)}>
      <div className="storyteller-modal__card storyteller-export-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{zh ? '导出' : 'Export'}</h3>

        {/* ── Quick exports ── */}
        <div className="storyteller-export-modal__section">
          <p className="storyteller-export-modal__label">{zh ? '快速导出' : 'Quick Export'}</p>
          <div className="storyteller-export-quick">
            <button className="storyteller-export-quick__btn" onClick={handleExportSetup} type="button">
              <span className="storyteller-export-quick__icon">🎭</span>
              <span className="storyteller-export-quick__label">{zh ? '游戏设置' : 'Game Setup'}</span>
              <span className="storyteller-export-quick__hint">{zh ? '角色 · 座位 · 阵营' : 'Characters · Seats · Teams'}</span>
            </button>
            <button
              className="storyteller-export-quick__btn"
              onClick={handleExportResults}
              disabled={gameRecords.length === 0}
              title={gameRecords.length === 0 ? (zh ? '暂无历史记录' : 'No game records yet') : undefined}
              type="button"
            >
              <span className="storyteller-export-quick__icon">🏆</span>
              <span className="storyteller-export-quick__label">{zh ? '对局结果' : 'End Game Results'}</span>
              <span className="storyteller-export-quick__hint">{zh ? `${gameRecords.length} 条记录` : `${gameRecords.length} record${gameRecords.length !== 1 ? 's' : ''}`}</span>
            </button>
          </div>
        </div>

        {/* ── Game log export ── */}
        <div className="storyteller-export-modal__section">
          <p className="storyteller-export-modal__label">{zh ? '详细日志' : 'Game Log'}</p>
          <div className="storyteller-export-modal__checks">
            {[
              { key: 'includeSeats',   label: zh ? '座位信息' : 'Seat info' },
              { key: 'includeVotes',   label: zh ? '投票记录' : 'Vote history' },
              { key: 'includeSkills',  label: zh ? '技能记录' : 'Skill history' },
              { key: 'includeEvents',  label: zh ? '事件日志' : 'Event log' },
              { key: 'includeStNotes', label: zh ? 'ST 私密备注' : 'ST private notes' },
            ].map(({ key, label }) => (
              <label key={key} className="winner-option">
                <input
                  type="checkbox"
                  checked={exportConfig[key]}
                  onChange={(e) => setExportConfig((c: any) => ({ ...c, [key]: e.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="storyteller-export-modal__days">
            <label className="winner-option">
              <input
                type="checkbox"
                checked={exportConfig.dayFilter === 'all'}
                onChange={(e) => setExportConfig((c: any) => ({ ...c, dayFilter: e.target.checked ? 'all' : allDayNums }))}
              />
              <span>{zh ? '所有回合' : 'All days'}</span>
            </label>
            {allDayNums.map((day: number) => (
              <label key={day} className="winner-option">
                <input
                  type="checkbox"
                  checked={selectedDays.includes(day)}
                  onChange={() => toggleDay(day)}
                  disabled={exportConfig.dayFilter === 'all'}
                />
                <span>Day {day}</span>
              </label>
            ))}
          </div>

          <button className="print-button" onClick={handleExportLog} style={{ width: '100%', marginTop: '0.5rem' }} type="button">
            ⬇ {zh ? '下载日志 JSON' : 'Download Log JSON'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button className="secondary-button" onClick={() => setShowExportModal(false)} type="button">
            {zh ? '关闭' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
