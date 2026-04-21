import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { ModalsEditPlayers } from './ModalsEditPlayers'
import { ModalsNewGame } from './ModalsNewGame'
import { ModalsEndGame } from './ModalsEndGame'
import { ModalsDialog } from './ModalsDialog'
import { ModalsExport } from './ModalsExport'

export function Modals({ ctx }: { ctx: any }) {
  const { showEditPlayersModal, setShowEditPlayersModal, newGamePanel, setNewGamePanel, endGameResult, setEndGameResult, showExportModal, setShowExportModal, dialogState, setDialogState, text, language } = ctx

  const paperSx = { borderRadius: 3, bgcolor: 'rgba(255,251,245,0.96)' }

  return (
    <>
      <Dialog open={showEditPlayersModal} onClose={() => setShowEditPlayersModal(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {text.editPlayers}
          <IconButton onClick={() => setShowEditPlayersModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsEditPlayers ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!newGamePanel} onClose={() => setNewGamePanel(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {text.newGame}
          <IconButton onClick={() => setNewGamePanel(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsNewGame ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!endGameResult} onClose={() => setEndGameResult(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {text.endGame}
          <IconButton onClick={() => setEndGameResult(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsEndGame ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={showExportModal} onClose={() => setShowExportModal(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {text.exportJson}
          <IconButton onClick={() => setShowExportModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsExport ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!dialogState} onClose={() => setDialogState(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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