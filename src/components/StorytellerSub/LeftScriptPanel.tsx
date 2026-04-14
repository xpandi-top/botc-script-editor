// @ts-nocheck
import React from 'react'
import { nightOrder, getDisplayName, getIconForCharacter, getAbilityText } from '../../catalog'

type ScriptView = 'characters' | 'firstNight' | 'otherNight'

export function LeftScriptPanel({ ctx }: { ctx: any }) {
  const {
    language, currentScriptCharacters, activeScriptTitle, days,
    setShowScriptPanel, showScriptPanel,
  } = ctx

  const isDay1 = days.length === 0 || (days.length === 1 && days[0].day === 1)
  const [view, setView] = React.useState<ScriptView>(isDay1 ? 'firstNight' : 'otherNight')
  const [selectedCharId, setSelectedCharId] = React.useState<string | null>(null)

  const characterIds: string[] = currentScriptCharacters?.map((c) =>
    typeof c === 'string' ? c : c.id
  ) ?? []

  // Fix: data key is "other_nights" (plural), not "other_night"
  const firstNightOrder = (nightOrder?.first_night ?? []).filter(
    (id) => characterIds.includes(id) || id === 'MINION_INFO' || id === 'DEMON_INFO'
  )
  const otherNightOrder = (nightOrder?.other_nights ?? []).filter(
    (id) => characterIds.includes(id)
  )

  function handleCharClick(id: string) {
    setSelectedCharId((prev) => prev === id ? null : id)
  }

  function renderDescription(id: string) {
    const ability = getAbilityText(id, language) ?? getAbilityText(id, 'en')
    if (!ability) return null
    return (
      <div className="storyteller-char-desc">
        <p>{ability}</p>
      </div>
    )
  }

  function renderNightList(ids: string[]) {
    if (!ids.length) return <li className="storyteller-panel__hint" style={{ listStyle: 'none' }}>—</li>
    return ids.map((id, i) => {
      if (id === 'MINION_INFO') return (
        <li className="storyteller-night-divider" key="minion-info">
          {language === 'zh' ? '—爪牙信息—' : '— Minion Info —'}
        </li>
      )
      if (id === 'DEMON_INFO') return (
        <li className="storyteller-night-divider" key="demon-info">
          {language === 'zh' ? '—恶魔信息—' : '— Demon Info —'}
        </li>
      )
      const icon = getIconForCharacter(id)
      const name = getDisplayName(id, language)
      const isSelected = selectedCharId === id
      return (
        <li key={`${id}-${i}`}>
          <button
            className={`storyteller-night-entry storyteller-night-entry--btn${isSelected ? ' storyteller-night-entry--active' : ''}`}
            onClick={() => handleCharClick(id)}
            type="button"
          >
            {icon && <img alt="" className="storyteller-night-entry__icon" src={icon} />}
            <span>{name || id}</span>
          </button>
          {isSelected && renderDescription(id)}
        </li>
      )
    })
  }

  return (
    <>
      {showScriptPanel && (
        <div className="storyteller-drawer-backdrop" onClick={() => setShowScriptPanel(false)} />
      )}
    <aside className={`storyteller-left-panel${showScriptPanel ? ' storyteller-left-panel--open' : ''}`}>
      <div className="storyteller-right-popup__header">
        <h3>{activeScriptTitle || (language === 'zh' ? '剧本' : 'Script')}</h3>
        <button className="secondary-button secondary-button--small" onClick={() => setShowScriptPanel(false)} type="button">✕</button>
      </div>

      <div className="storyteller-popup-tabs">
        <button className={`tab-button${view === 'characters' ? ' tab-button--active' : ''}`} onClick={() => setView('characters')} type="button">
          {language === 'zh' ? '角色' : 'Characters'}
        </button>
        <button className={`tab-button${view === 'firstNight' ? ' tab-button--active' : ''}`} onClick={() => setView('firstNight')} type="button">
          {language === 'zh' ? '第一夜' : 'First Night'}
        </button>
        <button className={`tab-button${view === 'otherNight' ? ' tab-button--active' : ''}`} onClick={() => setView('otherNight')} type="button">
          {language === 'zh' ? '其他夜晚' : 'Other Nights'}
        </button>
      </div>

      <div className="storyteller-right-popup__scroll">
        {view === 'characters' && (
          <ul className="storyteller-script-char-list">
            {characterIds.length ? characterIds.map((id) => {
              const icon = getIconForCharacter(id)
              const name = getDisplayName(id, language)
              const isSelected = selectedCharId === id
              return (
                <li key={id}>
                  <button
                    className={`storyteller-script-char-entry storyteller-night-entry--btn${isSelected ? ' storyteller-night-entry--active' : ''}`}
                    onClick={() => handleCharClick(id)}
                    type="button"
                  >
                    {icon && <img alt="" className="storyteller-night-entry__icon" src={icon} />}
                    <span>{name || id}</span>
                  </button>
                  {isSelected && renderDescription(id)}
                </li>
              )
            }) : <li className="storyteller-panel__hint" style={{ listStyle: 'none' }}>—</li>}
          </ul>
        )}
        {view === 'firstNight' && <ol className="storyteller-night-list">{renderNightList(firstNightOrder)}</ol>}
        {view === 'otherNight' && <ol className="storyteller-night-list">{renderNightList(otherNightOrder)}</ol>}
      </div>
    </aside>
    </>
  )
}
