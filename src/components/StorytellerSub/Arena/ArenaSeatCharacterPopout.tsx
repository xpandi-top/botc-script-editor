// @ts-nocheck
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { getDisplayName, getIconForCharacter, getAbilityText } from '../../../catalog'
import { useIsMobile } from './useIsMobile'

const ST_TAG_PREFIX = '📝'

const DEFAULT_ST_TAGS: Record<string, string> = {
  drunk: '🍺',
  poisoned: '☠️',
  mad: '🤪',
}

export function ArenaSeatCharacterPopout({ ctx, seat }: { ctx: any, seat: any }) {
  const { language, characterPopoutSeat, setCharacterPopoutSeat, text, updateSeatWithLog, currentDay, currentScriptCharacters } = ctx;

  const isCharacterPopoutOpen = characterPopoutSeat === seat.seat;
  const isMobile = useIsMobile();

  const actualCharId = seat.characterId
  const perceivedCharId = seat.userCharacterId || seat.characterId
  const showDifferentPerception = seat.userCharacterId && seat.userCharacterId !== seat.characterId

  const [viewingPerceived, setViewingPerceived] = useState(false)
  const [showCharacterPicker, setShowCharacterPicker] = useState(!actualCharId)

  const displayedCharId = viewingPerceived ? perceivedCharId : actualCharId
  const displayedIcon = displayedCharId ? getIconForCharacter(displayedCharId) : null
  const displayedName = displayedCharId ? getDisplayName(displayedCharId, language) : ''
  const displayedAbility = displayedCharId ? getAbilityText(displayedCharId, language) : ''

  const stTags = seat.stTags || []
  const [stTagDraft, setStTagDraft] = useState('')

  const addStTag = () => {
    const trimmed = stTagDraft.trim()
    if (!trimmed) return
    updateSeatWithLog(seat.seat, (s) => ({
      ...s,
      stTags: [...(s.stTags || []), `${ST_TAG_PREFIX}${trimmed}`]
    }))
    setStTagDraft('')
  }

  const removeStTag = (tag: string) => {
    updateSeatWithLog(seat.seat, (s) => ({
      ...s,
      stTags: (s.stTags || []).filter((t: string) => t !== tag)
    }))
  }

  const addDefaultStTag = (tagKey: string) => {
    const tag = `${DEFAULT_ST_TAGS[tagKey] || ''} ${tagKey}`
    updateSeatWithLog(seat.seat, (s) => ({
      ...s,
      stTags: [...(s.stTags || []), `${ST_TAG_PREFIX}${tag}`]
    }))
  }

  const reassignCharacter = (newCharId: string) => {
    updateSeatWithLog(seat.seat, (s) => ({
      ...s,
      characterId: newCharId
    }))
    setShowCharacterPicker(false)
  }

  const setPerceivedCharacter = (newCharId: string) => {
    updateSeatWithLog(seat.seat, (s) => ({
      ...s,
      userCharacterId: newCharId
    }))
    setShowCharacterPicker(false)
  }

  if (!isCharacterPopoutOpen) return null;

  const actualIcon = actualCharId ? getIconForCharacter(actualCharId) : null
  const actualName = actualCharId ? getDisplayName(actualCharId, language) : ''
  const perceivedIcon = perceivedCharId && perceivedCharId !== actualCharId ? getIconForCharacter(perceivedCharId) : null
  const perceivedName = perceivedCharId && perceivedCharId !== actualCharId ? getDisplayName(perceivedCharId, language) : ''

  const content = (
    <>
      {isMobile && (
        <div className="storyteller-popout-backdrop" onClick={() => setCharacterPopoutSeat(null)} />
      )}
      <div className="storyteller-character-popout" onClick={(e) => e.stopPropagation()}>
        {actualCharId ? (
          <>
            {/* Header with character info */}
            <div className="storyteller-character-popout__header">
              <div className="storyteller-character-popout__char-section">
                <button
                  className={`storyteller-character-popout__char-btn${!viewingPerceived ? ' storyteller-character-popout__char-btn--active' : ''}`}
                  onClick={() => setViewingPerceived(false)}
                  type="button"
                >
                  {actualIcon ? <img alt="" className="storyteller-character-popout__icon" src={actualIcon as string} /> : null}
                  <span className="storyteller-character-popout__char-label">{actualName}</span>
                </button>
              </div>
              {showDifferentPerception && perceivedIcon ? (
                <div className="storyteller-character-popout__char-section">
                  <button
                    className={`storyteller-character-popout__char-btn storyteller-character-popout__char-btn--perceived${viewingPerceived ? ' storyteller-character-popout__char-btn--active' : ''}`}
                    onClick={() => setViewingPerceived(true)}
                    type="button"
                  >
                    {perceivedIcon ? <img alt="" className="storyteller-character-popout__icon" src={perceivedIcon as string} /> : null}
                    <span className="storyteller-character-popout__char-label">{perceivedName}</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Character ability */}
            <div className="storyteller-character-popout__ability">
              <p dangerouslySetInnerHTML={{ __html: displayedAbility }} />
            </div>

            {/* Quick action buttons */}
            <div className="storyteller-character-popout__actions">
              <button
                className="secondary-button secondary-button--small"
                onClick={() => setShowCharacterPicker((v) => !v)}
                type="button"
              >
                {language === 'zh' ? '🔄 更换角色' : '🔄 Change'}
              </button>
            </div>
          </>
        ) : (
          <div className="storyteller-character-popout__assign-header">
            <span className="storyteller-character-popout__assign-title">
              {language === 'zh' ? '分配角色' : 'Assign Character'}
            </span>
          </div>
        )}

        {/* Character picker */}
        {showCharacterPicker && (
          <div className="storyteller-character-popout__picker">
            <div className="storyteller-character-popout__picker-section">
              <span className="storyteller-character-popout__picker-label">{language === 'zh' ? '实际角色' : 'Actual Character'}</span>
              <div className="storyteller-character-popout__picker-grid">
                {currentScriptCharacters.map((c) => {
                  const icon = getIconForCharacter(c)
                  const name = getDisplayName(c, language)
                  return (
                    <button
                      className={`storyteller-character-popout__picker-btn${actualCharId === c ? ' storyteller-character-popout__picker-btn--active' : ''}`}
                      key={`actual-${c}`}
                      onClick={() => reassignCharacter(c)}
                      type="button"
                    >
                      {icon ? <img alt="" className="storyteller-character-popout__picker-icon" src={icon as string} /> : null}
                      <span>{name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="storyteller-character-popout__picker-section">
              <span className="storyteller-character-popout__picker-label">{language === 'zh' ? '玩家以为' : 'Perceived Character'}</span>
              <div className="storyteller-character-popout__picker-grid">
                {currentScriptCharacters.map((c) => {
                  const icon = getIconForCharacter(c)
                  const name = getDisplayName(c, language)
                  return (
                    <button
                      className={`storyteller-character-popout__picker-btn${perceivedCharId === c ? ' storyteller-character-popout__picker-btn--active' : ''}`}
                      key={`perceived-${c}`}
                      onClick={() => setPerceivedCharacter(c)}
                      type="button"
                    >
                      {icon ? <img alt="" className="storyteller-character-popout__picker-icon" src={icon as string} /> : null}
                      <span>{name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {actualCharId && (
          <>
            {/* Default ST tags */}
            <div className="storyteller-character-popout__default-tags">
              <span className="storyteller-character-popout__st-tags-label">{language === 'zh' ? '快捷标签' : 'Quick Tags'}</span>
              <div className="storyteller-character-popout__default-tags-list">
                {Object.entries(DEFAULT_ST_TAGS).map(([key, emoji]) => (
                  <button
                    className="storyteller-character-popout__default-tag"
                    key={key}
                    onClick={() => addDefaultStTag(key)}
                    type="button"
                    title={language === 'zh' ? `添加${key}` : `Add ${key}`}
                  >
                    {emoji} {language === 'zh' ? key : key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* ST-only tags section */}
            <div className="storyteller-character-popout__st-tags">
              <span className="storyteller-character-popout__st-tags-label">{language === 'zh' ? 'ST专属标签' : 'ST Tags'}</span>
              <div className="storyteller-character-popout__st-tags-list">
                {stTags.map((tag: string) => (
                  <span
                    className="storyteller-character-popout__st-tag"
                    key={`st-${tag}`}
                    onClick={() => removeStTag(tag)}
                    title={language === 'zh' ? '点击移除' : 'Click to remove'}
                  >
                    {tag.replace(ST_TAG_PREFIX, '')}
                    <span className="storyteller-character-popout__st-tag-remove">×</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="storyteller-character-popout__st-tag-input">
              <input
                onChange={(e) => setStTagDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStTag() } }}
                placeholder={language === 'zh' ? '添加标签...' : 'Add tag...'}
                type="text"
                value={stTagDraft}
              />
              <button
                className="storyteller-character-popout__st-tag-add"
                onClick={addStTag}
                type="button"
              >+</button>
            </div>
          </>
        )}

        {/* Close button */}
        <button
          className="storyteller-character-popout__close"
          onClick={() => setCharacterPopoutSeat(null)}
          type="button"
        >
          {language === 'zh' ? '关闭' : 'Close'}
        </button>
      </div>
    </>
  );

  return isMobile ? createPortal(content, document.body) : content;
}
