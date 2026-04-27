import { createPortal } from 'react-dom'
import { Box, Button, FormControl, MenuItem, Paper, Select, Typography } from '@mui/material'
import PrintIcon from '@mui/icons-material/Print'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { TokenOptionsPanel } from './TokenOptionsPanel'
import { TokenGrid, TokenPrintPortal } from './TokenGrid'
import { PAGE_SIZE_DEFS, PAGE_PREVIEW_WIDTH_PX } from '../PrintOptionsDialog'
import type { TokenPrintOptions } from './types'
import { MM_TO_PX } from './types'
import type { EditableScript, Language, ResolvedScriptCharacter } from '../../types'

interface Props {
  opts: TokenPrintOptions
  onOptionsChange: (opts: TokenPrintOptions) => void
  onClose: () => void
  scriptCharacters: ResolvedScriptCharacter[]
  language: Language
  scripts: EditableScript[]
  activeSlug: string
  onScriptChange: (slug: string) => void
  getScriptTitle: (s: EditableScript) => string
}

export function PrintStudioPage({ opts, onOptionsChange, onClose, scriptCharacters, language, scripts, activeSlug, onScriptChange, getScriptTitle }: Props) {
  const zh = language === 'zh'

  const handlePrint = () => {
    // inject @page css
    let styleEl = document.getElementById('ts-page-style') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'ts-page-style'
      document.head.appendChild(styleEl)
    }
    const { w, h } = PAGE_SIZE_DEFS[opts.pageSize]
    styleEl.textContent = `@media print { @page { size: ${w}mm ${h}mm; margin: 15mm; } }`
    setTimeout(() => window.print(), 80)
  }

  const previewW = PAGE_PREVIEW_WIDTH_PX[opts.pageSize]
  const previewH = Math.round((PAGE_SIZE_DEFS[opts.pageSize].h - 30) * MM_TO_PX)

  const selectedCount = opts.mode === 'characters'
    ? opts.selectedCharacterIds.length
    : opts.tagMode === 'numbers'
      ? Math.max(0, opts.numberTo - opts.numberFrom + 1)
      : opts.markers.reduce((s, m) => s + m.quantity, 0)

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <Paper elevation={2} sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 0, zIndex: 1, flexShrink: 0 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onClose} size="small">
          {zh ? '返回' : 'Back'}
        </Button>
        <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 700, flexShrink: 0 }}>
          {zh ? '打印工坊' : 'Print Studio'}
        </Typography>
        <FormControl size="small" sx={{ flex: 1, mx: 1, maxWidth: 260 }}>
          <Select
            value={activeSlug}
            onChange={(e) => onScriptChange(e.target.value)}
            displayEmpty
          >
            {scripts.map((s) => (
              <MenuItem key={s.slug} value={s.slug}>{getScriptTitle(s)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          {selectedCount} {zh ? '个代币' : 'tokens'}
        </Typography>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} disabled={selectedCount === 0}>
          {zh ? '打印' : 'Print'}
        </Button>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Settings panel */}
        <Box sx={{
          width: { xs: '100%', sm: 320 },
          flexShrink: 0,
          overflowY: 'auto',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}>
          <TokenOptionsPanel
            opts={opts}
            onChange={onOptionsChange}
            scriptCharacters={scriptCharacters}
            language={language}
          />
        </Box>

        {/* Live preview */}
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          bgcolor: 'grey.200',
          p: { xs: 1, sm: 3 },
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'flex-start', maxWidth: previewW }}>
            {PAGE_SIZE_DEFS[opts.pageSize].label} — {zh ? '以下为预览' : 'Preview'}
          </Typography>

          {/* Paper simulation */}
          <Box sx={{ width: previewW, maxWidth: '100%', position: 'relative' }}>
            {/* Page break indicator */}
            <Box sx={{
              position: 'absolute', top: previewH, left: 0, right: 0,
              height: '2px', bgcolor: 'error.light', opacity: 0.6, zIndex: 10,
              '&::after': {
                content: `"${zh ? '↑ 第1页结束' : '↑ page 1 end'}"`,
                position: 'absolute', right: 8, top: 2,
                fontSize: '0.65rem', color: 'error.main',
              },
            }} />

            <Box sx={{ bgcolor: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', borderRadius: 1, p: '15mm', minHeight: 200 }}>
              {selectedCount === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  {opts.mode === 'characters'
                    ? (zh ? '请在左侧选择角色' : 'Select characters on the left')
                    : (zh ? '配置标签后预览将显示' : 'Configure tags to see preview')}
                </Typography>
              ) : (
                <TokenGrid
                  opts={opts}
                  characters={[]}
                  containerWidth={previewW - 30 * MM_TO_PX}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Print portal */}
      {createPortal(
        <div className="token-print-portal" aria-hidden="true">
          <TokenPrintPortal opts={opts} language={language} />
        </div>,
        document.body,
      )}
    </Box>
  )
}
