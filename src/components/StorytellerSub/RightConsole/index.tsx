import type { StorytellerContext } from '../useStoryteller'
import { Box, Collapse, IconButton, Typography, useTheme, useMediaQuery } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import HistoryIcon from '@mui/icons-material/History'
import DownloadIcon from '@mui/icons-material/Download'
import { RightPopupSettings } from './RightPopupSettings'
import { RightConsoleRecords } from './RightConsoleRecords'
import { GameActionsBar } from '../GameActionsBar'

const barWidth = 56

// ── Desktop vertical icon bar ─────────────────────────────────
function DesktopIconBar({
  activeRightPopup,
  language,
  text,
  togglePopup,
  onClose,
  openNewGamePanel,
  openCharacterEditor,
  openEndGamePanel,
  setShowExportModal,
}: {
  activeRightPopup: string | null
  language: string
  text: StorytellerContext['text']
  togglePopup: (name: 'settings' | 'records') => void
  onClose: () => void
  openNewGamePanel: () => void
  openCharacterEditor: () => void
  openEndGamePanel: () => void
  setShowExportModal: (v: boolean) => void
}) {
  return (
    <Box sx={{ width: barWidth, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, gap: 0.5, borderLeft: '1px solid', borderLeftColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
      <GameActionsBar
        openNewGamePanel={openNewGamePanel}
        openCharacterEditor={openCharacterEditor}
        openEndGamePanel={openEndGamePanel}
        text={text}
        language={language}
        onAfterAction={onClose}
        variant="sidebar"
      />
      <IconButton
        onClick={() => setShowExportModal(true)}
        sx={{
          flexDirection: 'column', width: 48, p: 0.75, borderRadius: 1.5,
          border: '1px solid transparent',
          color: 'text.secondary',
          '&:hover': { bgcolor: 'action.hover', color: 'text.primary', borderColor: 'divider' },
        }}
      >
        <Box sx={{ fontSize: '1.5rem', lineHeight: 1, display: 'flex' }}><DownloadIcon fontSize="inherit" /></Box>
        <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.2, color: 'inherit' }}>
          {language === 'zh' ? '导出' : 'Export'}
        </Typography>
      </IconButton>
      <Box sx={{ flex: 1 }} />
      {[
        { key: 'settings', icon: <SettingsIcon fontSize="inherit" />, label: language === 'zh' ? '设置' : 'Settings' },
        { key: 'records',  icon: <HistoryIcon fontSize="inherit" />,  label: language === 'zh' ? '记录' : 'Records' },
      ].map(({ key, icon, label }) => (
        <IconButton
          key={key}
          onClick={() => togglePopup(key as 'settings' | 'records')}
          sx={{
            flexDirection: 'column', width: 48, p: 0.75, borderRadius: 1.5,
            bgcolor: activeRightPopup === key ? 'action.selected' : 'transparent',
            border: activeRightPopup === key ? '1px solid' : '1px solid transparent',
            borderColor: activeRightPopup === key ? 'primary.light' : 'transparent',
            color: activeRightPopup === key ? 'primary.main' : 'text.primary',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box sx={{ fontSize: '1.5rem', lineHeight: 1, display: 'flex' }}>{icon}</Box>
          <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.2, color: 'inherit' }}>{label}</Typography>
        </IconButton>
      ))}
    </Box>
  )
}

export function RightConsole({ ctx }: { ctx: StorytellerContext }) {
  const {
    setShowRightPanel, activeRightPopup, setActiveRightPopup,
    language, text, setShowExportModal,
    openNewGamePanel, openCharacterEditor, openEndGamePanel,
  } = ctx

  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  const togglePopup = (name: 'settings' | 'records') => {
    setActiveRightPopup((p: string | null) => (p === name ? null : name))
  }

  const closePanel = () => {
    setActiveRightPopup(null)
    setShowRightPanel(false)
  }

  const desktopIconBarProps = {
    activeRightPopup,
    language,
    text,
    togglePopup,
    onClose: closePanel,
    openNewGamePanel,
    openCharacterEditor,
    openEndGamePanel,
    setShowExportModal,
  }

  const popupContent = (
    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, maxHeight: '90dvh' }}>
      {activeRightPopup === 'settings' && <RightPopupSettings ctx={ctx} />}
      {activeRightPopup === 'records' && <RightConsoleRecords ctx={ctx} toggleConsoleSection={ctx.toggleConsoleSection} />}
    </Box>
  )

  // ── Desktop: inline sidebar ───────────────────────────────────
  if (isDesktop) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          alignSelf: 'stretch',
          width: activeRightPopup ? { md: 320, lg: 340 } : barWidth,
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}
      >
        {activeRightPopup && popupContent}
        <DesktopIconBar {...desktopIconBarProps} />
      </Box>
    )
  }

  // ── Mobile: inline bottom panel, no overlay drawer ────────────
  const bottomBarBtnSx = {
    flexDirection: 'column' as const,
    flex: 1,
    py: 0.5,
    px: 0.25,
    borderRadius: 1.5,
    color: 'text.secondary',
    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
  }
  const activeBtnSx = {
    color: 'primary.main',
    bgcolor: 'action.selected',
  }

  return (
    <Box sx={{ flexShrink: 0, bgcolor: 'background.paper', borderTop: '1px solid', borderTopColor: 'divider' }}>
      {/* Expandable content — shown when a popup is active */}
      <Collapse in={!!activeRightPopup} unmountOnExit>
        <Box sx={{ maxHeight: '45dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderBottom: '1px solid', borderBottomColor: 'divider' }}>
          {activeRightPopup === 'settings' && <RightPopupSettings ctx={ctx} />}
          {activeRightPopup === 'records' && <RightConsoleRecords ctx={ctx} toggleConsoleSection={ctx.toggleConsoleSection} />}
        </Box>
      </Collapse>

      {/* Horizontal bottom icon bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', py: 0.25, px: 0.5 }}>
        <GameActionsBar
          openNewGamePanel={openNewGamePanel}
          openCharacterEditor={openCharacterEditor}
          openEndGamePanel={openEndGamePanel}
          text={text}
          language={language}
          onAfterAction={closePanel}
          variant="bottombar"
        />

        {/* Export */}
        <IconButton onClick={() => { setShowExportModal(true); closePanel() }} sx={bottomBarBtnSx}>
          <Box sx={{ fontSize: '1.5rem', lineHeight: 1, display: 'flex' }}><DownloadIcon fontSize="inherit" /></Box>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, lineHeight: 1.2, color: 'inherit' }}>
            {language === 'zh' ? '导出' : 'Export'}
          </Typography>
        </IconButton>

        {/* Settings */}
        <IconButton
          onClick={() => togglePopup('settings')}
          sx={{ ...bottomBarBtnSx, ...(activeRightPopup === 'settings' ? activeBtnSx : {}) }}
        >
          <Box sx={{ fontSize: '1.5rem', lineHeight: 1, display: 'flex' }}><SettingsIcon fontSize="inherit" /></Box>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, lineHeight: 1.2, color: 'inherit' }}>
            {language === 'zh' ? '设置' : 'Settings'}
          </Typography>
        </IconButton>

        {/* Records */}
        <IconButton
          onClick={() => togglePopup('records')}
          sx={{ ...bottomBarBtnSx, ...(activeRightPopup === 'records' ? activeBtnSx : {}) }}
        >
          <Box sx={{ fontSize: '1.5rem', lineHeight: 1, display: 'flex' }}><HistoryIcon fontSize="inherit" /></Box>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, lineHeight: 1.2, color: 'inherit' }}>
            {language === 'zh' ? '记录' : 'Records'}
          </Typography>
        </IconButton>
      </Box>
    </Box>
  )
}
