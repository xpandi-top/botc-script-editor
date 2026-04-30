import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, Button, FormControl, IconButton, MenuItem, Paper, Select, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'
import PrintIcon from '@mui/icons-material/Print'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MenuIcon from '@mui/icons-material/Menu'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import { TokenOptionsPanel } from './TokenOptionsPanel'
import { TokenPageGrid, TokenPrintPortal } from './TokenPageGrid'
import { PAGE_SIZE_DEFS } from '../PrintOptionsDialog'
import type { TokenPrintOptions } from './types'
import type { EditableScript, Language, ResolvedScriptCharacter } from '../../types'
import { allCharacters } from '../../catalog'

interface Props {
  opts: TokenPrintOptions
  onOptionsChange: (opts: TokenPrintOptions) => void
  onClose: () => void
  scriptCharacters: ResolvedScriptCharacter[]
  language: Language
  onLanguageChange: (lang: Language) => void
  scripts: EditableScript[]
  activeSlug: string
  onScriptChange: (slug: string) => void
  getScriptTitle: (s: EditableScript) => string
}

export function PrintStudioPage({ opts, onOptionsChange, onClose, scriptCharacters: givenCharacters, language, onLanguageChange, scripts, activeSlug, onScriptChange, getScriptTitle }: Props) {
  const zh = language === 'zh'
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [panelOpen, setPanelOpen] = useState(true)

  // When "__all__" is selected, use allCharacters
  const scriptCharacters = activeSlug === '__all__' 
    ? allCharacters.map(c => ({ id: c.id, team: c.team, edition: c.edition }))
    : givenCharacters

  const handlePrint = () => {
    // inject @page css
    let styleEl = document.getElementById('ts-page-style') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'ts-page-style'
      document.head.appendChild(styleEl)
    }
    const { w, h } = PAGE_SIZE_DEFS[opts.pageSize]
    styleEl.textContent = `@media print { @page { size: ${w}mm ${h}mm; margin: ${opts.marginMm}mm; } }`
    setTimeout(() => window.print(), 80)
  }

  const selectedCount = opts.mode === 'characters'
    ? opts.selectedCharacterIds.length
    : opts.tagMode === 'numbers'
      ? Math.max(0, opts.numberTo - opts.numberFrom + 1)
      : opts.markers.reduce((s, m) => s + m.quantity, 0)

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <Paper elevation={2} sx={{ px: { xs: 1, sm: 2 }, py: 1, display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, borderRadius: 0, zIndex: 1, flexShrink: 0 }}>
        <IconButton size="small" onClick={onClose}><ArrowBackIcon fontSize="small" /></IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
          {zh ? '打印工坊' : 'Print Studio'}
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
            <MenuItem value="__all__">{zh ? '所有角色' : 'All Characters'}</MenuItem>
            {scripts.map((s) => (
              <MenuItem key={s.slug} value={s.slug}>{getScriptTitle(s)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>
          {selectedCount} {zh ? '个标记' : 'tokens'}
        </Typography>
        <Tooltip title={zh ? '切换语言' : 'Toggle language'}>
          <IconButton size="small" onClick={() => onLanguageChange(zh ? 'en' : 'zh')}>
            <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>{zh ? 'EN' : '中'}</Typography>
          </IconButton>
        </Tooltip>
        <Tooltip title={panelOpen ? (zh ? '隐藏菜单' : 'Hide menu') : (zh ? '显示菜单' : 'Show menu')}>
          <IconButton size="small" onClick={() => setPanelOpen(v => !v)}>
            {panelOpen ? <MenuOpenIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Button variant="contained" size="small" startIcon={<PrintIcon />} onClick={handlePrint} disabled={selectedCount === 0}>
          {zh ? '打印' : 'Print'}
        </Button>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Settings panel */}
        {panelOpen && <Box sx={{
          width: { xs: '100%', sm: 320 },
          flexShrink: 0,
          overflowY: 'auto',
          borderRight: { sm: '1px solid' },
          borderColor: 'divider',
        }}>
          <TokenOptionsPanel
            opts={opts}
            onChange={onOptionsChange}
            scriptCharacters={scriptCharacters}
            language={language}
          />
        </Box>}

        {/* Mobile: panel closed → ready-to-print placeholder */}
        {!panelOpen && isMobile && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
              {selectedCount > 0
                ? `${selectedCount} ${zh ? '个标记已选择' : 'tokens selected'}`
                : (zh ? '请打开菜单选择标记' : 'Open menu to select tokens')}
            </Typography>
            <Button variant="contained" size="large" startIcon={<PrintIcon />} onClick={handlePrint} disabled={selectedCount === 0}>
              {zh ? '打印' : 'Print'}
            </Button>
          </Box>
        )}

        {/* Live preview (sm+) */}
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
          {selectedCount === 0 ? (
            <Box sx={{ bgcolor: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', borderRadius: 1, p: `${Math.max(0, opts.marginMm)}mm`, minHeight: 200 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                {opts.mode === 'characters'
                  ? (zh ? '请在左侧选择角色' : 'Select characters on the left')
                  : (zh ? '配置标签后预览将显示' : 'Configure tags to see preview')}
              </Typography>
            </Box>
          ) : (
            <TokenPageGrid opts={opts} />
          )}
        </Box>
      </Box>

      {/* Print portal */}
      {createPortal(
        <div className="token-print-portal" aria-hidden="true">
          <TokenPrintPortal opts={opts} />
        </div>,
        document.body,
      )}
    </Box>
  )
}
