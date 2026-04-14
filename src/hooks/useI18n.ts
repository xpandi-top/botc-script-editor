import { useMemo } from 'react'
import { en } from '../i18n/en'
import { zh } from '../i18n/zh'
import type { Language } from '../types'

export type TextDict = typeof en

export function useI18n(language: Language): TextDict {
  return useMemo(() => (language === 'zh' ? zh as unknown as TextDict : en), [language])
}
