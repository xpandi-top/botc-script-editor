import type { StorytellerContext } from '../useStoryteller'
import { Drawer, Box, IconButton, Typography, useTheme, useMediaQuery } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import HistoryIcon from '@mui/icons-material/History'
import DownloadIcon from '@mui/icons-material/Download'
import { RightPopupSettings } from './RightPopupSettings'
import { RightConsoleRecords } from './RightConsoleRecords'
import { GameActionsBar } from '../GameActionsBar'

const barWidth = 56

function IconBar({
  activeRightPopup,
  language,
  text,
  togglePopup,
  onClose,
  openNewGamePanel,
  setShowEditPlayersModal,
  openEndGamePanel,
  setShowExportModal,
}: {
  activeRightPopup: string | null
  language: string
  text: StorytellerContext['text']
  togglePopup: (name: 'settings' | 'records') => void
  onClose: () => void
  openNewGamePanel: () => void
  setShowEditPlayersModal: (v: boolean) => void
  openEndGamePanel: () => void
  setShowExportModal: (v: boolean) => void
}) {
  return (
    <Box sx={{ width: barWidth, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, gap: 0.5, borderLeft: '1px solid', borderLeftColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
      {[
        { key: 'settings', icon: <SettingsIcon />, label: language === 'zh' ? '设置' : 'Settings' },
        { key: 'records',  icon: <HistoryIcon />,  label: language === 'zh' ? '记录' : 'Records' },
      ].map(({ key, icon, label }) => (
        <IconButton
          key={key}
          onClick={() => togglePopup(key as 'settings' | 'records')}
          sx={{
            flexDirection: 'column', width: 44, p: 0.5, borderRadius: 1.5,
            bgcolor: activeRightPopup === key ? 'action.selected' : 'transparent',
            border: activeRightPopup === key ? '1px solid' : '1px solid transparent',
            borderColor: activeRightPopup === key ? 'primary.light' : 'transparent',
            color: activeRightPopup === key ? 'primary.main' : 'text.primary',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</Box>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1 }}>{label}</Typography>
        </IconButton>
      ))}
      <Box sx={{ flex: 1 }} />
      <GameActionsBar
        openNewGamePanel={openNewGamePanel}
        setShowEditPlayersModal={setShowEditPlayersModal}
        openEndGamePanel={openEndGamePanel}
        text={text}
        language={language}
        onAfterAction={onClose}
        variant="sidebar"
      />
      <IconButton
        onClick={() => setShowExportModal(true)}
        sx={{
          flexDirection: 'column', width: 44, p: 0.5, borderRadius: 1.5,
          border: '1px solid transparent',
          color: 'text.secondary',
          '&:hover': { bgcolor: 'action.hover', color: 'text.primary', borderColor: 'divider' },
        }}
      >
        <Box sx={{ fontSize: '1.1rem', lineHeight: 1 }}><DownloadIcon sx={{ fontSize: '1.1rem' }} /></Box>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1, color: 'inherit' }}>
          {language === 'zh' ? '导出' : 'Export'}
        </Typography>
      </IconButton>
    </Box>
  )
}

export function RightConsole({ ctx }: { ctx: StorytellerContext }) {
  const {
    showRightPanel, setShowRightPanel, activeRightPopup, setActiveRightPopup,
    language, text, setShowExportModal,
    openNewGamePanel, setShowEditPlayersModal, openEndGamePanel,
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
    setShowEditPlayersModal,
    openEndGamePanel,
    setShowExportModal,
  }

  const popupContent = (
    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 , maxHeight: '90dvh' }}>
      {activeRightPopup === 'settings' && <RightPopupSettings ctx={ctx} />}
      {activeRightPopup === 'records' && <RightConsoleRecords ctx={ctx} toggleConsoleSection={ctx.toggleConsoleSection} />}
    </Box>
  )

  // ── Desktop: inline sidebar, no drawer ───────────────────────
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
          // When popup open, expand; otherwise just icon bar
          width: activeRightPopup ? { md: 320, lg: 340 } : barWidth,
          transition: 'width 0.2s ease',
          flexShrink: 0,
        }}
      >
        {activeRightPopup && popupContent}
        <IconBar {...iconBarProps} />
      </Box>
    )
  }

  // ── Mobile / tablet: slide-over drawer ───────────────────────
  // Drawer paper = content width + icon bar width so both fit without competing
  const drawerTotalWidth   = { xs: 280 + barWidth, sm: 340 + barWidth }
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
        {/* Content panel: flex-1 fills drawerTotalWidth minus icon bar */}
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
          {activeRightPopup === 'settings' && <RightPopupSettings ctx={ctx} />}
          {activeRightPopup === 'records' && <RightConsoleRecords ctx={ctx} toggleConsoleSection={ctx.toggleConsoleSection} />}
        </Box>
        <IconBar {...iconBarProps} />
      </Drawer>
    </>
  )
}
