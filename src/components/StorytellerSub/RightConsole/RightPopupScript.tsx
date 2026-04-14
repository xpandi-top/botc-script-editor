// @ts-nocheck
import React from 'react'
import { nightOrder, getDisplayName, getIconForCharacter } from '../../../catalog'

type ScriptView = 'characters' | 'firstNight' | 'otherNight'

export function RightPopupScript({ ctx }: { ctx: any }) {
  const {
    language, currentScriptCharacters, activeScriptTitle, days,
    setActiveRightPopup, text,
  } = ctx

  const isDay1 = days.length === 0 || (days.length === 1 && days[0].day === 1)
  const [view, setView] = React.useState<ScriptView>(isDay1 ? 'firstNight' : 'otherNight')

  const characterIds: string[] = currentScriptCharacters?.map((c) =>
    typeof c === 'string' ? c : c.id
  ) ?? []

  const firstNightOrder = (nightOrder?.first_night ?? []).filter(
    (id) => characterIds.includes(id) || id === 'MINION_INFO' || id === 'DEMON_INFO'
  )
  const otherNightOrder = (nightOrder?.other_night ?? []).filter(
    (id) => characterIds.includes(id)
  )

  function renderNightList(ids: string[]) {
    return ids.length ? ids.map((id, i) => {
      if (id === 'MINION_INFO') return (
        <li className="storyteller-night-divider" key="minion-info">
          {language === 'zh' ? '——爪牙信息——' : '— Minion Info —'}
        </li>
      )
      if (id === 'DEMON_INFO') return (
        <li className="storyteller-night-divider" key="demon-info">
          {language === 'zh' ? '——恶魔信息——' : '— Demon Info —'}
        </li>
      )
      const icon = getIconForCharacter(id)
      const name = getDisplayName(id, language)
      return (
        <li className="storyteller-night-entry" key={`${id}-${i}`}>
          {icon && <img alt="" className="storyteller-night-entry__icon" src={icon} />}
          <span>{name || id}</span>
        </li>
      )
    }) : <li className="storyteller-panel__hint" style={{ listStyle: 'none' }}>—</li>
  }

  return (
    <div className="storyteller-right-popup__inner">
      <div className="storyteller-right-popup__header">
        <h3>{activeScriptTitle}</h3>
        <button className="secondary-button secondary-button--small" onClick={() => setActiveRightPopup(null)} type="button">✕</button>
      </div>

      <div className="storyteller-popup-tabs">
        <button
          className={`tab-button${view === 'characters' ? ' tab-button--active' : ''}`}
          onClick={() => setView('characters')}
          type="button"
        >{language === 'zh' ? '角色列表' : 'Characters'}</button>
        <button
          className={`tab-button${view === 'firstNight' ? ' tab-button--active' : ''}`}
          onClick={() => setView('firstNight')}
          type="button"
        >{language === 'zh' ? '第一夜顺序' : 'First Night'}</button>
        <button
          className={`tab-button${view === 'otherNight' ? ' tab-button--active' : ''}`}
          onClick={() => setView('otherNight')}
          type="button"
        >{language === 'zh' ? '其他夜晚顺序' : 'Other Nights'}</button>
      </div>

      <div className="storyteller-right-popup__scroll">
        {view === 'characters' && (
          <ul className="storyteller-script-char-list">
            {characterIds.length ? characterIds.map((id) => {
              const icon = getIconForCharacter(id)
              const name = getDisplayName(id, language)
              return (
                <li className="storyteller-script-char-entry" key={id}>
                  {icon && <img alt="" className="storyteller-night-entry__icon" src={icon} />}
                  <span>{name || id}</span>
                </li>
              )
            }) : <li className="storyteller-panel__hint" style={{ listStyle: 'none' }}>—</li>}
          </ul>
        )}

        {view === 'firstNight' && (
          <ol className="storyteller-night-list">
            {renderNightList(firstNightOrder)}
          </ol>
        )}

        {view === 'otherNight' && (
          <ol className="storyteller-night-list">
            {renderNightList(otherNightOrder)}
          </ol>
        )}
      </div>
    </div>
  )
}
