// @ts-nocheck
import React, { useState } from 'react'
import { PlayersTab } from './ModalsNewGamePlayersTab'
import { CharactersTab } from './ModalsNewGameCharactersTab'

export function ModalsNewGame({ ctx }: { ctx: any }) {
  const {
    scriptOptions, playerNamePool, setPlayerNamePool, text, language,
    newGamePanel, setNewGamePanel, startNewGame, applyGameChanges, randomAssignCharacters,
  } = ctx

  const [activeTab, setActiveTab] = useState<'players' | 'characters' | 'config'>('players')

  if (!newGamePanel) return null

  const editMode = newGamePanel?.editMode ?? false
  const totalSeats = newGamePanel.playerCount + newGamePanel.travelerCount
  const seats = Array.from({ length: totalSeats }, (_, i) => i + 1)
  const updateConfig = (patch: any) => setNewGamePanel((prev: any) => prev ? { ...prev, ...patch } : prev)

  const tabs = [
    { id: 'players', label: language === 'zh' ? '玩家' : 'Players' },
    { id: 'characters', label: language === 'zh' ? '角色' : 'Characters' },
    { id: 'config', label: language === 'zh' ? '配置' : 'Config' },
  ] as const

  return (
    <div className="storyteller-modal" role="dialog" aria-modal="true">
      <div className="storyteller-modal__card ng-modal">
        <h3 className="ng-modal__title">
          {editMode ? (language === 'zh' ? '修改游戏设置' : 'Edit Game Setup') : text.startNewGame}
        </h3>

        <div className="ng-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`ng-tab-btn${activeTab === tab.id ? ' ng-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ng-modal__body">
          {activeTab === 'players' && (
            <PlayersTab
              newGamePanel={newGamePanel}
              playerNamePool={playerNamePool}
              language={language}
              seats={seats}
              updateConfig={updateConfig}
              setPlayerNamePool={setPlayerNamePool}
            />
          )}

          {activeTab === 'characters' && (
            <CharactersTab
              newGamePanel={newGamePanel}
              scriptOptions={scriptOptions}
              language={language}
              updateConfig={updateConfig}
              randomAssignCharacters={randomAssignCharacters}
            />
          )}

          {activeTab === 'config' && (
            <div className="ng-config-tab storyteller-survey">
              <div className="storyteller-survey__field">
                <label className="winner-option">
                  <input type="checkbox" checked={newGamePanel.allowDuplicateChars} onChange={(e) => updateConfig({ allowDuplicateChars: e.target.checked })} />
                  <span>{language === 'zh' ? '允许重复角色' : 'Allow duplicate characters'}</span>
                </label>
                <label className="winner-option">
                  <input type="checkbox" checked={newGamePanel.allowEmptyChars} onChange={(e) => updateConfig({ allowEmptyChars: e.target.checked })} />
                  <span>{language === 'zh' ? '允许空角色' : 'Allow empty characters'}</span>
                </label>
                <label className="winner-option">
                  <input type="checkbox" checked={newGamePanel.allowSameNames} onChange={(e) => updateConfig({ allowSameNames: e.target.checked })} />
                  <span>{language === 'zh' ? '允许重复名字' : 'Allow same player names'}</span>
                </label>
              </div>
              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? '特殊备注' : 'Special Note'}</label>
                <textarea className="survey-textarea" rows={3} value={newGamePanel.specialNote} onChange={(e) => updateConfig({ specialNote: e.target.value })} placeholder="..." />
              </div>
            </div>
          )}
        </div>

        <div className="ng-modal__footer">
          <button className="secondary-button" onClick={() => setNewGamePanel(null)} type="button">
            {editMode ? (language === 'zh' ? '关闭' : 'Close') : text.cancelNewGame}
          </button>
          {!editMode && (
            <button className="print-button" onClick={() => startNewGame(newGamePanel)} type="button">
              ▶ {text.startNewGame}
            </button>
          )}
          {editMode && (
            <button className="print-button" onClick={() => applyGameChanges(newGamePanel)} type="button">
              ▶ {language === 'zh' ? '应用更改' : 'Apply Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
