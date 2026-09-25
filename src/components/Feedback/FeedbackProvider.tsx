/**
 * Problem reports from anywhere in the app (src/lib/feedback/report.ts,
 * docs/FEEDBACK.md). The provider holds the report dialog; `FeedbackButton`
 * opens it for what it sits next to (a character, a script, a storyteller
 * seat), and `useReportContext` adds what else is on screen (the tab, the
 * script, the game's day and phase) to every report. Without a provider
 * (player pages, print previews) the buttons render nothing.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconButton, Tooltip, type IconButtonProps } from '@mui/material'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import { setReportContext } from '../../lib/feedback/context'
import { flushReports, type ReportRequest } from '../../lib/feedback/report'
import { useT } from '../../context/I18nContext'
import { FeedbackDialog } from './FeedbackDialog'

type FeedbackApi = {
  /** Open the report dialog; `selection` is text the user had selected. */
  open: (request: ReportRequest, selection?: string) => void
}

const FeedbackContext = createContext<FeedbackApi | null>(null)
export const useFeedback = () => useContext(FeedbackContext)

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<{ request: ReportRequest; selection?: string; key: number } | null>(null)
  const api = useMemo<FeedbackApi>(() => ({
    open: (request, selection) => setOpen({ request, selection, key: Date.now() }),
  }), [])

  // Reports that waited offline: at start, and when the connection comes back.
  useEffect(() => {
    const flush = () => { void flushReports() }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {open && <FeedbackDialog key={open.key} request={open.request} selection={open.selection} onClose={() => setOpen(null)} />}
    </FeedbackContext.Provider>
  )
}

/** Add a summary of what this part of the app shows to every report; ids and counts only. */
export function useReportContext(key: string, value: Record<string, unknown> | undefined) {
  const json = JSON.stringify(value ?? null)
  useEffect(() => {
    setReportContext(key, value)
    return () => setReportContext(key, undefined)
    // The JSON stands for the value: a new object with the same content changes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, json])
}

const selectedText = () => (typeof window === 'undefined' ? '' : window.getSelection()?.toString().trim() ?? '')

type FeedbackButtonProps = {
  /** Built when clicked, so what the target shows is read at that moment. */
  request: () => ReportRequest
  size?: number
  /** Instead of the flag. */
  icon?: ReactNode
  title?: string
  sx?: IconButtonProps['sx']
}

/** A small flag that opens the report dialog for `request`. */
export function FeedbackButton({ request, size = 18, icon, title, sx }: FeedbackButtonProps) {
  const feedback = useFeedback()
  const { t } = useT()
  // Pressing the button clears a text selection before the click: keep it from the press.
  const selection = useRef('')
  if (!feedback) return null
  return (
    <Tooltip title={title ?? t('report_here')}>
      <IconButton
        size="small"
        aria-label={title ?? t('report_here')}
        onPointerDown={() => { selection.current = selectedText() }}
        onClick={(event) => {
          event.stopPropagation()
          feedback.open(request(), selection.current || selectedText())
          selection.current = ''
        }}
        sx={{ color: 'text.secondary', ...sx }}
      >
        {icon ?? <FlagOutlinedIcon sx={{ fontSize: size }} />}
      </IconButton>
    </Tooltip>
  )
}
