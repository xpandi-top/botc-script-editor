import type { StorytellerContext } from '../useStoryteller'
import { Box, Drawer, IconButton, Paper, Typography, useTheme, useMediaQuery } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import HistoryIcon from '@mui/icons-material/History'
import DownloadIcon from '@mui/icons-material/Download'
import { RightPopupSettings } from './RightPopupSettings'
import { RightConsoleRecords } from './RightConsoleRecords'
import { GameActionsBar } from '../GameActionsBar'

const barWidth = 56

// ── Shared icon bar (vertical column) ────────────────────────
function IconBar({
  activeRightPopup,
  language,
  text,
  togglePopup,
  onClose,
  openNewGamePanel,
  openCharacterEditor,
  openEndGamePanel,
  setShowExportModal,
  sx = {},
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
  sx?: object
}) {
  return (
    <Box sx={{ width: barWidth, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, gap: 0.5, borderLeft: '1px solid', borderLeftColor: 'divider', bgcolor: 'background.paper', flexShrink: 0, ...sx }}>
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
        onClick={() => { setShowExportModal(true); onClose() }}
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
    showRightPanel, setShowRightPanel, activeRightPopup, setActiveRightPopup,
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

  const iconBarProps = {
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
    <>
      {activeRightPopup === 'settings' && <RightPopupSettings ctx={ctx} />}
      {activeRightPopup === 'records' && <RightConsoleRecords ctx={ctx} toggleConsoleSection={ctx.toggleConsoleSection} />}
    </>
  )

  // ── Desktop: fixed icon bar in grid + floating popup panel ────
  if (isDesktop) {
    return (
      <>
        {/* Icon bar — stays in grid, fixed width, never resizes */}
        <Box
          sx={{
            width: barWidth,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
            alignSelf: 'stretch',
            flexShrink: 0,
          }}
        >
          <IconBar {...iconBarProps} sx={{ borderLeft: 'none', width: '100%' }} />
        </Box>

        {/* Floating popup — fixed overlay, appears above arena */}
        {activeRightPopup && (
          <>
            {/* Backdrop to close on outside click */}
            <Box
              onClick={() => setActiveRightPopup(null)}
              sx={{ position: 'fixed', inset: 0, zIndex: 1199 }}
            />
            <Paper
              elevation={8}
              sx={{
                position: 'fixed',
                right: barWidth + 12,
                top: 64,
                bottom: 16,
                width: { md: 320, lg: 360 },
                zIndex: 1200,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {popupContent}
            </Paper>
          </>
        )}
      </>
    )
  }

  // ── Mobile / tablet: slide-over drawer ───────────────────────
  const drawerTotalWidth = { xs: 280 + barWidth, sm: 340 + barWidth }
  return (
    <>
      {showRightPanel && (
        <Box onClick={closePanel} sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.28)', zIndex: 490 }} />
      )}
      <Drawer
        anchor="right"
        open={showRightPanel}
        onClose={closePanel}
        sx={{
          '& .MuiDrawer-paper': {
            width: activeRightPopup ? drawerTotalWidth : barWidth,
            borderRadius: '22px 0 0 22px',
            bgcolor: 'background.paper',
            borderLeft: '1px solid',
            borderLeftColor: 'divider',
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{
          flex: activeRightPopup ? 1 : 0,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          transition: 'flex 0.2s ease',
        }}>
          {popupContent}
        </Box>
        <IconBar {...iconBarProps} />
      </Drawer>
    </>
  )
}
