import { useState } from 'react'
import { DealGuestPage } from './DealGuestPage'
import { I18nProvider } from '../context/I18nContext'
import { storageSync } from '../lib/storage'
import type { Language } from '../types'

const UI_LANGUAGE_KEY = 'botc-ui-language'

export function DealRouteApp() {
  const params = new URLSearchParams(window.location.search)
  const dealSessionId = params.get('deal')
  const [uiLanguage] = useState<Language>(() => {
    try { return (storageSync.getItem(UI_LANGUAGE_KEY) as Language) ?? 'zh' } catch { return 'zh' }
  })

  if (!dealSessionId) return null

  return (
    <I18nProvider language={uiLanguage}>
      <DealGuestPage
        sessionId={dealSessionId}
        language={uiLanguage}
      />
    </I18nProvider>
  )
}
