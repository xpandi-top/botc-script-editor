// @ts-nocheck
import React from 'react'
import { RightPopupLog } from './RightPopupLog'
import { RightPopupSettings } from './RightPopupSettings'

export function RightConsole({ ctx }: { ctx: any }) {
  const { showRightPanel, setShowRightPanel, activeRightPopup, setActiveRightPopup, exportGameJson, text } = ctx

  function togglePopup(name: 'log' | 'settings') {
    setActiveRightPopup((p) => (p === name ? null : name))
  }

  function closeDrawer() {
    setActiveRightPopup(null)
    setShowRightPanel(false)
  }

  return (
    <>
      {showRightPanel && (
        <div className="storyteller-drawer-backdrop" onClick={closeDrawer} />
      )}

      <aside className={`storyteller-right-drawer${showRightPanel ? ' storyteller-right-drawer--open' : ''}`}>
        {/* Popup panel — left part of drawer */}
        <div className={`storyteller-right-popup${activeRightPopup ? ' storyteller-right-popup--visible' : ''}`}>
          {activeRightPopup === 'log' && <RightPopupLog ctx={ctx} />}
          {activeRightPopup === 'settings' && <RightPopupSettings ctx={ctx} />}
        </div>

        {/* Icon bar — right edge of drawer */}
        <div className="storyteller-right-bar storyteller-right-bar--open">
          <button
            className={`storyteller-right-bar__btn${activeRightPopup === 'log' ? ' storyteller-right-bar__btn--active' : ''}`}
            onClick={() => togglePopup('log')}
            title={text.aggregatedLog}
            type="button"
          >
            <span className="storyteller-right-bar__icon">📋</span>
            <span className="storyteller-right-bar__label">{text.filterVote === '投票' ? '日志' : 'Log'}</span>
          </button>

          <button
            className={`storyteller-right-bar__btn${activeRightPopup === 'settings' ? ' storyteller-right-bar__btn--active' : ''}`}
            onClick={() => togglePopup('settings')}
            title={text.settings}
            type="button"
          >
            <span className="storyteller-right-bar__icon">⚙️</span>
            <span className="storyteller-right-bar__label">{text.filterVote === '投票' ? '设置' : 'Settings'}</span>
          </button>

          <button
            className="storyteller-right-bar__btn"
            onClick={exportGameJson}
            title={text.exportJson}
            type="button"
          >
            <span className="storyteller-right-bar__icon">⬇️</span>
            <span className="storyteller-right-bar__label">{text.filterVote === '投票' ? '导出' : 'Export'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
