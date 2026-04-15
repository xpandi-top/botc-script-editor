// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft, FAKE_NAMES, FAKE_NAMES_ZH, uniqueStrings } from '../constants'


export function RightConsoleGame({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { language, onSelectScript, scriptOptions, activeScriptSlug, text, activeConsoleSections, setDialogState, openNewGamePanel, exportGameJson, setShowExportModal } = ctx;
  return (
    <>
      {/* ── Section 1: Game ── */}
          <div className="storyteller-console-section">
            <button className="storyteller-console-section__header" onClick={() => toggleConsoleSection('game')} type="button">
              <span>{text.gameSection}</span>
              <span>{activeConsoleSections.has('game') ? '▼' : '▶'}</span>
            </button>
            {activeConsoleSections.has('game') ? (
              <div className="storyteller-console-section__body">
                <label className="editor-field storyteller-script-select">
                  <span>{text.script}</span>
                  <select onChange={(e) => onSelectScript?.(e.target.value)} value={activeScriptSlug ?? scriptOptions[0]?.slug ?? ''}>
                    {scriptOptions.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                  </select>
                </label>
                <div className="storyteller-chip-row">
                  <button className="secondary-button" onClick={() => setDialogState({ kind: 'restartGame' })} type="button">{text.restartGame}</button>
                  <button className="secondary-button" onClick={() => setShowExportModal(true)} type="button">{text.exportJson}</button>
                </div>
              </div>
            ) : null}
          </div>
    </>
  )
}
