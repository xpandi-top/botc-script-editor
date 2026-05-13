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
  alive:            { en: 'revived',           zh: '复活'       },
  dead:             { en: 'died',              zh: '死亡'       },
  executed:         { en: '+executed',         zh: '+处决'      },
  unexecuted:       { en: '-executed',         zh: '-处决'      },
  traveler:         { en: '+traveler',         zh: '+旅行者'    },
  untraveler:       { en: '-traveler',         zh: '-旅行者'    },
  noVote:           { en: '+no-vote',          zh: '+无投票权'  },
  unNoVote:         { en: '-no-vote',          zh: '-无投票权'  },
  nominationFailed: { en: 'Nomination failed', zh: '提名失败'   },
  pass:             { en: 'PASS',              zh: '通过'       },
  fail:             { en: 'FAIL',              zh: '失败'       },
  // phases
  night:            { en: 'Night',             zh: '夜晚'       },
  private:          { en: 'Private',           zh: '私聊'       },
  public:           { en: 'Public',            zh: '公众议事'   },
  nomination:       { en: 'Nomination',        zh: '提名'       },
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

  nominationFailed: (lang: Language, actor: number | string, target: number | string) =>
    `${logPhrase(lang, 'nominationFailed')}: #${actor} → #${target}`,

  voteResult: (lang: Language, actor: number | string, target: number | string, passed: boolean, voteCount: number, required: number) =>
    `#${actor} → #${target}: ${logPhrase(lang, passed ? 'pass' : 'fail')} (${voteCount}/${required})`,

  phase: (lang: Language, phase: string) => logPhrase(lang, phase as LogKey),
}
