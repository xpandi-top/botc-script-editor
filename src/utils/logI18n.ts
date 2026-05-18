/**
 * logDetail — centralised i18n for event-log detail strings.
 *
 * All detail strings written into the event log (stateChange, phaseTransition,
 * vote, skill) must go through here so EN/ZH output is consistent.
 *
 * Usage:
 *   logDetail(language, 'dead', { seat: 3 })           → "#3 死亡" | "#3 died"
 *   logDetail(language, 'pass')                         → "通过"  | "PASS"
 *   logDetail(language, 'phase', { phase: 'night' })    → "夜晚"  | "Night"
 */

import type { Language } from '../types'

// ── Phrase map ────────────────────────────────────────────────────────────────

const PHRASES: Record<string, { en: string; zh: string }> = {
  // Seat state changes
  alive:            { en: 'revived',              zh: '复活'       },
  dead:             { en: 'died',                 zh: '死亡'       },
  executed:         { en: 'marked executed',      zh: '标记处决'   },
  unexecuted:       { en: 'execution cleared',    zh: '取消处决'   },
  traveler:         { en: 'became traveler',      zh: '设为旅行者' },
  untraveler:       { en: 'traveler removed',     zh: '取消旅行者' },
  noVote:           { en: 'lost vote token',      zh: '失去投票权' },
  unNoVote:         { en: 'regained vote token',  zh: '恢复投票权' },
  // Nomination
  nominationFailed: { en: 'Nomination failed',    zh: '提名失败'   },
  nominated:        { en: 'nominated',            zh: '提名'       },
  pass:             { en: 'passed',               zh: '通过'       },
  fail:             { en: 'failed',               zh: '失败'       },
  // Skill result tags
  success:          { en: '[success]',            zh: '[成功]'     },
  failure:          { en: '[fail]',               zh: '[失败]'     },
  // Skill verb types
  know:             { en: 'know',                 zh: '得知'       },
  guess:            { en: 'guess',                zh: '猜测'       },
  change:           { en: 'change',               zh: '改变'       },
  // Skill result content
  good:             { en: 'Good',                 zh: '善良'       },
  evil:             { en: 'Evil',                 zh: '邪恶'       },
  sameTeam:         { en: 'same team',            zh: '同阵营'     },
  diffTeam:         { en: 'diff team',            zh: '不同阵营'   },
  sameType:         { en: 'same type',            zh: '同类型'     },
  diffType:         { en: 'diff type',            zh: '不同类型'   },
  true:             { en: 'True',                 zh: '真'         },
  false:            { en: 'False',                zh: '假'         },
  charPrefix:       { en: 'char',                 zh: '角色'       },
  teamPrefix:       { en: 'team',                 zh: '阵营'       },
  // Tag add/remove verbs
  addST:            { en: 'tagged',               zh: '添加标签'   },
  removeST:         { en: 'tag removed',          zh: '移除标签'   },
  addTag:           { en: 'tagged',               zh: '标签'       },
  removeTag:        { en: 'tag removed',          zh: '移除标签'   },
  // Role assignment
  roleAssigned:     { en: 'role assigned',        zh: '分配角色'   },
  roleChanged:      { en: 'role changed',         zh: '角色变更'   },
  roleCleared:      { en: 'role cleared',         zh: '角色清除'   },
  // Phases
  night:            { en: 'Night',                zh: '夜晚'       },
  private:          { en: 'Private',              zh: '私聊'       },
  public:           { en: 'Public',               zh: '公众议事'   },
  nomination:       { en: 'Nomination',           zh: '提名'       },
}

type LogKey = keyof typeof PHRASES

// ── Builder ───────────────────────────────────────────────────────────────────

/** Returns translated phrase for `key`. Falls back to key string. */
export function logPhrase(language: Language, key: LogKey): string {
  return PHRASES[key]?.[language] ?? key
}

/**
 * Helpers for common compound detail strings.
 * Keep format `#<seat> <action>` consistent everywhere.
 */
export const logDetail = {
  seatAlive:        (lang: Language, seat: number) => `#${seat} ${logPhrase(lang, 'alive')}`,
  seatDead:         (lang: Language, seat: number) => `#${seat} ${logPhrase(lang, 'dead')}`,
  seatExecuted:     (lang: Language, seat: number) => `#${seat} ${logPhrase(lang, 'executed')}`,
  seatUnexecuted:   (lang: Language, seat: number) => `#${seat} ${logPhrase(lang, 'unexecuted')}`,
  seatTraveler:     (lang: Language, seat: number) => `#${seat} ${logPhrase(lang, 'traveler')}`,
  seatUntraveler:   (lang: Language, seat: number) => `#${seat} ${logPhrase(lang, 'untraveler')}`,
  seatNoVote:       (lang: Language, seat: number) => `#${seat} ${logPhrase(lang, 'noVote')}`,
  seatUnNoVote:     (lang: Language, seat: number) => `#${seat} ${logPhrase(lang, 'unNoVote')}`,

  nominationFailed: (lang: Language, actor: number | string, target: number | string) => {
    const targetLabel = target === 0 || target === '0' ? (lang === 'zh' ? '[说书人]' : '[ST]') : `#${target}`
    return `${logPhrase(lang, 'nominationFailed')}: #${actor} → ${targetLabel}`
  },

  voteResult: (lang: Language, actor: number | string, target: number | string, passed: boolean, voteCount: number, required: number) => {
    const targetLabel = target === 0 || target === '0' ? (lang === 'zh' ? '[说书人]' : '[ST]') : `#${target}`
    return `#${actor} ${logPhrase(lang, 'nominated')} ${targetLabel} — ${logPhrase(lang, passed ? 'pass' : 'fail')} (${voteCount}/${required})`
  },

  /** `[success]` or `[fail]` tag embedded in skill statement */
  skillResultTag: (lang: Language, isSuccess: boolean) =>
    logPhrase(lang, isSuccess ? 'success' : 'failure'),

  /** Translate stored `SkillRecord.result` field ('success' | 'failure' | null) */
  skillResultLabel: (lang: Language, result: string | null) =>
    result ? logPhrase(lang, result as LogKey) : '',

  phase: (lang: Language, phase: string) => logPhrase(lang, phase as LogKey),
}
