import { useState, type ReactNode } from 'react'
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Paper,
  DialogTitle, Divider,
  FormControlLabel, Radio, RadioGroup, Stack,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import type { FontSettings, UiScale } from '../../hooks/useFontSettings'
import { UI_SCALE_OPTIONS, ZH_SAME_AS_EN_ID } from '../../hooks/useFontSettings'
import type { CloudSyncState } from '../../hooks/useCloudSync'
import { exportEverything, readBundleFile, applyBundle } from '../../lib/bundleIO'
import type { Language } from '../../types'
import { useThemeMode } from '../../context/ThemeMode'
import { FontPicker, LivePreview } from '../settings/FontSection'
import { CloudSyncSection } from '../settings/CloudSyncSection'
import { ApiAccessSection } from '../settings/ApiAccessSection'
import { isApiConfigured } from '../../lib/apiClient'
import { useT } from '../../context/I18nContext'
import { FeedbackButton } from '../Feedback'
import type { ReportRequest } from '../../lib/feedback/report'
import { ResponsiveDialog, ResponsiveDialogActions, ResponsiveDialogContent } from '../ui'

const headingSx = { display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }
const sectionSx = { px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: { xs: 0.5, sm: 1 }, borderRadius: 2, minWidth: 0 }
const cardSx = { p: { xs: 2, sm: 3 }, borderRadius: 2, minWidth: 0 }
const toggleSx = {
  width: { xs: '100%', md: 'auto' },
  '& .MuiToggleButton-root': { flex: { xs: 1, md: 'initial' }, minWidth: 0, px: { xs: 1, sm: 2 }, py: 1, whiteSpace: 'nowrap' },
}

/** One setting: what it is on the left, the control on the right (stacked on phones). */
function SettingRow({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) auto' }, columnGap: 4, rowGap: 1.5, alignItems: 'center', py: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" component="h3" sx={headingSx}>{title}</Typography>
        {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{description}</Typography>}
      </Box>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  )
}

// ── SettingsTab ───────────────────────────────────────────────────────────────
interface SettingsTabProps {
  cloudSync: CloudSyncState
  language: Language
  onLanguageChange: (l: Language) => void
  fontSettings: FontSettings
}

export function SettingsTab({ language, onLanguageChange, fontSettings, cloudSync: cloud }: SettingsTabProps) {
  const { t } = useT()
  const { mode, setMode } = useThemeMode()
  const [importDialog, setImportDialog] = useState(false)
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [importError, setImportError] = useState('')
  const {
    enBodyId,    setEnBodyId,    enBodyOptions,
    enDisplayId, setEnDisplayId, enDisplayOptions,
    zhId,        setZhId,        zhOptions,
    uiScale,     setUiScale,
  } = fontSettings

  const zh = language === 'zh'

  // Resolve current CSS strings for preview
  const enBodyCss    = enBodyOptions.find((o) => o.id === enBodyId)?.css    ?? enBodyOptions[0].css
  const enDisplayCss = enDisplayOptions.find((o) => o.id === enDisplayId)?.css ?? enDisplayOptions[0].css
  const zhRaw        = zhOptions.find((o) => o.id === zhId)?.css            ?? zhOptions[0].css
  // Sentinel "same as EN" resolves to current EN body font for preview
  const zhCss        = zhRaw === ZH_SAME_AS_EN_ID ? enBodyCss : zhRaw

  // ZH font picker: replace sentinel css with resolved css so card previews
  // render in the correct font rather than the literal sentinel string.
  const zhOptionsResolved = zhOptions.map((o) =>
    o.id === ZH_SAME_AS_EN_ID ? { ...o, css: enBodyCss } : o
  )

  // A problem report about one section, with the current settings (no account details).
  const settingsRequest = (part: string): ReportRequest => ({
    target: { type: 'settings' },
    surface: 'settings/section',
    label: t('settings'),
    parts: [part],
    snapshot: {
      language, theme: mode, uiScale,
      fonts: { enBody: enBodyId, enDisplay: enDisplayId, zh: zhId },
      sync: { connected: cloud.connected, status: cloud.status, lastSynced: cloud.lastSynced?.toISOString() ?? null, error: cloud.errorMessage },
      api: isApiConfigured(),
    },
  })
  const flag = (part: string): ReactNode => <FeedbackButton request={() => settingsRequest(part)} />

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 1.5, sm: 3 }, py: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 0.75 }}>{t('settings')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('settings_overview_desc')}</Typography>
      </Box>

      <Paper variant="outlined" component="section" aria-labelledby="settings-appearance" sx={sectionSx}>
        <Typography id="settings-appearance" variant="h6" component="h2" sx={{ fontWeight: 700 }}>{t('settings_appearance')}</Typography>
        <Stack divider={<Divider />}>
          <SettingRow title={<>{t('language')}{flag('language')}</>} description={t('settings_language_desc')}>
            <ToggleButtonGroup aria-label={t('language')} value={language} exclusive sx={toggleSx} onChange={(_, v) => { if (v) onLanguageChange(v as Language) }}>
              <ToggleButton value="zh" lang="zh">中文</ToggleButton>
              <ToggleButton value="en" lang="en">English</ToggleButton>
            </ToggleButtonGroup>
          </SettingRow>

          <SettingRow title={<>{t('theme')}{flag('theme')}</>} description={t('settings_theme_desc')}>
            <ToggleButtonGroup aria-label={t('theme')} value={mode} exclusive sx={toggleSx} onChange={(_, v) => { if (v) setMode(v) }}>
              {[
                { value: 'light', icon: <LightModeIcon fontSize="small" />, label: t('light'), description: t('parchment') },
                { value: 'dark', icon: <DarkModeIcon fontSize="small" />, label: t('dark'), description: t('crimson') },
                { value: 'system', icon: <SettingsBrightnessIcon fontSize="small" />, label: t('theme_system'), description: t('theme_system_sub') },
              ].map((option) => (
                <ToggleButton key={option.value} value={option.value} title={option.description} sx={{ gap: 0.75 }}>
                  {option.icon}{option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </SettingRow>

          <SettingRow title={<>{t('interface_size')}{flag('fonts')}</>} description={t('scales_all_ui_text_spacing_and_controls_uniformly')}>
            <ToggleButtonGroup aria-label={t('interface_size')} value={uiScale} exclusive sx={toggleSx} onChange={(_, v) => { if (v) setUiScale(v as UiScale) }}>
              {UI_SCALE_OPTIONS.map((opt) => (
                <ToggleButton key={opt.id} value={opt.id} sx={{ gap: 0.75, alignItems: 'baseline' }}>
                  <Box component="span" sx={{ fontSize: opt.id === 'default' ? '0.875rem' : opt.id === 'large' ? '1rem' : '1.15rem' }}>{zh ? opt.labelZh : opt.label}</Box>
                  <Box component="span" sx={{ fontSize: '0.7rem', opacity: 0.75 }}>{opt.px}px</Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </SettingRow>
        </Stack>
      </Paper>

      <Accordion disableGutters variant="outlined" sx={{ borderRadius: '8px !important', '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="settings-fonts-content" id="settings-fonts-heading" sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>{t('settings_fonts_preview')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('settings_fonts_desc')}</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
          <Stack spacing={3} divider={<Divider />}>
            <Box>
              <Typography variant="subtitle1" component="h3" gutterBottom sx={headingSx}>{t('font_preview')}{flag('fonts')}</Typography>
              <LivePreview language={language} enBodyCss={enBodyCss} enDisplayCss={enDisplayCss} zhCss={zhCss} />
            </Box>
            <Stack spacing={2}>
              <Typography variant="subtitle1" component="h3" sx={headingSx}>{t('english_fonts')}{flag('fonts')}</Typography>
              <FontPicker label="Body Text" labelZh="正文字体" options={enBodyOptions} selectedId={enBodyId} onSelect={setEnBodyId} language={language} />
              <FontPicker label="Headings & Titles" labelZh="标题字体" options={enDisplayOptions} selectedId={enDisplayId} onSelect={setEnDisplayId} language={language} />
            </Stack>
            <Box>
              <Typography variant="subtitle1" component="h3" gutterBottom sx={headingSx}>{t('chinese_font')}{flag('fonts')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('chinese_font_applies_to_both_body_text_and_titles')}</Typography>
              <FontPicker label="Chinese Characters" labelZh="中文字符字体" options={zhOptionsResolved} selectedId={zhId} onSelect={setZhId} language={language} />
            </Box>
            <Typography variant="caption" color="text.secondary">{t('settings_font_persist_note')}</Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Paper variant="outlined" sx={cardSx}>
        <CloudSyncSection cloud={cloud} language={language} action={flag('sync')} />
      </Paper>

      {isApiConfigured() && (
        <Paper variant="outlined" sx={cardSx}>
          <ApiAccessSection cloud={cloud} language={language} action={flag('api')} />
        </Paper>
      )}

      <Paper variant="outlined" component="section" aria-labelledby="settings-backup" sx={cardSx}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) auto' }, columnGap: 4, rowGap: 2, alignItems: 'center' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography id="settings-backup" variant="h6" component="h2" sx={headingSx}>{t('backup_import')}{flag('backup')}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>{t('backup_export_desc')}</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportEverything}>{t('export_everything')}</Button>
            <Button variant="outlined" startIcon={<UploadIcon />}
              onClick={() => { setImportFile(null); setImportStatus('idle'); setImportError(''); setImportDialog(true) }}>
              {t('import_bundle')}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* ── Import Dialog ── */}
      <ResponsiveDialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="xs" mobile="compact">
        <DialogTitle>{t('import_bundle')}</DialogTitle>
        <ResponsiveDialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <Button variant="outlined" component="label" startIcon={<UploadIcon />} sx={{ overflowWrap: 'anywhere' }}>
            {importFile ? importFile.name : t('choose_json_file')}
            <input type="file" accept=".json" hidden onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) { setImportFile(f); setImportStatus('idle') }
              e.target.value = ''
            }} />
          </Button>

          <Box>
            <Typography id="settings-import-mode" variant="subtitle2" sx={{ mb: 0.5 }}>
              {t('import_mode')}
            </Typography>
            <RadioGroup aria-labelledby="settings-import-mode" value={importMode} onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}>
              <FormControlLabel value="merge" control={<Radio size="small" />}
                label={<Typography variant="body2">{t('merge_keep_existing')}</Typography>} />
              <FormControlLabel value="replace" control={<Radio size="small" />}
                label={<Typography variant="body2">{t('replace_overwrite')}</Typography>} />
            </RadioGroup>
          </Box>

          <Alert severity={importMode === 'replace' ? 'warning' : 'info'}>
            {t(importMode === 'replace' ? 'settings_replace_hint' : 'settings_merge_hint')}
          </Alert>

          {importStatus === 'ok' && (
            <Alert severity="success">
              {t('import_successful_reload_the_page_to_apply')}
            </Alert>
          )}
          {importStatus === 'error' && (
            <Alert severity="error">{importError}</Alert>
          )}
        </ResponsiveDialogContent>
        <ResponsiveDialogActions>
          <Button onClick={() => setImportDialog(false)}>{t(importStatus === 'ok' ? 'close' : 'cancel')}</Button>
          <Button
            variant="contained"
            disabled={!importFile || importStatus === 'ok'}
            onClick={async () => {
              if (!importFile) return
              try {
                const bundle = await readBundleFile(importFile)
                applyBundle(bundle, { mode: importMode })
                setImportStatus('ok')
              } catch (e) {
                setImportError(e instanceof Error ? e.message : String(e))
                setImportStatus('error')
              }
            }}
          >
            {t('import_bundle')}
          </Button>
        </ResponsiveDialogActions>
      </ResponsiveDialog>
    </Box>
  )
}
