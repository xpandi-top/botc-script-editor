// @ts-nocheck
import React from 'react'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, createDefaultVoteDraft, FAKE_NAMES, FAKE_NAMES_ZH, uniqueStrings } from '../constants'


export function RightConsoleCompleted({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { language, gameRecords, loadGameRecord, text } = ctx

  return (
    <>
      {/* Saved Games */}
          <div className="storyteller-console__section" style={{ marginTop: '0.5rem' }}>
            <span className="storyteller-console__label">{language === 'zh' ? '已保存的游戏' : 'Saved Games'}</span>
            <div className="storyteller-history" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {gameRecords.length ? gameRecords.map((r) => (
                <article
                  className={`storyteller-history__item storyteller-history__item--clickable`}
                  key={r.id}
                  onClick={() => r.savedDays ? loadGameRecord(r) : undefined}
                  title={r.savedDays ? (language === 'zh' ? '点击加载此游戏' : 'Click to load this game') : ''}
                >
                  <div className="storyteller-history__top">
                    <strong>{r.recordName || r.scriptTitle || 'BOTC'}</strong>
                    {r.winner ? <span className="storyteller-history__ended-badge">{language === 'zh' ? '已结束' : 'Ended'}</span> : <span className="storyteller-history__saved-badge">{language === 'zh' ? '已保存' : 'Saved'}</span>}
                  </div>
                  <div className="storyteller-history__meta">
                    <span>{new Date(r.endedAt).toLocaleString()}</span>
                    <span>{r.days.map((d) => `D${d.day}`).join(', ')}</span>
                  </div>
                  {r.winner && <p>{text.winner}: {r.winner === 'evil' ? text.evil : text.good}</p>}
                  <span className="storyteller-history__load-hint">{language === 'zh' ? '↻ 点击加载' : '↻ Click to load'}</span>
                </article>
              )) : <p className="storyteller-panel__hint">{language === 'zh' ? '暂无保存的游戏' : 'No saved games'}</p>}
            </div>
          </div>
    </>
  )
}
