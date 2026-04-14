// @ts-nocheck
import React from 'react'

export function RightPopupLog({ ctx }: { ctx: any }) {
  const {
    days, logFilter, setLogFilter, aggregatedLog, setActiveRightPopup,
    toggleLogFilterType, text,
  } = ctx

  return (
    <div className="storyteller-right-popup__inner">
      <div className="storyteller-right-popup__header">
        <h3>{text.aggregatedLog}</h3>
        <button className="secondary-button secondary-button--small" onClick={() => setActiveRightPopup(null)} type="button">✕</button>
      </div>

      <div className="storyteller-log-filters">
        <button
          className={`secondary-button secondary-button--small${logFilter.types.has('vote') ? ' tab-button--active' : ''}`}
          onClick={() => toggleLogFilterType('vote')}
          type="button"
        >{text.filterVote}</button>
        <button
          className={`secondary-button secondary-button--small${logFilter.types.has('skill') ? ' tab-button--active' : ''}`}
          onClick={() => toggleLogFilterType('skill')}
          type="button"
        >{text.filterSkill}</button>
        <button
          className={`secondary-button secondary-button--small${logFilter.types.has('event') ? ' tab-button--active' : ''}`}
          onClick={() => toggleLogFilterType('event')}
          type="button"
        >{text.filterEvent}</button>
        <select
          className="storyteller-day-select"
          onChange={(e) => setLogFilter((prev) => ({ ...prev, dayFilter: e.target.value === 'all' ? 'all' : Number(e.target.value) }))}
          value={logFilter.dayFilter}
        >
          <option value="all">{text.allDays}</option>
          {days.map((d) => <option key={d.id} value={d.day}>Day {d.day}</option>)}
        </select>
        <button
          className="secondary-button secondary-button--small"
          onClick={() => setLogFilter((prev) => ({ ...prev, sortAsc: !prev.sortAsc }))}
          type="button"
        >{logFilter.sortAsc ? text.sortAsc : text.sortDesc}</button>
      </div>

      <div className="storyteller-right-popup__entries">
        {aggregatedLog.length ? aggregatedLog.map((entry) => (
          <article className={`storyteller-log-entry storyteller-log-entry--${entry.type}`} key={entry.id}>
            <div className="storyteller-history__top">
              <span className="storyteller-log-badge" data-type={entry.type}>
                {entry.type === 'vote' ? text.filterVote : entry.type === 'skill' ? text.filterSkill : text.filterEvent}
              </span>
              <span>Day {entry.day}</span>
            </div>
            <p>{entry.detail}</p>
          </article>
        )) : <p className="storyteller-panel__hint">—</p>}
      </div>
    </div>
  )
}
