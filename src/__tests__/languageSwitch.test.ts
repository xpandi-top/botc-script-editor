/**
 * P0 — Language switch: key i18n functions produce correct EN/ZH output.
 *
 * Covers logPhrase, logDetail, translateStTag, makeT across both languages.
 * No component rendering — pure function coverage ensures i18n is wired
 * correctly regardless of which language is active.
 */
import { describe, it, expect } from 'vitest'
import { logPhrase, logDetail } from '../utils/logI18n'
import { translateStTag } from '../components/StorytellerSub/Arena/ArenaSeatComponents'
import { makeT } from '../lib/t'

// ── logPhrase ─────────────────────────────────────────────────────────────────

describe('logPhrase — EN', () => {
  const lang = 'en' as const

  it('seat state phrases', () => {
    expect(logPhrase(lang, 'alive')).toBe('revived')
    expect(logPhrase(lang, 'dead')).toBe('died')
    expect(logPhrase(lang, 'executed')).toBe('marked executed')
    expect(logPhrase(lang, 'noVote')).toBe('lost vote token')
  })

  it('nomination phrases', () => {
    expect(logPhrase(lang, 'nominated')).toBe('nominated')
    expect(logPhrase(lang, 'pass')).toBe('passed')
    expect(logPhrase(lang, 'fail')).toBe('failed')
    expect(logPhrase(lang, 'nominationFailed')).toBe('Nomination failed')
  })

  it('tag verb phrases', () => {
    expect(logPhrase(lang, 'addST')).toBe('tagged')
    expect(logPhrase(lang, 'removeST')).toBe('tag removed')
    expect(logPhrase(lang, 'addTag')).toBe('tagged')
    expect(logPhrase(lang, 'removeTag')).toBe('tag removed')
  })

  it('phase labels', () => {
    expect(logPhrase(lang, 'night')).toBe('Night')
    expect(logPhrase(lang, 'nomination')).toBe('Nomination')
    expect(logPhrase(lang, 'public')).toBe('Public')
  })

  it('falls back to key for unknown phrase', () => {
    expect(logPhrase(lang, 'unknown_key' as any)).toBe('unknown_key')
  })
})

describe('logPhrase — ZH', () => {
  const lang = 'zh' as const

  it('seat state phrases', () => {
    expect(logPhrase(lang, 'alive')).toBe('复活')
    expect(logPhrase(lang, 'dead')).toBe('死亡')
    expect(logPhrase(lang, 'executed')).toBe('标记处决')
    expect(logPhrase(lang, 'noVote')).toBe('失去投票权')
  })

  it('nomination phrases', () => {
    expect(logPhrase(lang, 'nominated')).toBe('提名')
    expect(logPhrase(lang, 'pass')).toBe('通过')
    expect(logPhrase(lang, 'fail')).toBe('失败')
    expect(logPhrase(lang, 'nominationFailed')).toBe('提名失败')
  })

  it('tag verb phrases', () => {
    expect(logPhrase(lang, 'addST')).toBe('添加标签')
    expect(logPhrase(lang, 'removeST')).toBe('移除标签')
  })

  it('phase labels', () => {
    expect(logPhrase(lang, 'night')).toBe('夜晚')
    expect(logPhrase(lang, 'nomination')).toBe('提名')
    expect(logPhrase(lang, 'public')).toBe('公聊')
  })
})

// ── logDetail compound strings ────────────────────────────────────────────────

describe('logDetail — EN', () => {
  it('seatAlive', () => expect(logDetail.seatAlive('en', 3)).toBe('#3 revived'))
  it('seatDead', () => expect(logDetail.seatDead('en', 5)).toBe('#5 died'))
  it('seatExecuted', () => expect(logDetail.seatExecuted('en', 2)).toBe('#2 marked executed'))
  it('seatNoVote', () => expect(logDetail.seatNoVote('en', 7)).toBe('#7 lost vote token'))
  it('seatUnNoVote', () => expect(logDetail.seatUnNoVote('en', 7)).toBe('#7 regained vote token'))
  it('voteResult pass', () => expect(logDetail.voteResult('en', 1, 4, true, 5, 4)).toBe('#1 nominated #4 — passed (5/4)'))
  it('voteResult fail', () => expect(logDetail.voteResult('en', 2, 3, false, 2, 5)).toBe('#2 nominated #3 — failed (2/5)'))
  it('nominationFailed', () => expect(logDetail.nominationFailed('en', 1, 2)).toBe('Nomination failed: #1 → #2'))
  it('phase night', () => expect(logDetail.phase('en', 'night')).toBe('Night'))
})

describe('logDetail — ZH', () => {
  it('seatAlive', () => expect(logDetail.seatAlive('zh', 3)).toBe('#3 复活'))
  it('seatDead', () => expect(logDetail.seatDead('zh', 5)).toBe('#5 死亡'))
  it('seatExecuted', () => expect(logDetail.seatExecuted('zh', 2)).toBe('#2 标记处决'))
  it('seatNoVote', () => expect(logDetail.seatNoVote('zh', 7)).toBe('#7 失去投票权'))
  it('voteResult pass', () => expect(logDetail.voteResult('zh', 1, 4, true, 5, 4)).toBe('#1 提名 #4 — 通过 (5/4)'))
  it('voteResult fail', () => expect(logDetail.voteResult('zh', 2, 3, false, 2, 5)).toBe('#2 提名 #3 — 失败 (2/5)'))
  it('nominationFailed', () => expect(logDetail.nominationFailed('zh', 1, 2)).toBe('提名失败: #1 → #2'))
  it('phase night', () => expect(logDetail.phase('zh', 'night')).toBe('夜晚'))
  it('phase nomination', () => expect(logDetail.phase('zh', 'nomination')).toBe('提名'))
})

// ── makeT locale keys ────────────────────────────────────────────────────────

describe('makeT — key locale strings', () => {
  it('EN: game terms', () => {
    const t = makeT('en')
    expect(t('nomination')).toBe('Nomination')
    expect(t('execution')).toBe('Execution')
    expect(t('vote')).toBe('Vote')
    expect(t('drunk')).toBe('Drunk')
    expect(t('poisoned')).toBe('Poisoned')
    expect(t('demon_bluffs')).toBe('Demon Bluffs')
  })

  it('ZH: game terms', () => {
    const t = makeT('zh')
    expect(t('nomination')).toBe('提名')
    expect(t('execution')).toBe('处决')
    expect(t('vote')).toBe('投票')
    expect(t('drunk')).toBe('醉酒')
    expect(t('poisoned')).toBe('中毒')
    expect(t('demon_bluffs')).toBe('恶魔伪装')
  })

  it('EN: ST tag keys', () => {
    const t = makeT('en')
    expect(t('drunk_tag')).toBe('Drunk')
    expect(t('poisoned_tag')).toBe('Poisoned')
    expect(t('protected_tag')).toBe('Protected')
    expect(t('used_tag')).toBe('Used')
    expect(t('red_herring')).toBe('Red Herring')
  })

  it('ZH: ST tag keys', () => {
    const t = makeT('zh')
    expect(t('drunk_tag')).toBe('醉酒')
    expect(t('poisoned_tag')).toBe('中毒')
    expect(t('protected_tag')).toBe('受保护')
    expect(t('used_tag')).toBe('已使用')
    expect(t('red_herring')).toBe('干扰项')
  })

  it('falls back to key string for missing key', () => {
    const t = makeT('en')
    expect(t('nonexistent_key_xyz' as any)).toBe('nonexistent_key_xyz')
  })
})

// ── translateStTag EN/ZH (cross-check with makeT) ────────────────────────────

describe('translateStTag consistency with makeT', () => {
  const tags = ['drunk', 'poisoned', 'protected', 'used', 'red herring'] as const
  const keyMap: Record<string, string> = {
    'drunk': 'drunk_tag', 'poisoned': 'poisoned_tag',
    'protected': 'protected_tag', 'used': 'used_tag', 'red herring': 'red_herring',
  }

  for (const tag of tags) {
    it(`translateStTag('${tag}') matches t('${keyMap[tag]}') in EN`, () => {
      const t = makeT('en')
      expect(translateStTag(tag, 'en')).toBe(t(keyMap[tag] as any))
    })
    it(`translateStTag('${tag}') matches t('${keyMap[tag]}') in ZH`, () => {
      const t = makeT('zh')
      expect(translateStTag(tag, 'zh')).toBe(t(keyMap[tag] as any))
    })
  }
})
