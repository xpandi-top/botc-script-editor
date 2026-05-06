import type { StorytellerContext } from '../useStoryteller'
import { Drawer, Box, IconButton, Typography, useTheme, useMediaQuery } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import HistoryIcon from '@mui/icons-material/History'
import DownloadIcon from '@mui/icons-material/Download'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import FlagIcon from '@mui/icons-material/Flag'
import { RightPopupSettings } from './RightPopupSettings'
import { RightConsoleRecords } from './RightConsoleRecords'

const barWidth = 56

function IconBar({
  activeRightPopup,
  language,
  togglePopup,
  onClose,
  openNewGamePanel,
  setShowEditPlayersModal,
  openEndGamePanel,
  setShowExportModal,
}: {
  activeRightPopup: string | null
  language: string
  togglePopup: (name: 'settings' | 'records') => void
  onClose: () => void
  openNewGamePanel: () => void
  setShowEditPlayersModal: (v: boolean) => void
  openEndGamePanel: () => void
  setShowExportModal: (v: boolean) => void
}) {
  return (
    <Box sx={{ width: barWidth, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, gap: 0.5, borderLeft: '1px solid rgba(23,32,42,0.10)', bgcolor: 'rgba(255,251,245,0.92)', flexShrink: 0 }}>
      {[
        { key: 'settings', icon: <SettingsIcon />, label: language === 'zh' ? '设置' : 'Settings' },
        { key: 'records',  icon: <HistoryIcon />,  label: language === 'zh' ? '记录' : 'Records' },
      ].map(({ key, icon, label }) => (
        <IconButton
          key={key}
          onClick={() => togglePopup(key as 'settings' | 'records')}
          sx={{
            flexDirection: 'column', width: 44, p: 0.5, borderRadius: 1.5,
            bgcolor: activeRightPopup === key ? 'rgba(133,63,34,0.12)' : 'transparent',
            border: activeRightPopup === key ? '1px solid rgba(133,63,34,0.3)' : '1px solid transparent',
            color: activeRightPopup === key ? 'primary.main' : 'text.primary',
            '&:hover': { bgcolor: 'rgba(133,63,34,0.08)', borderColor: 'rgba(133,63,34,0.18)' },
          }}
        >
          <Box sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</Box>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1 }}>{label}</Typography>
        </IconButton>
      ))}
      <Box sx={{ flex: 1 }} />
      {[
        { icon: <AddCircleIcon sx={{ fontSize: '1.1rem' }} />, label: language === 'zh' ? '新游戏' : 'New',     onClick: () => { openNewGamePanel(); onClose() } },
        { icon: <ManageAccountsIcon sx={{ fontSize: '1.1rem' }} />, label: language === 'zh' ? '玩家' : 'Players', onClick: () => { setShowEditPlayersModal(true); onClose() } },
        { icon: <FlagIcon sx={{ fontSize: '1.1rem' }} />,        label: language === 'zh' ? '结束' : 'End',     onClick: () => { openEndGamePanel(); onClose() } },
        { icon: <DownloadIcon sx={{ fontSize: '1.1rem' }} />,    label: language === 'zh' ? '导出' : 'Export',  onClick: () => setShowExportModal(true) },
      ].map(({ icon, label, onClick }) => (
        <IconButton key={label} onClick={onClick} sx={{ flexDirection: 'column', width: 44, p: 0.5, borderRadius: 1.5 }}>
          <Box sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</Box>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1 }}>{label}</Typography>
        </IconButton>
      ))}
    </Box>
  )
}

export function RightConsole({ ctx }: { ctx: StorytellerContext }) {
  const {
    showRightPanel, setShowRightPanel, activeRightPopup, setActiveRightPopup,
    language, setShowExportModal,
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
    togglePopup,
    onClose: closePanel,
    openNewGamePanel,
    setShowEditPlayersModal,
    openEndGamePanel,
    setShowExportModal,
  }

  const popupContent = (
    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
          bgcolor: 'rgba(255,251,245,0.96)',
          border: '1px solid rgba(23,32,42,0.10)',
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
  const drawerWidth = { xs: 280, sm: 360 }
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
            width: activeRightPopup ? drawerWidth : barWidth,
            borderRadius: '22px 0 0 22px',
            bgcolor: 'rgba(255,251,245,0.96)',
            borderLeft: '1px solid rgba(23,32,42,0.10)',
            display: 'flex',
            flexDirection: 'row',
          },
        }}
      >
        <Box sx={{ width: activeRightPopup ? drawerWidth : 0, overflow: 'hidden', bgcolor: 'rgba(255,251,245,0.96)' }}>
          {activeRightPopup === 'settings' && <RightPopupSettings ctx={ctx} />}
          {activeRightPopup === 'records' && <RightConsoleRecords ctx={ctx} toggleConsoleSection={ctx.toggleConsoleSection} />}
        </Box>
        <IconBar {...iconBarProps} />
      </Drawer>
    </>
  )
}
