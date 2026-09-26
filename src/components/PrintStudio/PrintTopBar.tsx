import type { ReactNode } from 'react'
import { Box, Button, CircularProgress, FormControl, IconButton, MenuItem, Paper, Select, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import PrintIcon from '@mui/icons-material/Print'
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import { useT } from '../../context/I18nContext'
import { LanguageToggle } from '../ui'
import type { EditableScript, Language } from '../../types'

export type PrintMode = 'tokens' | 'sheet'

// On phones these buttons show only their icon: drop the text button's width and icon gap.
const iconOnlyOnPhone = { minWidth: { xs: 0, sm: 64 }, px: { xs: 1, sm: 1.25 }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: '-2px' } } }

/**
 * Top bar shared by the token studio and the script-sheet preview, so both
 * print pages read the same: back · script · tokens | sheet · language ·
 * report · settings panel · export.
 */
export function PrintTopBar({ mode, onModeChange, onClose, scripts, activeSlug, onScriptChange, getScriptTitle, extraScriptOptions, language, onLanguageChange, feedback, panelOpen, onPanelOpenChange, panelId, onExport, exporting, exportDisabled, count }: {
  mode: PrintMode
  onModeChange?: (mode: PrintMode) => void
  onClose: () => void
  scripts: EditableScript[]
  activeSlug: string
  onScriptChange: (slug: string) => void
  getScriptTitle: (script: EditableScript) => string
  extraScriptOptions?: ReactNode
  language: Language
  onLanguageChange: (language: Language) => void
  feedback: ReactNode
  panelOpen: boolean
  onPanelOpenChange: (open: boolean) => void
  panelId: string
  onExport: () => void
  exporting: boolean
  exportDisabled?: boolean
  count?: string
}) {
  const { t } = useT()
  return <>
    <Paper elevation={2} sx={{ px: { xs: 1, sm: 2 }, py: 1, display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, borderRadius: 0, zIndex: 1, flexShrink: 0 }}>
      <Tooltip title={t('back')}><IconButton size="small" aria-label={t('back')} onClick={onClose}><ArrowBackIcon fontSize="small" /></IconButton></Tooltip>
      {onModeChange && (
        <ToggleButtonGroup exclusive size="small" value={mode} aria-label={t('print_mode')} onChange={(_, value) => { if (value && value !== mode) onModeChange(value) }}
          sx={{ flexShrink: 0, '& .MuiToggleButton-root': { px: { xs: 1, sm: 1.5 }, gap: 0.75 } }}>
          <ToggleButton value="tokens" aria-label={t('print_mode_tokens')}>
            <StyleOutlinedIcon fontSize="small" /><Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>{t('print_mode_tokens')}</Box>
          </ToggleButton>
          <ToggleButton value="sheet" aria-label={t('print_mode_sheet')}>
            <ArticleOutlinedIcon fontSize="small" /><Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>{t('print_mode_sheet')}</Box>
          </ToggleButton>
        </ToggleButtonGroup>
      )}
      <FormControl size="small" sx={{ flex: 1, minWidth: 0, maxWidth: { sm: 280 } }}>
        <Select value={activeSlug} displayEmpty inputProps={{ 'aria-label': t('current_script') }} onChange={(e) => onScriptChange(e.target.value as string)}>
          {extraScriptOptions}
          {scripts.map((s) => <MenuItem key={s.slug} value={s.slug}>{getScriptTitle(s)}</MenuItem>)}
        </Select>
      </FormControl>
      {count && <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, display: { xs: 'none', md: 'block' } }}>{count}</Typography>}
      <Box sx={{ flex: { sm: 1 } }} />
      <LanguageToggle language={language} onLanguageChange={onLanguageChange} />
      {feedback}
      <Tooltip title={panelOpen ? t('hide_menu') : t('show_menu')}>
        <IconButton size="small" aria-label={panelOpen ? t('hide_menu') : t('show_menu')} aria-expanded={panelOpen} aria-controls={panelId}
          onClick={() => onPanelOpenChange(!panelOpen)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
          {panelOpen ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Button variant="contained" size="small" aria-label={t('print')} onClick={onExport} disabled={exportDisabled || exporting}
        startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <PrintIcon />} sx={{ flexShrink: 0, ...iconOnlyOnPhone }}>
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{exporting ? t('exporting') : t('print')}</Box>
      </Button>
    </Paper>

    {/* Phones: settings and preview take turns on the full screen. */}
    <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center', gap: 1, px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <ToggleButtonGroup exclusive fullWidth size="small" value={panelOpen ? 'settings' : 'preview'} aria-label={t('print_preview')}
        onChange={(_, value) => { if (value) onPanelOpenChange(value === 'settings') }}>
        <ToggleButton value="settings">{t('pdf_settings')}</ToggleButton>
        <ToggleButton value="preview">{t('preview')}</ToggleButton>
      </ToggleButtonGroup>
      {count && <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{count}</Typography>}
    </Box>
  </>
}
