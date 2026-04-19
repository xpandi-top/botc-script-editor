import { Drawer, Box, IconButton, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import SettingsIcon from '@mui/icons-material/Settings'
import HistoryIcon from '@mui/icons-material/History'
import DownloadIcon from '@mui/icons-material/Download'
import { RightPopupLog } from './RightPopupLog'
import { RightPopupSettings } from './RightPopupSettings'
import { RightConsoleRecords } from './RightConsoleRecords'

export function RightConsole({ ctx }: { ctx: any }) {
  const { showRightPanel, setShowRightPanel, activeRightPopup, setActiveRightPopup, language, setShowExportModal } = ctx

  const togglePopup = (name: 'log' | 'settings' | 'records') => {
    setActiveRightPopup((p: string) => (p === name ? null : name))
  }

  const closeDrawer = () => {
    setActiveRightPopup(null)
    setShowRightPanel(false)
  }

  const drawerWidth = { xs: 280, sm: 360 }
  const barWidth = 56

  return (
    <>
      {showRightPanel && (
        <Box
          onClick={closeDrawer}
          sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.28)', zIndex: 490 }}
        />
      )}
      <Drawer
        anchor="right"
        open={showRightPanel}
        onClose={closeDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: activeRightPopup ? drawerWidth : barWidth,
            borderRadius: '22px 0 0 22px',
            bgcolor: 'rgba(255,251,245,0.96)',
            borderLeft: '1px solid rgba(23,32,42,0.10)',
            transition: 'width 0.22s ease',
            display: 'flex',
            flexDirection: 'row',
          },
        }}
      >
        <Box
          sx={{
            width: activeRightPopup ? drawerWidth : 0,
            overflow: 'hidden',
            transition: 'width 0.22s ease',
            bgcolor: 'rgba(255,251,245,0.96)',
          }}
        >
          {activeRightPopup === 'log' && <RightPopupLog ctx={ctx} />}
          {activeRightPopup === 'settings' && <RightPopupSettings ctx={ctx} />}
          {activeRightPopup === 'records' && <RightConsoleRecords ctx={ctx} toggleConsoleSection={ctx.toggleConsoleSection} />}
        </Box>

        <Box sx={{ width: barWidth, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, gap: 0.5, borderLeft: '1px solid rgba(23,32,42,0.10)', bgcolor: 'rgba(255,251,245,0.92)' }}>
          {[
            { key: 'log', icon: <MenuIcon />, label: language === 'zh' ? '日志' : 'Log' },
            { key: 'settings', icon: <SettingsIcon />, label: language === 'zh' ? '设置' : 'Settings' },
            { key: 'records', icon: <HistoryIcon />, label: language === 'zh' ? '记录' : 'Records' },
          ].map(({ key, icon, label }) => (
            <IconButton
              key={key}
              onClick={() => togglePopup(key as 'log' | 'settings' | 'records')}
              sx={{
                flexDirection: 'column',
                width: 44,
                p: 0.5,
                borderRadius: 1.5,
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
          <IconButton
            onClick={() => setShowExportModal(true)}
            sx={{ flexDirection: 'column', width: 44, p: 0.5, borderRadius: 1.5 }}
          >
            <Box sx={{ fontSize: '1.1rem', lineHeight: 1 }}><DownloadIcon sx={{ fontSize: '1.1rem' }} /></Box>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1 }}>{language === 'zh' ? '导出' : 'Export'}</Typography>
          </IconButton>
        </Box>
      </Drawer>
    </>
  )
}