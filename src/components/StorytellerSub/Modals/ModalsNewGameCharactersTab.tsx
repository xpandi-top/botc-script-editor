// @ts-nocheck
import React, { useMemo } from 'react'
import { characterById } from '../../../catalog'
import { CHARACTER_DISTRIBUTION } from '../constants'
import { CharSelect, TeamDot, DistRow } from './ModalsNewGameHelpers'

type Props = {
  newGamePanel: any
  scriptOptions: any[]
  language: string
  updateConfig: (patch: any) => void
  randomAssignCharacters: (config: any) => Record<number, string>
}

export function CharactersTab({ newGamePanel, scriptOptions, language, updateConfig, randomAssignCharacters }: Props) {
  const script = scriptOptions.find((s: any) => s.slug === newGamePanel?.scriptSlug)
  const calcDist = CHARACTER_DISTRIBUTION[newGamePanel?.playerCount] ?? { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }

  const actCounts = useMemo(() => {
    const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    Object.values(newGamePanel?.assignments ?? {}).forEach((cid: any) => {
      const ch = characterById[cid]; if (ch && c[ch.team] !== undefined) c[ch.team]++
    })
    return c
  }, [newGamePanel?.assignments])

  const userCounts = useMemo(() => {
    const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    Object.values(newGamePanel?.userAssignments ?? {}).forEach((cid: any) => {
      if (!cid) return; const ch = characterById[cid]; if (ch && c[ch.team] !== undefined) c[ch.team]++
    })
    return c
  }, [newGamePanel?.userAssignments])

  const availableBluffs = useMemo(() =>
    (script?.characters ?? []).filter((id: string) => !Object.values(newGamePanel?.assignments ?? {}).includes(id)),
    [script, newGamePanel?.assignments])

  function setActual(sNum: number, cid: string) {
    const newUser = { ...newGamePanel.userAssignments }
    if (newUser[sNum] === newGamePanel.assignments[sNum] || newUser[sNum] === undefined) delete newUser[sNum]
    updateConfig({ assignments: { ...newGamePanel.assignments, [sNum]: cid }, userAssignments: newUser })
  }

  function setUserPerceived(sNum: number, cid: string | null) {
    updateConfig({ userAssignments: { ...newGamePanel.userAssignments, [sNum]: cid } })
  }

  function setBluff(idx: number, cid: string) {
    const bluffs = [...(newGamePanel.demonBluffs ?? []), '', '', ''].slice(0, 3)
    bluffs[idx] = cid
    updateConfig({ demonBluffs: bluffs })
  }

  return (
    <div className="ng-characters-tab">
      <label className="ng-script-row">
        <span>{language === 'zh' ? '剧本' : 'Script'}</span>
        <select value={newGamePanel.scriptSlug} onChange={(e) => updateConfig({ scriptSlug: e.target.value, assignments: {}, userAssignments: {}, demonBluffs: [] })}>
          {scriptOptions.map((s: any) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
        </select>
      </label>

      <div className="ng-dist-block">
        <div className="ng-dist-header">
          <span />
          <span className="ng-dist-col-label ng-dist-col-label--town">T</span>
          <span className="ng-dist-col-label ng-dist-col-label--out">O</span>
          <span className="ng-dist-col-label ng-dist-col-label--min">M</span>
          <span className="ng-dist-col-label ng-dist-col-label--dem">D</span>
        </div>
        <DistRow label={language === 'zh' ? '应有' : 'Calc'} counts={calcDist} />
        <DistRow label={language === 'zh' ? '实际' : 'Act'} counts={actCounts} calc={calcDist} />
        <DistRow label={language === 'zh' ? '感知' : 'User'} counts={userCounts} calc={calcDist} />
      </div>

      <div className="ng-row ng-row--actions">
        <button className="secondary-button secondary-button--small" onClick={() => updateConfig({ assignments: randomAssignCharacters(newGamePanel) })} type="button">
          {language === 'zh' ? '🎲 随机角色' : '🎲 Random'}
        </button>
        <button className="secondary-button secondary-button--small" onClick={() => updateConfig({ assignments: {}, userAssignments: {}, demonBluffs: [] })} type="button">
          {language === 'zh' ? '↺ 重置' : '↺ Reset'}
        </button>
      </div>

      <div className="ng-char-list">
        {Array.from({ length: newGamePanel.playerCount }, (_, i) => i + 1).map((sNum) => {
          const cid = newGamePanel.assignments[sNum] ?? ''
          const ch = characterById[cid]
          const userCid = newGamePanel.userAssignments[sNum]
          const hasUserOverride = userCid !== undefined && userCid !== null
          const userCh = hasUserOverride ? characterById[userCid ?? ''] : null
          const seatName = newGamePanel.seatNames[sNum] || `#${sNum}`

          return (
            <div key={sNum} className="ng-char-row">
              <span className="ng-char-seat">{seatName}</span>
              <div className="ng-char-actual">
                <CharSelect value={cid} options={script?.characters ?? []} language={language} onChange={(id) => setActual(sNum, id)} />
                <TeamDot team={ch?.team} />
              </div>
              <div className="ng-char-user">
                <button
                  className={`ng-user-toggle${hasUserOverride ? ' ng-user-toggle--active' : ''}`}
                  onClick={() => hasUserOverride ? setUserPerceived(sNum, null) : setUserPerceived(sNum, cid || null)}
                  type="button"
                >
                  {hasUserOverride ? '👁' : '='}
                </button>
                {hasUserOverride && (
                  <div className="ng-char-actual">
                    <CharSelect value={userCid ?? ''} options={script?.characters ?? []} language={language} placeholder={language === 'zh' ? '感知角色…' : 'User char…'} onChange={(id) => setUserPerceived(sNum, id || null)} />
                    <TeamDot team={userCh?.team} />
                  </div>
                )}
              </div>
              <input
                className="ng-char-note"
                placeholder={language === 'zh' ? '备注…' : 'Note…'}
                type="text"
                value={newGamePanel.seatNotes[sNum] ?? ''}
                onChange={(e) => updateConfig({ seatNotes: { ...newGamePanel.seatNotes, [sNum]: e.target.value } })}
              />
            </div>
          )
        })}
      </div>

      <div className="ng-bluffs">
        <div className="ng-bluffs__header">
          <span className="ng-bluffs__title">{language === 'zh' ? '恶魔虚张' : 'Demon Bluffs'}</span>
        </div>
        <div className="ng-bluffs__slots">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="ng-bluff-slot">
              <CharSelect value={newGamePanel.demonBluffs?.[idx] ?? ''} options={availableBluffs} language={language} placeholder={language === 'zh' ? '选择…' : 'Pick…'} onChange={(id) => setBluff(idx, id)} />
            </div>
          ))}
        </div>
      </div>

      {newGamePanel.travelerCount > 0 && (
        <div className="ng-travelers-notes">
          <span className="ng-section-label">{language === 'zh' ? '旅人备注' : 'Traveler notes'}</span>
          {Array.from({ length: newGamePanel.travelerCount }, (_, i) => newGamePanel.playerCount + i + 1).map((sNum) => (
            <div key={sNum} className="ng-char-row">
              <span className="ng-char-seat">✈ {newGamePanel.seatNames[sNum] || `#${sNum}`}</span>
              <input
                className="ng-char-note"
                placeholder={language === 'zh' ? '旅人备注…' : 'Traveler note…'}
                style={{ flex: 1 }}
                type="text"
                value={newGamePanel.seatNotes[sNum] ?? ''}
                onChange={(e) => updateConfig({ seatNotes: { ...newGamePanel.seatNotes, [sNum]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
