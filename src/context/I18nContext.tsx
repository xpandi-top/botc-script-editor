/**
 * I18nContext — single source of language + translation helpers.
 *
 * Usage in any component (no prop drilling needed):
 *
 *   const { t, tpl, language } = useT()
 *   t('save')                       // → "Save" | "保存"
 *   tpl('showing_n_of_m', 5, 100)   // → "Showing 5 of 100" | "显示 5 / 100"
 *
 * Wraps makeT / makeTpl from lib/t — locale data lives in assets/locales/*.json.
 * Re-derives helpers only when `language` changes.
 */

import React, { createContext, useContext, useMemo } from 'react'
import { makeT, makeTpl, type UiKey, type TplKey } from '../lib/t'
import type { Language } from '../types'

// ── Context shape ─────────────────────────────────────────────────────────────

type I18nCtx = {
  language: Language
  t: (key: UiKey) => string
  tpl: (key: TplKey, ...args: (string | number)[]) => string
}

const I18nContext = createContext<I18nCtx>({
  language: 'en',
  t: (key) => key as string,
  tpl: (key) => key as string,
})

// ── Provider ──────────────────────────────────────────────────────────────────

export function I18nProvider({
  language,
  children,
}: {
  language: Language
  children: React.ReactNode
}) {
  const value = useMemo<I18nCtx>(
    () => ({
      language,
      t: makeT(language),
      tpl: makeTpl(language),
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * `useT()` — primary i18n hook.
 *
 * Migration from old patterns:
 *
 *   OLD:  import { makeT, makeTpl } from '../../lib/t'
 *         const t = makeT(language)
 *         const tpl = makeTpl(language)
 *
 *   NEW:  import { useT } from '../../context/I18nContext'
 *         const { t, tpl, language } = useT()
 *
 *   OLD inline ternary:
 *         {language === 'zh' ? '保存' : 'Save'}
 *
 *   NEW:  {t('save')}
 *         (add missing keys to assets/locales/en.json + zh.json + UiKey in lib/t.ts)
 */
export const useT = (): I18nCtx => useContext(I18nContext)

// Re-export types for convenience
export type { UiKey, TplKey }
