import type { StorytellerContext } from '../useStoryteller'
import { DialogTitle, IconButton, useMediaQuery, useTheme } from '@mui/material'
import { useT } from '../../../context/I18nContext'
import CloseIcon from '@mui/icons-material/Close'
import { ModalsEditPlayers } from './ModalsEditPlayers'
import { ModalsNewGame } from './ModalsNewGame'
import { ModalsEndGame } from './ModalsEndGame'
import { ModalsDialog } from './ModalsDialog'
import { ModalsExport } from './ModalsExport'
import { AssignmentCenter } from './AssignmentCenter'
import { ResponsiveDialog, ResponsiveDialogContent } from '../../ui'

export function Modals({ ctx }: { ctx: StorytellerContext }) {
  const {
    showEditPlayersModal, setShowEditPlayersModal,
    newGamePanel, showNewGamePanel, setShowNewGamePanel,
    showAssignmentCenter, setShowAssignmentCenter,
    showEndGameModal, setShowEndGameModal,
    showExportModal, setShowExportModal,
    text,
  } = ctx

  const { t } = useT()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'))

  const paperSx = { borderRadius: isMobile ? 0 : 3, bgcolor: 'background.paper' }
  // tablet gets md width; desktop keeps sm (content doesn't need more)
  const dialogMaxWidth = isMobile ? 'sm' : isTablet ? 'md' : 'sm'

  return (
    <>
      <ResponsiveDialog open={showEditPlayersModal} onClose={() => setShowEditPlayersModal(false)} maxWidth={dialogMaxWidth} paperSx={paperSx}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.editPlayers}
          <IconButton onClick={() => setShowEditPlayersModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <ResponsiveDialogContent>
          <ModalsEditPlayers ctx={ctx} />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={showNewGamePanel && !!newGamePanel} onClose={() => setShowNewGamePanel(false)} maxWidth={dialogMaxWidth} paperSx={paperSx}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.newGame}
          <IconButton onClick={() => setShowNewGamePanel(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <ResponsiveDialogContent>
          <ModalsNewGame ctx={ctx} />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={!!showEndGameModal} onClose={() => setShowEndGameModal(false)} maxWidth={dialogMaxWidth} paperSx={paperSx}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.endGame}
          <IconButton onClick={() => setShowEndGameModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <ResponsiveDialogContent>
          <ModalsEndGame ctx={ctx} />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={showExportModal} onClose={() => setShowExportModal(false)} maxWidth={dialogMaxWidth} paperSx={paperSx}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.exportJson}
          <IconButton onClick={() => setShowExportModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <ResponsiveDialogContent>
          <ModalsExport ctx={ctx} />
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ModalsDialog ctx={ctx} />

      <ResponsiveDialog open={showAssignmentCenter} onClose={() => setShowAssignmentCenter(false)} maxWidth={dialogMaxWidth} paperSx={paperSx}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {t('player_assignments')}
          <IconButton onClick={() => setShowAssignmentCenter(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <ResponsiveDialogContent>
          <AssignmentCenter ctx={ctx} />
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
