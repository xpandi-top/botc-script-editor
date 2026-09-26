import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Alert, Box, Button, MenuItem, Typography, useMediaQuery, useTheme } from '@mui/material'
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined'
import { PrintTopBar } from './PrintTopBar'
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
      <PrintTopBar
        mode="tokens"
        onModeChange={onOpenPrintPreview ? (mode) => { if (mode === 'sheet') onOpenPrintPreview() } : undefined}
        onClose={onClose}
        scripts={scripts}
        activeSlug={activeSlug}
        onScriptChange={(newSlug) => {
          onScriptChange(newSlug)
          if (newSlug === '__all__') {
            onOptionsChange({ ...opts, selectedCharacterIds: allCharacters.map(c => c.id) })
          }
        }}
        getScriptTitle={getScriptTitle}
        extraScriptOptions={<MenuItem value="__all__">{t('all_characters')}</MenuItem>}
        language={language}
        onLanguageChange={onLanguageChange}
        feedback={<FeedbackButton request={reportRequest} />}
        panelOpen={panelOpen}
        onPanelOpenChange={setPanelOpen}
        panelId="token-print-settings"
        onExport={handlePrint}
        exporting={printing}
        exportDisabled={selectedCount === 0}
        count={`${selectedCount} ${t('tokens')}`}
      />

      {exportError && <Alert severity="error" onClose={() => setExportError(null)}>{exportError}</Alert>}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Settings panel — full-width on mobile (replaces preview), sidebar on sm+ */}
        {panelOpen && <Box id="token-print-settings" sx={{
          width: { xs: '100%', sm: 320, md: 340 },
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
            <Box sx={{ m: 'auto', maxWidth: 360, textAlign: 'center', p: 3 }}>
              <StyleOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {opts.mode === 'characters' ? t('no_characters') : t('configure_tags_to_see_preview')}
              </Typography>
              {opts.mode === 'characters' && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{t('print_empty_tokens_hint')}</Typography>}
              {isMobile && <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setPanelOpen(true)}>{t('pdf_settings')}</Button>}
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
