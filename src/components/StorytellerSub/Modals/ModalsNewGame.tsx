// @ts-nocheck
import React, { useState, useMemo } from 'react'
import { getDisplayName, getIconForCharacter, characterById } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, shuffleArray, uniqueStrings } from '../constants'

export function ModalsNewGame({ ctx }: { ctx: any }) {
  const { 
    scriptOptions, playerNamePool, setPlayerNamePool, text, language,
    newGamePanel, setNewGamePanel, startNewGame, randomAssignCharacters
  } = ctx

  if (!newGamePanel) return null

  const [activeTab, setActiveTab] = useState<'config' | 'players' | 'characters'>('config')
  const script = scriptOptions.find(s => s.slug === newGamePanel.scriptSlug)
  
  const dist = CHARACTER_DISTRIBUTION[newGamePanel.playerCount] || { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
  
  // Calculate current character counts
  const currentCounts = useMemo(() => {
    const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    Object.values(newGamePanel.assignments).forEach(cid => {
      const char = characterById[cid]
      if (char && counts[char.team] !== undefined) counts[char.team]++
    })
    return counts
  }, [newGamePanel.assignments])

  const userCounts = useMemo(() => {
    const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    Object.values(newGamePanel.userAssignments).forEach(cid => {
      if (!cid) return
      const char = characterById[cid]
      if (char && counts[char.team] !== undefined) counts[char.team]++
    })
    return counts
  }, [newGamePanel.userAssignments])

  const updateConfig = (patch: Partial<typeof newGamePanel>) => {
    setNewGamePanel(prev => prev ? { ...prev, ...patch } : prev)
  }

  const handleRandomPlayers = () => {
    const shuffled = shuffleArray([...playerNamePool])
    const newNames = { ...newGamePanel.seatNames }
    for (let i = 1; i <= newGamePanel.playerCount + newGamePanel.travelerCount; i++) {
      if (shuffled[i-1]) newNames[i] = shuffled[i-1]
    }
    updateConfig({ seatNames: newNames })
  }

  return (
    <div className="storyteller-modal" role="dialog" aria-modal="true">
      <div className="storyteller-modal__card storyteller-new-game-modal storyteller-new-game-modal--large">
        <h3>{text.startNewGame}</h3>
        
        <div className="storyteller-tab-bar" style={{ marginBottom: '1rem' }}>
          <button className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`} onClick={() => setActiveTab('config')}>{language === 'zh' ? '配置' : 'Config'}</button>
          <button className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>{language === 'zh' ? '玩家' : 'Players'}</button>
          <button className={`tab-btn ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>{language === 'zh' ? '角色' : 'Characters'}</button>
        </div>

        <div className="storyteller-new-game-content">
          {activeTab === 'config' && (
            <div className="storyteller-survey">
              <div className="storyteller-survey__grid">
                <label className="editor-field">
                  <span>{language === 'zh' ? '玩家人数' : 'Player Count'}</span>
                  <input type="number" min="5" max="15" value={newGamePanel.playerCount} onChange={e => updateConfig({ playerCount: Number(e.target.value) })} />
                </label>
                <label className="editor-field">
                  <span>{language === 'zh' ? '旅人人数' : 'Traveler Count'}</span>
                  <input type="number" min="0" max="5" value={newGamePanel.travelerCount} onChange={e => updateConfig({ travelerCount: Number(e.target.value) })} />
                </label>
              </div>

              <label className="editor-field">
                <span>{text.script}</span>
                <select value={newGamePanel.scriptSlug} onChange={e => updateConfig({ scriptSlug: e.target.value, assignments: {}, userAssignments: {} })}>
                  {scriptOptions.map(s => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                </select>
              </label>

              <div className="storyteller-survey__field">
                <label className="winner-option">
                  <input type="checkbox" checked={newGamePanel.allowDuplicateChars} onChange={e => updateConfig({ allowDuplicateChars: e.target.checked })} />
                  <span>{language === 'zh' ? '允许重复角色' : 'Allow duplicate characters'}</span>
                </label>
                <label className="winner-option">
                  <input type="checkbox" checked={newGamePanel.allowEmptyChars} onChange={e => updateConfig({ allowEmptyChars: e.target.checked })} />
                  <span>{language === 'zh' ? '允许空角色' : 'Allow empty characters'}</span>
                </label>
                <label className="winner-option">
                  <input type="checkbox" checked={newGamePanel.allowSameNames} onChange={e => updateConfig({ allowSameNames: e.target.checked })} />
                  <span>{language === 'zh' ? '允许重复玩家名' : 'Allow same player names'}</span>
                </label>
              </div>

              <div className="storyteller-survey__field">
                <label className="survey-label">{language === 'zh' ? '特殊备注' : 'Special Note'}</label>
                <textarea className="survey-textarea" rows={3} value={newGamePanel.specialNote} onChange={e => updateConfig({ specialNote: e.target.value })} placeholder="..." />
              </div>
            </div>
          )}

          {activeTab === 'players' && (
            <div className="storyteller-survey">
              <div className="storyteller-chip-row" style={{ marginBottom: '0.5rem' }}>
                <button className="secondary-button secondary-button--small" onClick={handleRandomPlayers}>{language === 'zh' ? '随机分配' : 'Random Assign'}</button>
                <button className="secondary-button secondary-button--small" onClick={() => updateConfig({ seatNames: {} })}>{language === 'zh' ? '重置' : 'Reset'}</button>
              </div>
              
              <div className="storyteller-new-game-seats-grid">
                {Array.from({ length: newGamePanel.playerCount + newGamePanel.travelerCount }, (_, i) => i + 1).map(sNum => (
                  <div key={sNum} className="storyteller-new-game-seats__row">
                    <span style={{ minWidth: '2.5rem' }}>{sNum > newGamePanel.playerCount ? `✈ #${sNum}` : `#${sNum}`}</span>
                    <input 
                      list="name-pool-list" 
                      type="text" 
                      value={newGamePanel.seatNames[sNum] || ''} 
                      onChange={e => updateConfig({ seatNames: { ...newGamePanel.seatNames, [sNum]: e.target.value } })}
                      onBlur={e => {
                        const val = e.target.value.trim()
                        if (val && !playerNamePool.includes(val)) setPlayerNamePool(p => uniqueStrings([...p, val]))
                      }}
                    />
                  </div>
                ))}
              </div>
              <datalist id="name-pool-list">
                {playerNamePool.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
          )}

          {activeTab === 'characters' && (
            <div className="storyteller-survey">
              <div className="storyteller-distribution-info" style={{ justifyContent: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                <div className="dist-group">
                  <span className="survey-label">{language === 'zh' ? '应有' : 'Calc'}:</span>
                  <span className="dist-item dist-townsfolk">{dist.townsfolk}</span>
                  <span className="dist-item dist-outsider">{dist.outsider}</span>
                  <span className="dist-item dist-minion">{dist.minion}</span>
                  <span className="dist-item dist-demon">{dist.demon}</span>
                </div>
                <div className="dist-group">
                  <span className="survey-label">{language === 'zh' ? '实际' : 'Act'}:</span>
                  <span className="dist-item dist-townsfolk">{currentCounts.townsfolk}</span>
                  <span className="dist-item dist-outsider">{currentCounts.outsider}</span>
                  <span className="dist-item dist-minion">{currentCounts.minion}</span>
                  <span className="dist-item dist-demon">{currentCounts.demon}</span>
                </div>
              </div>

              <div className="storyteller-chip-row" style={{ margin: '0.5rem 0' }}>
                <button className="secondary-button secondary-button--small" onClick={() => updateConfig({ assignments: randomAssignCharacters(newGamePanel) })}>{language === 'zh' ? '随机分配' : 'Random Assign'}</button>
                <button className="secondary-button secondary-button--small" onClick={() => updateConfig({ assignments: {}, userAssignments: {} })}>{language === 'zh' ? '重置' : 'Reset'}</button>
              </div>

              <div className="storyteller-new-game-chars-list">
                {Array.from({ length: newGamePanel.playerCount }, (_, i) => i + 1).map(sNum => {
                  const cid = newGamePanel.assignments[sNum]
                  const userCid = newGamePanel.userAssignments[sNum]
                  const char = characterById[cid]
                  const isUserSelectionActive = userCid !== undefined && userCid !== cid

                  return (
                    <div key={sNum} className="storyteller-new-game-char-row">
                      <div className="char-row-top">
                        <span className="seat-label">#{sNum}</span>
                        <select className="char-select" value={cid || ''} onChange={e => updateConfig({ assignments: { ...newGamePanel.assignments, [sNum]: e.target.value } })}>
                          <option value="">--</option>
                          {script?.characters.map(id => <option key={id} value={id}>{getDisplayName(id, language)}</option>)}
                        </select>
                        
                        <button 
                          className={`mini-toggle ${!isUserSelectionActive ? 'active' : ''}`}
                          onClick={() => {
                            const newUsers = { ...newGamePanel.userAssignments }
                            if (isUserSelectionActive) delete newUsers[sNum]
                            else newUsers[sNum] = cid || null
                            updateConfig({ userAssignments: newUsers })
                          }}
                          title={language === 'zh' ? '与实际相同' : 'Same as actual'}
                        >🔗</button>
                      </div>

                      {isUserSelectionActive && (
                        <select className="char-select char-select--user" value={userCid || ''} onChange={e => updateConfig({ userAssignments: { ...newGamePanel.userAssignments, [sNum]: e.target.value } })}>
                          <option value="">{language === 'zh' ? '用户认为的角色...' : 'User character...'}</option>
                          {script?.characters.map(id => <option key={id} value={id}>{getDisplayName(id, language)}</option>)}
                        </select>
                      )}

                      <input 
                        className="char-note-input" 
                        type="text" 
                        placeholder={language === 'zh' ? '备注...' : 'Note...'} 
                        value={newGamePanel.seatNotes[sNum] || ''}
                        onChange={e => updateConfig({ seatNotes: { ...newGamePanel.seatNotes, [sNum]: e.target.value } })}
                      />
                    </div>
                  )
                })}
                
                {/* Travelers section */}
                {newGamePanel.travelerCount > 0 && (
                  <div className="travelers-section">
                    <span className="survey-label">{language === 'zh' ? '旅人' : 'Travelers'}</span>
                    {Array.from({ length: newGamePanel.travelerCount }, (_, i) => newGamePanel.playerCount + i + 1).map(sNum => (
                      <div key={sNum} className="storyteller-new-game-char-row">
                        <span className="seat-label">✈ #{sNum}</span>
                        <input 
                          className="char-note-input" 
                          type="text" 
                          placeholder={language === 'zh' ? '旅人备注...' : 'Traveler note...'} 
                          value={newGamePanel.seatNotes[sNum] || ''}
                          onChange={e => updateConfig({ seatNotes: { ...newGamePanel.seatNotes, [sNum]: e.target.value } })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="storyteller-chip-row" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(23,32,42,0.1)' }}>
          <button className="secondary-button" onClick={() => setNewGamePanel(null)} type="button">{text.cancelNewGame}</button>
          <button className="print-button" onClick={startNewGame} type="button">{text.startNewGame}</button>
        </div>
      </div>
    </div>
  )
}
