/**
 * useI18n — backward-compat hook for Storyteller components that use ctx.text.
 *
 * Returns the same TextDict shape as before, now derived from unified locale
 * files (assets/locales/*.json) via makeT so there is one source of truth.
 *
 * New code should use `useT()` from context/I18nContext instead.
 * Migrate ctx.text access gradually as components are updated.
 */

import { useMemo } from 'react'
import { makeT } from '../lib/t'
import type { Language } from '../types'
import { translations, type TranslationKey } from '../i18n'

export type TextDict = Record<TranslationKey, string>

function camelToSnake(s: string): string {
  return s.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`)
}

export function useI18n(language: Language): TextDict {
  return useMemo(() => {
    const t = makeT(language)
    const dict: Record<string, string> = {}

    for (const key of Object.keys(translations) as TranslationKey[]) {
      const snakeKey = camelToSnake(key)
      // makeT falls back to key string when not found — safe to call unconditionally
      const val = t(snakeKey as Parameters<typeof t>[0])
      // If makeT returned the key itself (not found), fall back to inline translation
      dict[key] = val !== snakeKey ? val : translations[key][language]
    }

    Object.assign(dict, {
      nightPhase: t('phase_night'),
      privateChat: t('phase_private'),
      publicChat: t('phase_public'),
      nomination: t('phase_nomination'),
      filterSkill: t('filter_ability'),
      quickSkill: t('quick_ability'),
      skillActor: t('ability_user'),
      skillTarget: t('ability_target'),
      skillTrail: t('ability_log'),
      useSkill: t('use_ability'),
    })

    return dict as TextDict
  }, [language])
}

export { translations, type TranslationKey }
