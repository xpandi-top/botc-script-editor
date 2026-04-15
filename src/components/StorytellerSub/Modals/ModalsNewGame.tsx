// @ts-nocheck
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { getDisplayName, getIconForCharacter, characterById } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, shuffleArray, uniqueStrings } from '../constants'

// ── Helpers ────────────────────────────────────────────────────────────────

function TeamDot({ team }: { team: string | null | undefined }) {
  if (!team) return null
  return (
    <span
      className={`ng-team-dot ng-team-dot--${team === 'minion' || team === 'demon' ? 'evil' : team}`}
      title={team}
    />
  )
}

function CharIcon({ cid, size = 28 }: { cid: string; size?: number }) {
  const src = cid ? getIconForCharacter(cid) : undefined
  if (!src) return <span className="ng-char-icon ng-char-icon--empty" style={{ width: size, height: size }} />
  return <img className="ng-char-icon" src={src} alt={cid} width={size} height={size} />
}

// ── Distribution row ───────────────────────────────────────────────────────

function DistRow({ label, counts, calc }: { label: string; counts: { townsfolk: number; outsider: number; minion: number; demon: number }; calc?: typeof counts }) {
  const match = (k: keyof typeof counts) => calc && counts[k] === calc[k]
  return (
    <div className="ng-dist-row">
      <span className="ng-dist-label">{label}</span>
      {(['townsfolk', 'outsider', 'minion', 'demon'] as const).map((k) => (
        <span key={k} className={`ng-dist-val ng-dist-val--${k === 'townsfolk' ? 'town' : k === 'outsider' ? 'out' : k === 'minion' ? 'min' : 'dem'}${calc && !match(k) ? ' ng-dist-val--mismatch' : ''}`}>
          {counts[k]}
        </span>
      ))}
    </div>
  )
}

// ── Custom character select with icons ─────────────────────────────────────

function CharSelect({ value, options, language, onChange, placeholder }: {
  value: string; options: string[]; language: string
  onChange: (id: string) => void; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const selectedCh = value ? characterById[value] : null
  const selectedIcon = value ? getIconForCharacter(value) : null

  return (
    <div className="ng-char-select-wrap" ref={ref}>
      <button
        className={`ng-char-select-trigger${open ? ' ng-char-select-trigger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {selectedIcon
          ? <img className="ng-char-icon" src={selectedIcon} alt={value} width={20} height={20} />
          : <span className="ng-char-icon ng-char-icon--empty" style={{ width: 20, height: 20 }} />}
        <span className="ng-char-select-trigger__name">
          {value ? getDisplayName(value, language) : (placeholder ?? '—')}
        </span>
        <span className="ng-char-select-trigger__caret">▾</span>
      </button>

      {open && (
        <div className="ng-char-select-dropdown">
          <div
            className="ng-char-select-option"
            onClick={() => { onChange(''); setOpen(false) }}
          >
            <span className="ng-char-icon ng-char-icon--empty" style={{ width: 20, height: 20 }} />
            <span>{placeholder ?? '—'}</span>
          </div>
          {options.map((id) => {
            const icon = getIconForCharacter(id)
            return (
              <div
                key={id}
                className={`ng-char-select-option${value === id ? ' ng-char-select-option--selected' : ''}`}
                onClick={() => { onChange(id); setOpen(false) }}
              >
                {icon
                  ? <img className="ng-char-icon" src={icon} alt={id} width={20} height={20} />
                  : <span className="ng-char-icon ng-char-icon--empty" style={{ width: 20, height: 20 }} />}
                <span>{getDisplayName(id, language)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────

export function ModalsNewGame({ ctx }: { ctx: any }) {
  const {
    scriptOptions, playerNamePool, setPlayerNamePool, text, language,
    newGamePanel, setNewGamePanel, startNewGame, randomAssignCharacters,
  } = ctx

  const [activeTab, setActiveTab] = useState<'players' | 'characters' | 'config'>('players')
  const [showNamePool, setShowNamePool] = useState(false)
  const [quickFill, setQuickFill] = useState('')

  // ── All hooks must run unconditionally before any early return ──────────
  const script = scriptOptions.find((s: any) => s.slug === newGamePanel?.scriptSlug)
  const calcDist = CHARACTER_DISTRIBUTION[newGamePanel?.playerCount] ?? { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }

  const actCounts = useMemo(() => {
    const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    if (!newGamePanel) return c
    Object.values(newGamePanel.assignments).forEach((cid: any) => {
      const ch = characterById[cid]; if (ch && c[ch.team] !== undefined) c[ch.team]++
    })
    return c
  }, [newGamePanel?.assignments])

  const userCounts = useMemo(() => {
    const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    if (!newGamePanel) return c
    Object.values(newGamePanel.userAssignments).forEach((cid: any) => {
      if (!cid) return; const ch = characterById[cid]; if (ch && c[ch.team] !== undefined) c[ch.team]++
    })
    return c
  }, [newGamePanel?.userAssignments])

  const usedCharIds = useMemo(() => new Set([
    ...Object.values(newGamePanel?.assignments ?? {}).filter(Boolean),
    ...(newGamePanel?.demonBluffs ?? []).filter(Boolean),
  ]), [newGamePanel?.assignments, newGamePanel?.demonBluffs])

  const availableBluffs = useMemo(() =>
    (script?.characters ?? []).filter((id: string) => !Object.values(newGamePanel?.assignments ?? {}).includes(id)),
    [script, newGamePanel?.assignments])

  if (!newGamePanel) return null

  const updateConfig = (patch: Partial<typeof newGamePanel>) =>
    setNewGamePanel((prev: any) => prev ? { ...prev, ...patch } : prev)

  // ── Players tab helpers ───────────────────────────────────────────────
  const totalSeats = newGamePanel.playerCount + newGamePanel.travelerCount
  const seats = Array.from({ length: totalSeats }, (_, i) => i + 1)

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
    // add new names to pool
    const fresh = names.filter((n) => !playerNamePool.includes(n) && !/^Player \d+$|^Traveler \d+$/.test(n))
    if (fresh.length) setPlayerNamePool((p: string[]) => uniqueStrings([...p, ...fresh]))
  }

  function handlePoolNameClick(name: string) {
    // Assign to first seat with a default name
    const next = seats.find((n) => {
      const cur = newGamePanel.seatNames[n] ?? ''
      return !cur || /^Player \d+$|^Traveler \d+$/.test(cur)
    })
    if (next) updateConfig({ seatNames: { ...newGamePanel.seatNames, [next]: name } })
  }

  // ── Character tab helpers ─────────────────────────────────────────────
  function setActual(sNum: number, cid: string) {
    const ch = characterById[cid]
    // auto user = same as actual by default (remove override)
    const newUser = { ...newGamePanel.userAssignments }
    if (newUser[sNum] === newGamePanel.assignments[sNum] || newUser[sNum] === undefined) {
      delete newUser[sNum]
    }
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
    <div className="storyteller-modal" role="dialog" aria-modal="true">
      <div className="storyteller-modal__card ng-modal">
        <h3 className="ng-modal__title">{text.startNewGame}</h3>

        {/* ── Tab bar ── */}
        <div className="ng-tabs">
          {(['players', 'characters', 'config'] as const).map((tab) => (
            <button
              key={tab}
              className={`ng-tab-btn${activeTab === tab ? ' ng-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab === 'players'
                ? (language === 'zh' ? '玩家' : 'Players')
                : tab === 'characters'
                ? (language === 'zh' ? '角色' : 'Characters')
                : (language === 'zh' ? '配置' : 'Config')}
            </button>
          ))}
        </div>

        <div className="ng-modal__body">

          {/* ════════════════ PLAYERS TAB ════════════════ */}
          {activeTab === 'players' && (
            <div className="ng-players-tab">
              {/* Quick fill */}
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

              {/* Action row */}
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

              {/* Hidable name pool */}
              {showNamePool && (
                <div className="ng-name-pool">
                  {playerNamePool.length === 0
                    ? <span className="ng-name-pool__empty">{language === 'zh' ? '（空）' : '(empty)'}</span>
                    : playerNamePool.map((name: string) => (
                        <button
                          key={name}
                          className="ng-name-chip"
                          onClick={() => handlePoolNameClick(name)}
                          title={language === 'zh' ? '点击分配到下一个空位' : 'Click to assign to next empty seat'}
                          type="button"
                        >
                          {name}
                        </button>
                      ))
                  }
                </div>
              )}

              {/* Seat count controls */}
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

              {/* Seat name grid */}
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
          )}

          {/* ════════════════ CHARACTERS TAB ════════════════ */}
          {activeTab === 'characters' && (
            <div className="ng-characters-tab">
              {/* Script selector */}
              <label className="ng-script-row">
                <span>{text.script}</span>
                <select value={newGamePanel.scriptSlug} onChange={(e) => updateConfig({ scriptSlug: e.target.value, assignments: {}, userAssignments: {}, demonBluffs: [] })}>
                  {scriptOptions.map((s: any) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                </select>
              </label>

              {/* Distribution tracker — 3 rows */}
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

              {/* Action row */}
              <div className="ng-row ng-row--actions">
                <button className="secondary-button secondary-button--small" onClick={() => updateConfig({ assignments: randomAssignCharacters(newGamePanel) })} type="button">
                  {language === 'zh' ? '🎲 随机角色' : '🎲 Random'}
                </button>
                <button className="secondary-button secondary-button--small" onClick={() => updateConfig({ assignments: {}, userAssignments: {}, demonBluffs: [] })} type="button">
                  {language === 'zh' ? '↺ 重置' : '↺ Reset'}
                </button>
              </div>

              {/* Character rows — players only */}
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
                      {/* Seat label */}
                      <span className="ng-char-seat">{seatName}</span>

                      {/* Actual character */}
                      <div className="ng-char-actual">
                        <CharSelect
                          value={cid}
                          options={script?.characters ?? []}
                          language={language}
                          onChange={(id) => setActual(sNum, id)}
                        />
                        <TeamDot team={ch?.team} />
                      </div>

                      {/* User-perceived toggle */}
                      <div className="ng-char-user">
                        <button
                          className={`ng-user-toggle${hasUserOverride ? ' ng-user-toggle--active' : ''}`}
                          onClick={() => hasUserOverride ? setUserPerceived(sNum, null) : setUserPerceived(sNum, cid || null)}
                          title={hasUserOverride ? (language === 'zh' ? '关闭感知覆盖' : 'Clear user override') : (language === 'zh' ? '设置用户感知角色' : 'Set user-perceived role')}
                          type="button"
                        >
                          {hasUserOverride ? '👁' : '='}
                        </button>
                        {hasUserOverride && (
                          <div className="ng-char-actual">
                            <CharSelect
                              value={userCid ?? ''}
                              options={script?.characters ?? []}
                              language={language}
                              placeholder={language === 'zh' ? '感知角色…' : 'User char…'}
                              onChange={(id) => setUserPerceived(sNum, id || null)}
                            />
                            <TeamDot team={userCh?.team} />
                          </div>
                        )}
                      </div>

                      {/* Note */}
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

              {/* ── Demon Bluffs ── */}
              <div className="ng-bluffs">
                <div className="ng-bluffs__header">
                  <span className="ng-bluffs__title">{language === 'zh' ? '恶魔虚张' : 'Demon Bluffs'}</span>
                </div>
                <div className="ng-bluffs__slots">
                  {[0, 1, 2].map((idx) => {
                    const bluffId = newGamePanel.demonBluffs?.[idx] ?? ''
                    const bluffCh = characterById[bluffId]
                    return (
                      <div key={idx} className="ng-bluff-slot">
                        <CharSelect
                          value={bluffId}
                          options={availableBluffs}
                          language={language}
                          placeholder={language === 'zh' ? '选择…' : 'Pick…'}
                          onChange={(id) => setBluff(idx, id)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Travelers note section */}
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
          )}

          {/* ════════════════ CONFIG TAB ════════════════ */}
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

        {/* ── Footer ── */}
        <div className="ng-modal__footer">
          <button className="secondary-button" onClick={() => setNewGamePanel(null)} type="button">{text.cancelNewGame}</button>
          <button className="print-button" onClick={() => startNewGame(newGamePanel)} type="button">
            ▶ {text.startNewGame}
          </button>
        </div>
      </div>
    </div>
  )
}
