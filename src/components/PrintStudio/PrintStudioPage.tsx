import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Box, Button, CircularProgress, FormControl, InputLabel, IconButton, MenuItem, Paper, Select, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'
import PrintIcon from '@mui/icons-material/Print'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import { exportTokenPdf, isNativePlatform } from '../../lib/nativePrint'
import { TokenOptionsPanel } from './TokenOptionsPanel'
import { TokenPageGrid, TokenPrintPortal } from './TokenPageGrid'
import type { TokenPrintOptions } from './types'
import type { EditableScript, Language, ResolvedScriptCharacter } from '../../types'
import { allCharacters } from '../../catalog'
import { useT } from '../../context/I18nContext'
import { FeedbackButton } from '../Feedback'
import { plainOptions } from '../../lib/feedback/snapshot'
import type { ReportRequest } from '../../lib/feedback/report'

// On phones these buttons show only their icon: drop the text button's width and icon gap.
const iconOnlyOnPhone = { minWidth: { xs: 0, sm: 64 }, px: { xs: 1, sm: 1.25 }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: '-2px' } } }

interface Props {
  opts: TokenPrintOptions
  onOptionsChange: (opts: TokenPrintOptions) => void
  onClose: () => void
  onOpenPrintPreview?: () => void
  scriptCharacters: ResolvedScriptCharacter[]
  language: Language
  onLanguageChange: (lang: Language) => void
  scripts: EditableScript[]
  activeSlug: string
  onScriptChange: (slug: string) => void
  getScriptTitle: (s: EditableScript) => string
}

export function PrintStudioPage({ opts, onOptionsChange, onClose, onOpenPrintPreview, scriptCharacters: givenCharacters, language, onLanguageChange, scripts, activeSlug, onScriptChange, getScriptTitle }: Props) {
  const { t } = useT()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [panelOpen, setPanelOpen] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // When "__all__" is selected, use allCharacters
  const scriptCharacters = activeSlug === '__all__'
    ? allCharacters.map(c => ({ id: c.id, team: c.team, edition: c.edition }))
    : givenCharacters

  const pinnedRevisions = scripts.find(s => s.slug === activeSlug)?.pinnedRevisions

  const handlePrint = async () => {
    const script = scripts.find(s => s.slug === activeSlug)
    setExportError(null)
    try {
      await exportTokenPdf(
        opts,
        script ? `${getScriptTitle(script)}-tokens` : 'tokens',
        () => setPrinting(true),
        () => setPrinting(false),
      )
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error))
    }
  }

  const selectedCount = opts.mode === 'characters'
    ? opts.selectedCharacterIds.length
    : opts.tagMode === 'numbers'
      ? Math.max(0, opts.numberTo - opts.numberFrom + 1)
      : opts.markers.reduce((s, m) => s + m.quantity, 0)

  // A problem report about the tokens: the options as set (images left out). This page
  // covers the app header, so its flag is the only report button here.
  const reportRequest = (): ReportRequest => {
    const script = scripts.find((s) => s.slug === activeSlug)
    return {
      target: { type: 'print', ...(script ? { script: script.slug } : {}) },
      surface: 'print/tokens',
      label: `${t('print_studio')}${script ? ` · ${getScriptTitle(script)}` : ''}`,
      parts: [opts.mode === 'characters' ? 'tokens' : 'markers'],
      snapshot: { tokens: selectedCount, native: isNativePlatform, exportError, options: plainOptions(opts) },
    }
  }

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <Paper elevation={2} sx={{ px: { xs: 1, sm: 2 }, py: 1, display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, borderRadius: 0, zIndex: 1, flexShrink: 0 }}>
        <IconButton size="small" onClick={onClose}><ArrowBackIcon fontSize="small" /></IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
          {t('print_studio')}
        </Typography>
        <FormControl size="small" sx={{ flex: 1, mx: { xs: 0.5, sm: 1 }, maxWidth: { xs: 140, sm: 260 } }}>
          <Select
            value={activeSlug}
            onChange={(e) => {
              const newSlug = e.target.value as string
              onScriptChange(newSlug)
              if (newSlug === '__all__') {
                onOptionsChange({ ...opts, selectedCharacterIds: allCharacters.map(c => c.id) })
              }
            }}
            displayEmpty
          >
            <MenuItem value="__all__">{t('all_characters')}</MenuItem>
            {scripts.map((s) => (
              <MenuItem key={s.slug} value={s.slug}>{getScriptTitle(s)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
          {selectedCount} {t('tokens')}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 72, flexShrink: 0, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
          <InputLabel>{t('lang')}</InputLabel>
          <Select value={language} label={t('lang')} onChange={(e) => onLanguageChange(e.target.value as Language)}>
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="zh">中文</MenuItem>
          </Select>
        </FormControl>
        {onOpenPrintPreview && (
          <Tooltip title={t('switch_to_script_print_preview')}>
            <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={onOpenPrintPreview} sx={{ flexShrink: 0, ...iconOnlyOnPhone }}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('script_pdf')}</Box>
            </Button>
          </Tooltip>
        )}
        <FeedbackButton request={reportRequest} />
        <Tooltip title={panelOpen ? (t('hide_menu')) : (t('show_menu'))}>
          <IconButton size="small" onClick={() => setPanelOpen(v => !v)}>
            {panelOpen ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Button variant="contained" size="small" startIcon={printing ? <CircularProgress size={14} color="inherit" /> : <PrintIcon />} aria-label={t('print')} onClick={handlePrint} disabled={selectedCount === 0 || printing} sx={iconOnlyOnPhone}>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {printing ? (t('exporting')) : (t('print'))}
          </Box>
        </Button>
      </Paper>

      {exportError && <Alert severity="error" onClose={() => setExportError(null)}>{exportError}</Alert>}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Settings panel — full-width on mobile (replaces preview), sidebar on sm+ */}
        {panelOpen && <Box sx={{
          width: { xs: '100%', sm: 280, md: 320 },
          flexShrink: 0,
          overflowY: 'auto',
          borderRight: { sm: '1px solid' },
          borderColor: 'divider',
          display: { xs: isMobile ? 'block' : 'none', sm: 'block' },
        }}>
          <TokenOptionsPanel
            opts={opts}
            onChange={onOptionsChange}
            scriptCharacters={scriptCharacters}
            language={language}
            pinnedRevisions={pinnedRevisions}
          />
        </Box>}

        {/* Live preview — hidden only on mobile when panel is open; tablet+ always visible */}
        <Box sx={{
          flex: 1,
          overflow: 'auto',
          bgcolor: 'grey.200',
          p: { xs: 1, sm: 3 },
          display: panelOpen && isMobile ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'safe center',
          gap: 2,
          minWidth: 0,
        }}>
          {selectedCount === 0 ? (
            <Box sx={{ bgcolor: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', borderRadius: 1, p: `${Math.max(0, opts.marginMm)}mm`, minHeight: 200 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                {opts.mode === 'characters'
                  ? (t('select_characters_on_the_left'))
                  : (t('configure_tags_to_see_preview'))}
              </Typography>
            </Box>
          ) : (
            <TokenPageGrid opts={opts} pinnedRevisions={pinnedRevisions} />
          )}
        </Box>
      </Box>

      {/* Print portal */}
      {createPortal(
        <TokenPrintPortal opts={opts} pinnedRevisions={pinnedRevisions} />,
        document.body,
      )}
    </Box>
  )
}
