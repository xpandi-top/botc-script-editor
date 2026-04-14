// @ts-nocheck
import React from 'react'
import { uniqueStrings } from '../constants'

export function RightPopupSettings({ ctx }: { ctx: any }) {
  const {
    language, timerDefaults, setTimerDefaults, customTagPool, setCustomTagPool,
    playerNamePool, setPlayerNamePool, currentDay, updateSeat, resetSeatNames,
    seatTagDrafts, setSeatTagDrafts, addCustomTag, clearUnusedCustomTags,
    loadTagsPreset, setLoadTagsPreset, setActiveRightPopup, text,
  } = ctx

  const [nameInput, setNameInput] = React.useState('')
  const [tagInput, setTagInput] = React.useState('')

  function addName() {
    const trimmed = nameInput.trim()
    if (!trimmed) return
    setPlayerNamePool((cur) => uniqueStrings([...cur, trimmed]))
    setNameInput('')
  }

  function addTag() {
    const trimmed = tagInput.trim()
    if (!trimmed) return
    setCustomTagPool((cur) => uniqueStrings([...cur, trimmed]))
    setTagInput('')
  }

  const defaultTags = language === 'zh'
    ? ['死亡', '处决', '旅人', '无投票权']
    : ['Dead', 'Executed', 'Traveler', 'No vote']

  return (
    <div className="storyteller-right-popup__inner">
      <div className="storyteller-right-popup__header">
        <h3>{text.settings}</h3>
        <button className="secondary-button secondary-button--small" onClick={() => setActiveRightPopup(null)} type="button">✕</button>
      </div>

      <div className="storyteller-right-popup__scroll">

        {/* ── Countdown Settings ── */}
        <section className="storyteller-popup-section">
          <h4 className="storyteller-popup-section__title">{language === 'zh' ? '倒计时设置' : 'Countdown Settings'}</h4>
          <div className="storyteller-settings-grid">
            <label className="editor-field">
              <span>{text.privateDefault}</span>
              <input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, privateSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.privateSeconds} />
            </label>
            <label className="editor-field">
              <span>{text.publicFreeDefault}</span>
              <input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, publicFreeSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.publicFreeSeconds} />
            </label>
            <label className="editor-field">
              <span>{text.publicRoundRobinDefault}</span>
              <input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, publicRoundRobinSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.publicRoundRobinSeconds} />
            </label>
            <label className="editor-field">
              <span>{text.nominationDelayDefault}</span>
              <input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationDelayMinutes: Number(e.target.value) }))} type="number" value={timerDefaults.nominationDelayMinutes} />
            </label>
            <label className="editor-field">
              <span>{text.nominationWaitDefault}</span>
              <input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationWaitSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationWaitSeconds} />
            </label>
            <label className="editor-field">
              <span>{text.actorSpeechDefault}</span>
              <input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationActorSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationActorSeconds} />
            </label>
            <label className="editor-field">
              <span>{text.targetSpeechDefault}</span>
              <input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationTargetSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationTargetSeconds} />
            </label>
            <label className="editor-field">
              <span>{text.voteDefault}</span>
              <input min="0" onChange={(e) => setTimerDefaults((c) => ({ ...c, nominationVoteSeconds: Number(e.target.value) }))} type="number" value={timerDefaults.nominationVoteSeconds} />
            </label>
          </div>
        </section>

        {/* ── Tag Settings ── */}
        <section className="storyteller-popup-section">
          <h4 className="storyteller-popup-section__title">{text.tagSettings}</h4>
          <div className="storyteller-console__label" style={{ marginBottom: '0.35rem' }}>{text.defaultTags}</div>
          <div className="storyteller-chip-row" style={{ marginBottom: '0.75rem' }}>
            {defaultTags.map((tag) => (
              <span className="storyteller-seat__pill" key={`default-${tag}`}>{tag}</span>
            ))}
          </div>

          <div className="storyteller-console__label" style={{ marginBottom: '0.35rem' }}>{text.loadPredefinedTags}</div>
          <div className="storyteller-popup-input-row" style={{ marginBottom: '0.75rem' }}>
            <textarea
              className="storyteller-preset-textarea"
              onChange={(e) => setLoadTagsPreset(e.target.value)}
              placeholder={language === 'zh' ? '逗号分隔标签...' : 'Comma-separated tags...'}
              rows={2}
              value={loadTagsPreset}
            />
            <button
              className="secondary-button secondary-button--small"
              onClick={() => {
                const tags = loadTagsPreset.split(',').map((t) => t.trim()).filter(Boolean)
                setCustomTagPool((cur) => uniqueStrings([...cur, ...tags]))
                setLoadTagsPreset('')
              }}
              type="button"
            >{text.loadPreset}</button>
          </div>

          <div className="storyteller-console__pool-header">
            <span className="storyteller-console__label">{text.tagPool}</span>
            <button className="secondary-button secondary-button--small" onClick={clearUnusedCustomTags} type="button">{text.clearUnusedTags}</button>
          </div>
          <div className="storyteller-chip-row">
            {customTagPool.map((tag) => (
              <span className="storyteller-tag-pool-item" key={`tagpool-${tag}`}>
                <span>{tag}</span>
                <button
                  className="storyteller-tag-pool-item__remove"
                  onClick={() => setCustomTagPool((cur) => cur.filter((t) => t !== tag))}
                  type="button"
                >×</button>
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
