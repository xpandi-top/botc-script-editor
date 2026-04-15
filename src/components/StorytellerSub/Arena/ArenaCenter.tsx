// @ts-nocheck
import React from 'react'
import { ArenaCenterLeft } from './ArenaCenterLeft'
import { ArenaCenterRight } from './ArenaCenterRight'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'

export function ArenaCenter({ ctx }: { ctx: any }) {
  const {
    days, currentDay, selectedDayIndex,
    goToNextDay, goToPreviousDay, setSelectedDayId,
    showInfoPanel, setShowInfoPanel,
    portraitOverride, setPortraitOverride,
    showNominationSheet, language,
  } = ctx

  // Determine effective portrait mode for the orientation toggle label
  const windowPortrait = typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  const effectivePortrait = portraitOverride !== null ? portraitOverride : windowPortrait

  return (
    <section
      className={[
        'storyteller-center',
        showNominationSheet && currentDay.phase === 'nomination' ? 'storyteller-center--sheet-open' : '',
        !showInfoPanel ? 'storyteller-center--info-hidden' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* ① Day navigation — always the topmost row */}
      <div className="storyteller-center__day-row" onClick={(e) => e.stopPropagation()}>
        <button
          className="storyteller-center__ctrl-btn"
          onClick={(e) => { e.stopPropagation(); goToPreviousDay() }}
          title={language === 'zh' ? '上一天' : 'Previous day'}
          type="button"
        >◀</button>

        <select
          className="storyteller-center__mode-select storyteller-center__day-select"
          onChange={(e) => setSelectedDayId(e.target.value)}
          value={currentDay.id}
        >
          {days.map((d: any) => (
            <option key={d.id} value={d.id}>Day {d.day}</option>
          ))}
        </select>

        <button
          className="storyteller-center__ctrl-btn"
          onClick={(e) => { e.stopPropagation(); goToNextDay() }}
          title={language === 'zh' ? '下一天' : 'Next day'}
          type="button"
        >▶</button>

        {/* Info panel toggle */}
        <button
          className={`storyteller-center__icon-btn${showInfoPanel ? ' storyteller-center__icon-btn--active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setShowInfoPanel((v: boolean) => !v) }}
          title={showInfoPanel ? (language === 'zh' ? '隐藏信息面板' : 'Hide info panel') : (language === 'zh' ? '显示信息面板' : 'Show info panel')}
          type="button"
        >
          {showInfoPanel ? '⊟' : '⊞'}
        </button>

        {/* Portrait / Landscape orientation toggle */}
        <button
          className={`storyteller-center__icon-btn${portraitOverride !== null ? ' storyteller-center__icon-btn--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            // Cycle: auto → portrait → landscape → auto
            if (portraitOverride === null) setPortraitOverride(true)
            else if (portraitOverride === true) setPortraitOverride(false)
            else setPortraitOverride(null)
          }}
          title={portraitOverride === null
            ? (language === 'zh' ? '方向: 自动' : 'Orientation: auto')
            : portraitOverride
              ? (language === 'zh' ? '方向: 纵向 (点击切换)' : 'Orientation: portrait (click to change)')
              : (language === 'zh' ? '方向: 横向 (点击切换)' : 'Orientation: landscape (click to change)')}
          type="button"
        >
          {portraitOverride === null ? '⇄' : effectivePortrait ? '⬜' : '⬛'}
        </button>
      </div>

      {/* ② Controls + Info columns */}
      <ArenaCenterLeft ctx={ctx} />
      {showInfoPanel && <ArenaCenterRight ctx={ctx} />}

      {/* ③ Nomination sheet */}
      <ArenaCenterNominationSheet ctx={ctx} />
    </section>
  )
}
