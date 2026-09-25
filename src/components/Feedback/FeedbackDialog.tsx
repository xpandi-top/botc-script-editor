/**
 * The report dialog: what kind of problem, which part, a note and what it
 * should say. Shows exactly what is sent; sends to the feedback form, or
 * opens the form prefilled, or copies the report for pasting to an agent.
 */
import { useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Collapse, DialogTitle, IconButton, TextField, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { recentErrors } from '../../lib/feedback/errors'
import { reportContext } from '../../lib/feedback/context'
import {
  feedbackReport, newReportId, prefilledReportUrl, reportText, sendReport,
  REPORT_ISSUES, REPORT_PARTS, type ReportIssue, type ReportRequest, type ReportState,
} from '../../lib/feedback/report'
import type { UiKey } from '../../lib/t'
import { useT } from '../../context/I18nContext'
import { ResponsiveDialog, ResponsiveDialogActions, ResponsiveDialogContent } from '../ui'

const ISSUE_KEYS: Record<ReportIssue, UiKey> = {
  wrong: 'report_issue_wrong', translation: 'report_issue_translation', missing: 'report_issue_missing',
  bug: 'report_issue_bug', layout: 'report_issue_layout', suggestion: 'report_issue_suggestion',
}
const PART_KEYS: Record<string, UiKey> = {
  name: 'name', ability: 'term_ability', reminders: 'reminder_tokens_2', night: 'report_part_night',
  jinx: 'jinxes', icon: 'icon', almanac: 'almanac',
  characters: 'characters', info: 'report_part_info', sheet: 'report_part_sheet', export: 'export',
  seat: 'report_part_seat', nomination: 'report_part_nomination', setup: 'report_part_setup', log: 'game_log_title', timer: 'report_part_timer',
  language: 'language', theme: 'theme', fonts: 'report_part_fonts', sync: 'google_drive_sync', api: 'api_access', backup: 'backup_import',
  overview: 'report_part_overview', scripts: 'script_sheet', players: 'report_part_players', records: 'game_records_label',
  filter: 'filter', share: 'report_part_share', record_form: 'report_part_record_form',
  tokens: 'report_part_tokens', markers: 'markers', layout: 'layout',
}
/** Issues about text, where "what it should be" helps. */
const TEXT_ISSUES: ReportIssue[] = ['wrong', 'translation', 'missing']

const chipSx = { fontSize: '0.72rem', height: 24 }

type Props = {
  request: ReportRequest
  selection?: string
  onClose: () => void
}

export function FeedbackDialog({ request, selection: initialSelection, onClose }: Props) {
  const { t, tpl, language } = useT()
  const [issues, setIssues] = useState<ReportIssue[]>(request.issues ?? [])
  const [parts, setParts] = useState<string[]>(request.parts ?? [])
  const [comment, setComment] = useState('')
  const [expected, setExpected] = useState('')
  const [selection, setSelection] = useState(initialSelection ?? '')
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [state, setState] = useState<ReportState | null>(null)

  // Read once, when the dialog opens: what else was on screen, and recent errors.
  const opened = useMemo(() => {
    const now = new Date()
    return { stamp: { id: newReportId(now), at: now.toISOString() }, context: reportContext(), errors: recentErrors() }
  }, [])
  const report = useMemo(() => feedbackReport({
    language, target: request.target, surface: request.surface, label: request.label,
    issues, parts, comment, expected: TEXT_ISSUES.some((i) => issues.includes(i)) ? expected : undefined,
    selection, snapshot: request.snapshot, context: opened.context, errors: opened.errors,
  }, opened.stamp), [language, request, issues, parts, comment, expected, selection, opened])
  const text = useMemo(() => reportText(report), [report])

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
  const copy = () => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => {})
  const send = async () => {
    setSending(true)
    const result = await sendReport(report)
    if (result === 'local') void copy()
    setSending(false)
    setState(result)
  }
  const openForm = () => {
    const { url, truncated } = prefilledReportUrl(report)
    // Left out what the target showed: the full report goes to the clipboard.
    if (truncated) void copy()
    window.open(url, '_blank', 'noopener')
  }

  const partOptions: readonly string[] = REPORT_PARTS[request.target.type]
  const canSend = Boolean(issues.length || comment.trim())
  const done = state !== null
  const stateText = state === 'sent' ? t('report_sent') : state === 'queued' ? t('report_queued') : t('report_local')

  return (
    <ResponsiveDialog open onClose={onClose} maxWidth="sm" mobile="compact">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1, pr: 1 }}>
        <Typography component="span" sx={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: '1rem', overflowWrap: 'anywhere' }}>
          {tpl('report_title_for', request.label)}
        </Typography>
        <IconButton size="small" aria-label={t('close')} onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <ResponsiveDialogContent sx={{ display: 'grid', gap: 1.5, pt: 0 }}>
        {done ? (
          <Alert severity={state === 'sent' ? 'success' : 'info'}>{stateText}</Alert>
        ) : (
          <>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('report_what_issue')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {REPORT_ISSUES.map((issue) => {
                  const on = issues.includes(issue)
                  return <Chip key={issue} size="small" label={t(ISSUE_KEYS[issue])} color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'}
                    aria-pressed={on} onClick={() => setIssues((list) => toggle(list, issue))} sx={chipSx} />
                })}
              </Box>
            </Box>
            {partOptions.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('report_which_part')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {partOptions.map((part) => {
                    const on = parts.includes(part)
                    return <Chip key={part} size="small" label={t(PART_KEYS[part])} color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'}
                      aria-pressed={on} onClick={() => setParts((list) => toggle(list, part))} sx={chipSx} />
                  })}
                </Box>
              </Box>
            )}
            {selection && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, p: 1, borderLeft: '3px solid', borderColor: 'primary.main', bgcolor: 'action.hover', borderRadius: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">{t('report_selection')}</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', overflowWrap: 'anywhere' }}>{selection.slice(0, 600)}</Typography>
                </Box>
                <IconButton size="small" aria-label={t('delete')} onClick={() => setSelection('')}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
              </Box>
            )}
            <TextField
              label={t('report_note')} placeholder={t('report_note_hint')} autoFocus
              value={comment} onChange={(e) => setComment(e.target.value)}
              multiline minRows={2} maxRows={8} size="small" fullWidth
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            {TEXT_ISSUES.some((i) => issues.includes(i)) && (
              <TextField
                label={t('report_expected')}
                value={expected} onChange={(e) => setExpected(e.target.value)}
                multiline minRows={1} maxRows={6} size="small" fullWidth
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
            )}
            <Typography variant="caption" color="text.secondary">{t('report_privacy')}</Typography>
            <Box>
              <Button size="small" onClick={() => setPreview((v) => !v)} sx={{ px: 0, fontSize: '0.75rem' }}>
                {preview ? t('report_hide_sent') : t('report_show_sent')}
              </Button>
              <Collapse in={preview}>
                <Box component="pre" sx={{ m: 0, mt: 0.5, p: 1, maxHeight: 240, overflow: 'auto', fontSize: '0.68rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', bgcolor: 'action.hover', borderRadius: 1 }}>
                  {text}
                </Box>
              </Collapse>
            </Box>
          </>
        )}
      </ResponsiveDialogContent>
      <ResponsiveDialogActions sx={{ gap: 0.5 }}>
        <Button size="small" onClick={() => void copy()}>{copied ? t('copied') : t('copy')}</Button>
        {!done && <Button size="small" onClick={openForm}>{t('report_open_form')}</Button>}
        <Box sx={{ flex: 1 }} />
        {done ? (
          <Button size="small" variant="contained" onClick={onClose}>{t('close')}</Button>
        ) : (
          <>
            <Button size="small" onClick={onClose}>{t('cancel')}</Button>
            <Button size="small" variant="contained" disabled={!canSend || sending} onClick={() => void send()}>{t('send')}</Button>
          </>
        )}
      </ResponsiveDialogActions>
    </ResponsiveDialog>
  )
}
