// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION } from '../constants'


export function ArenaQuickStrip({ ctx }: { ctx: any }) {
  const { activeRightPopup, setActiveRightPopup, showRightPanel, setShowRightPanel, currentDay, pickerMode, setPickerMode, openSkillOverlay, goToNextDay, openEndGamePanel, exportGameJson, text } = ctx;
  return (
    <>
      {/* ── Quick action strip ── */}
          <nav className="storyteller-quick-strip">
            <button
              className={`storyteller-quick-btn${activeRightPopup === 'log' ? ' storyteller-quick-btn--active' : ''}`}
              onClick={() => setActiveRightPopup((p) => p === 'log' ? null : 'log')}
              type="button"
            >{text.filterVote === '投票' ? '日志' : 'Log'}</button>

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
    </>
  )
}
