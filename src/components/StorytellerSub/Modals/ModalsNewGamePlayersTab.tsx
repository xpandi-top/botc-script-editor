// @ts-nocheck
import React, { useState } from 'react'
import { shuffleArray, uniqueStrings } from '../constants'

type Props = {
  newGamePanel: any
  playerNamePool: string[]
  language: string
  seats: number[]
  updateConfig: (patch: any) => void
  setPlayerNamePool: (fn: any) => void
}

export function PlayersTab({ newGamePanel, playerNamePool, language, seats, updateConfig, setPlayerNamePool }: Props) {
  const [showNamePool, setShowNamePool] = useState(false)
  const [quickFill, setQuickFill] = useState('')

  function handleRandomPlayers() {
    const shuffled = shuffleArray([...playerNamePool])
    const newNames = { ...newGamePanel.seatNames }
    seats.forEach((sNum, i) => { if (shuffled[i]) newNames[sNum] = shuffled[i] })
    updateConfig({ seatNames: newNames })
  }

  function handleResetNames() {
    const names: Record<number, string> = {}
    seats.forEach((sNum) => { names[sNum] = sNum > newGamePanel.playerCount ? `Traveler ${sNum}` : `Player ${sNum}` })
    updateConfig({ seatNames: names })
  }

  function handleQuickFill() {
    const names = quickFill.split(/[,，\n]/).map((n) => n.trim()).filter(Boolean)
    if (!names.length) return
    const newNames = { ...newGamePanel.seatNames }
    seats.forEach((sNum, i) => { if (names[i]) newNames[sNum] = names[i] })
    updateConfig({ seatNames: newNames })
    setQuickFill('')
    const fresh = names.filter((n) => !playerNamePool.includes(n) && !/^Player \d+$|^Traveler \d+$/.test(n))
    if (fresh.length) setPlayerNamePool((p: string[]) => uniqueStrings([...p, ...fresh]))
  }

  function handlePoolNameClick(name: string) {
    const next = seats.find((n) => {
      const cur = newGamePanel.seatNames[n] ?? ''
      return !cur || /^Player \d+$|^Traveler \d+$/.test(cur)
    })
    if (next) updateConfig({ seatNames: { ...newGamePanel.seatNames, [next]: name } })
  }

  return (
    <div className="ng-players-tab">
      <div className="ng-quick-fill">
        <input
          className="ng-quick-fill__input"
          placeholder={language === 'zh' ? '用逗号分隔快速填入名字，如：Alice, Bob, Carol' : 'Paste names separated by commas: Alice, Bob, Carol…'}
          type="text"
          value={quickFill}
          onChange={(e) => setQuickFill(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleQuickFill() }}
        />
        <button className="secondary-button secondary-button--small" onClick={handleQuickFill} type="button">
          {language === 'zh' ? '填入' : 'Fill'}
        </button>
      </div>

      <div className="ng-row ng-row--actions">
        <button className="secondary-button secondary-button--small" onClick={handleRandomPlayers} type="button">
          {language === 'zh' ? '🎲 随机' : '🎲 Random'}
        </button>
        <button className="secondary-button secondary-button--small" onClick={handleResetNames} type="button">
          {language === 'zh' ? '↺ 重置' : '↺ Reset'}
        </button>
        <button
          className={`secondary-button secondary-button--small${showNamePool ? ' tab-button--active' : ''}`}
          onClick={() => setShowNamePool((v) => !v)}
          type="button"
        >
          {language === 'zh' ? '名字池' : 'Name Pool'} {showNamePool ? '▲' : '▼'}
        </button>
      </div>

      {showNamePool && (
        <div className="ng-name-pool">
          {playerNamePool.length === 0
            ? <span className="ng-name-pool__empty">{language === 'zh' ? '（空）' : '(empty)'}</span>
            : playerNamePool.map((name: string) => (
                <button key={name} className="ng-name-chip" onClick={() => handlePoolNameClick(name)} type="button">
                  {name}
                </button>
              ))
          }
        </div>
      )}

      <div className="ng-count-row">
        <span>{language === 'zh' ? '玩家' : 'Players'}</span>
        <div className="ng-stepper">
          <button className="storyteller-center__ctrl-btn" onClick={() => updateConfig({ playerCount: Math.max(5, newGamePanel.playerCount - 1) })} type="button">−</button>
          <strong>{newGamePanel.playerCount}</strong>
          <button className="storyteller-center__ctrl-btn" onClick={() => updateConfig({ playerCount: Math.min(15, newGamePanel.playerCount + 1) })} type="button">+</button>
        </div>
        <span style={{ marginLeft: '1rem' }}>{language === 'zh' ? '旅人' : 'Travelers'}</span>
        <div className="ng-stepper">
          <button className="storyteller-center__ctrl-btn" onClick={() => updateConfig({ travelerCount: Math.max(0, newGamePanel.travelerCount - 1) })} type="button">−</button>
          <strong>{newGamePanel.travelerCount}</strong>
          <button className="storyteller-center__ctrl-btn" onClick={() => updateConfig({ travelerCount: Math.min(5, newGamePanel.travelerCount + 1) })} type="button">+</button>
        </div>
      </div>

      <div className="ng-seats-grid">
        {seats.map((sNum) => {
          const isTraveler = sNum > newGamePanel.playerCount
          return (
            <div key={sNum} className={`ng-seat-row${isTraveler ? ' ng-seat-row--traveler' : ''}`}>
              <span className="ng-seat-num">{isTraveler ? '✈' : '#'}{sNum}</span>
              <input
                className="ng-seat-input"
                list="ng-name-pool-list"
                onChange={(e) => updateConfig({ seatNames: { ...newGamePanel.seatNames, [sNum]: e.target.value } })}
                onBlur={(e) => {
                  const val = e.target.value.trim()
                  if (val && !/^Player \d+$|^Traveler \d+$/.test(val) && !playerNamePool.includes(val))
                    setPlayerNamePool((p: string[]) => uniqueStrings([...p, val]))
                }}
                placeholder={isTraveler ? `Traveler ${sNum}` : `Player ${sNum}`}
                type="text"
                value={newGamePanel.seatNames[sNum] ?? ''}
              />
            </div>
          )
        })}
      </div>
      <datalist id="ng-name-pool-list">
        {playerNamePool.map((n: string) => <option key={n} value={n} />)}
      </datalist>
    </div>
  )
}
