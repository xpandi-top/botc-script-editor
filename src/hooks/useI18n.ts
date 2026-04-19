import { useMemo } from 'react'
import { translations, type TranslationKey } from '../i18n'
import type { Language } from '../types'
import { t as translate } from '../i18n'

export type TextDict = Record<TranslationKey, string>

export function useI18n(language: Language): TextDict {
  return useMemo(() => {
    const dict: TextDict = {} as TextDict
    for (const key of Object.keys(translations) as TranslationKey[]) {
      dict[key] = translate(key, language)
    }
    return dict
  }, [language])
}

export { translations, type TranslationKey }