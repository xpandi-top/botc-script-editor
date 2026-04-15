// @ts-nocheck
import React from 'react'

function phaseLabel(phase: string, text: any): string {
  if (phase === 'night') return text.nightPhase
  if (phase === 'private') return text.privateChat
  if (phase === 'public') return text.publicChat
  if (phase === 'nomination') return text.nomination
  return phase
}

export function RightPopupLog({ ctx }: { ctx: any }) {
  const { days, logFilter, setLogFilter, aggregatedLog, setActiveRightPopup, toggleLogFilterType, text, language } = ctx

  const grouped = React.useMemo(() => {
    const map = new Map()
    for (const e of aggregatedLog) {
      const arr = map.get(e.day) ?? []
      arr.push(e)
      map.set(e.day, arr)
    }
    return Array.from(map.entries()).sort((a, b) => logFilter.sortAsc ? a[0] - b[0] : b[0] - a[0])
  }, [aggregatedLog, logFilter.sortAsc])

  return (
    <div className="storyteller-right-popup__inner">
      <div className="storyteller-right-popup__header">
        <h3>{text.aggregatedLog}</h3>
        <button className="secondary-button secondary-button--small" onClick={() => setActiveRightPopup(null)} type="button">✕</button>
      </div>

      <div className="storyteller-log-filters">
        <button className={`secondary-button secondary-button--small${logFilter.types.has('vote') ? ' tab-button--active' : ''}`} onClick={() => toggleLogFilterType('vote')} type="button">{text.filterVote}</button>
        <button className={`secondary-button secondary-button--small${logFilter.types.has('skill') ? ' tab-button--active' : ''}`} onClick={() => toggleLogFilterType('skill')} type="button">{text.filterSkill}</button>
        <button className={`secondary-button secondary-button--small${logFilter.types.has('event') ? ' tab-button--active' : ''}`} onClick={() => toggleLogFilterType('event')} type="button">{text.filterEvent}</button>
      </div>
      <div className="storyteller-log-filters">
        {(['all', 'public', 'st-only'] as const).map((v) => (
          <button key={v} className={`secondary-button secondary-button--small${logFilter.visibility === v ? ' tab-button--active' : ''}`} onClick={() => setLogFilter((p: any) => ({ ...p, visibility: v }))} type="button">
            {v === 'all' ? (language === 'zh' ? '全部' : 'All') : v === 'public' ? (language === 'zh' ? '公开' : 'Public') : (language === 'zh' ? '仅ST' : 'ST')}
          </button>
        ))}
        <select className="storyteller-day-select" onChange={(e) => setLogFilter((p: any) => ({ ...p, dayFilter: e.target.value === 'all' ? 'all' : Number(e.target.value) }))} value={logFilter.dayFilter}>
          <option value="all">{text.allDays}</option>
          {days.map((d: any) => <option key={d.id} value={d.day}>Day {d.day}</option>)}
        </select>
        <button className="secondary-button secondary-button--small" onClick={() => setLogFilter((p: any) => ({ ...p, sortAsc: !p.sortAsc }))} type="button">{logFilter.sortAsc ? '↑' : '↓'}</button>
      </div>

      <div className="storyteller-right-popup__entries">
        {grouped.length === 0 && <p className="storyteller-panel__hint">—</p>}
        {grouped.map(([day, entries]: [number, any[]]) => (
          <div className="storyteller-log-day-group" key={day}>
            <div className="storyteller-log-day-header">Day {day}</div>
            {entries.map((entry: any) => (
              <article className={`storyteller-log-entry storyteller-log-entry--${entry.type}${entry.visibility === 'st-only' ? ' storyteller-log-entry--st' : ''}`} key={entry.id}>
                <div className="storyteller-history__top">
                  <span className="storyteller-log-badge" data-type={entry.type}>{entry.type === 'vote' ? text.filterVote : entry.type === 'skill' ? text.filterSkill : text.filterEvent}</span>
                  {entry.visibility === 'st-only' && <span className="storyteller-log-st-badge">ST</span>}
                  {entry.phase && <span className="storyteller-log-phase">{phaseLabel(entry.phase, text)}</span>}
                </div>
                <p>{entry.detail}</p>
              </article>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
