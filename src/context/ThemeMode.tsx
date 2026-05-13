import React, { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { makeTheme } from '../theme/makeTheme'
import type { ThemeMode } from '../theme/makeTheme'

interface ThemeModeCtx {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  toggleMode: () => void
}

const ThemeModeContext = createContext<ThemeModeCtx>({
  mode: 'light',
  setMode: () => {},
  toggleMode: () => {},
})

export const useThemeMode = () => useContext(ThemeModeContext)

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      return (localStorage.getItem('botc-theme-mode') as ThemeMode) ?? 'light'
    } catch {
      return 'light'
    }
  })

  // Re-render when OS colour scheme changes while mode === 'system'
  const [osTick, setOsTick] = useState(0)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => { if (mode === 'system') setOsTick((n) => n + 1) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const setMode = (m: ThemeMode) => {
    setModeState(m)
    try { localStorage.setItem('botc-theme-mode', m) } catch {}
  }

  const toggleMode = () => setMode(mode === 'light' ? 'dark' : 'light')

  // osTick forces re-derive when OS pref changes while mode === 'system'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const theme = useMemo(() => makeTheme(mode), [mode, osTick])

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, toggleMode }}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
