import { Dialog, DialogTitle, DialogContent, IconButton, useMediaQuery, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { ModalsEditPlayers } from './ModalsEditPlayers'
import { ModalsNewGame } from './ModalsNewGame'
import { ModalsEndGame } from './ModalsEndGame'
import { ModalsDialog } from './ModalsDialog'
import { ModalsExport } from './ModalsExport'

export function Modals({ ctx }: { ctx: any }) {
  const { showEditPlayersModal, setShowEditPlayersModal, newGamePanel, setNewGamePanel, showEndGameModal, setShowEndGameModal, showExportModal, setShowExportModal, dialogState, setDialogState, text, language } = ctx

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const paperSx = { borderRadius: isMobile ? 0 : 3, bgcolor: 'rgba(255,251,245,0.96)' }

  return (
    <>
      <Dialog open={showEditPlayersModal} onClose={() => setShowEditPlayersModal(false)} maxWidth="sm" fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.editPlayers}
          <IconButton onClick={() => setShowEditPlayersModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsEditPlayers ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!newGamePanel} onClose={() => setNewGamePanel(null)} maxWidth="sm" fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.newGame}
          <IconButton onClick={() => setNewGamePanel(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsNewGame ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!showEndGameModal} onClose={() => setShowEndGameModal(false)} maxWidth="sm" fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.endGame}
          <IconButton onClick={() => setShowEndGameModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsEndGame ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={showExportModal} onClose={() => setShowExportModal(false)} maxWidth="sm" fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.exportJson}
          <IconButton onClick={() => setShowExportModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsExport ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!dialogState} onClose={() => setDialogState(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {dialogState?.title || (language === 'zh' ? '确认' : 'Confirm')}
          <IconButton onClick={() => setDialogState(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsDialog ctx={ctx} />
        </DialogContent>
      </Dialog>
    </>
  )
}
