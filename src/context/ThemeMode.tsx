import React, { createContext, useContext, useState, useMemo } from 'react'
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

  const setMode = (m: ThemeMode) => {
    setModeState(m)
    try { localStorage.setItem('botc-theme-mode', m) } catch {}
  }

  const toggleMode = () => setMode(mode === 'light' ? 'dark' : 'light')

  const theme = useMemo(() => makeTheme(mode), [mode])

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, toggleMode }}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
