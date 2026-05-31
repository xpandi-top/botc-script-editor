import { useState } from 'react'
import { DealGuestPage } from './DealGuestPage'
import { DealHostPage } from './DealHostPage'
import { HOST_TOKEN_KEY } from '../lib/firebaseDeal'
import { I18nProvider } from '../context/I18nContext'
import { storageSync } from '../lib/storage'
import type { Language } from '../types'

const UI_LANGUAGE_KEY = 'botc-ui-language'

export function DealRouteApp() {
  const params = new URLSearchParams(window.location.search)
  const dealSessionId = params.get('deal')
  const dealHostToken = params.get('host')
  const [uiLanguage] = useState<Language>(() => {
    try { return (storageSync.getItem(UI_LANGUAGE_KEY) as Language) ?? 'zh' } catch { return 'zh' }
  })

  if (!dealSessionId) return null

  const resolvedHostToken = dealHostToken ?? (() => {
    try { return localStorage.getItem(HOST_TOKEN_KEY(dealSessionId)) } catch { return null }
  })()

  if (resolvedHostToken) {
    return (
      <I18nProvider language={uiLanguage}>
        <DealHostPage
          sessionId={dealSessionId}
          hostToken={resolvedHostToken}
          language={uiLanguage}
          onClose={() => {
            const clean = new URL(window.location.href)
            clean.searchParams.delete('deal')
            clean.searchParams.delete('host')
            window.history.replaceState({}, '', clean.toString())
            window.location.reload()
          }}
        />
      </I18nProvider>
    )
  }

  return (
    <I18nProvider language={uiLanguage}>
      <DealGuestPage
        sessionId={dealSessionId}
        language={uiLanguage}
      />
    </I18nProvider>
  )
}
