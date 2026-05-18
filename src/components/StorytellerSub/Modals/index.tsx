import type { StorytellerContext } from '../useStoryteller'
import { Dialog, DialogTitle, DialogContent, IconButton, useMediaQuery, useTheme } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { ModalsEditPlayers } from './ModalsEditPlayers'
import { ModalsNewGame } from './ModalsNewGame'
import { ModalsEndGame } from './ModalsEndGame'
import { ModalsDialog } from './ModalsDialog'
import { ModalsExport } from './ModalsExport'
import { DealHostPage } from '../../DealHostPage'

export function Modals({ ctx }: { ctx: StorytellerContext }) {
  const {
    showEditPlayersModal, setShowEditPlayersModal,
    newGamePanel, setNewGamePanel, showNewGamePanel, setShowNewGamePanel,
    showEndGameModal, setShowEndGameModal,
    showExportModal, setShowExportModal,
    text, language,
    activeDealSession, setActiveDealSession,
    startNewGame,
  } = ctx

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'))

  const paperSx = { borderRadius: isMobile ? 0 : 3, bgcolor: 'background.paper' }
  // tablet gets md width; desktop keeps sm (content doesn't need more)
  const dialogMaxWidth = isMobile ? 'sm' : isTablet ? 'md' : 'sm'

  return (
    <>
      <Dialog open={showEditPlayersModal} onClose={() => setShowEditPlayersModal(false)} maxWidth={dialogMaxWidth} fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.editPlayers}
          <IconButton onClick={() => setShowEditPlayersModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsEditPlayers ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={showNewGamePanel && !!newGamePanel} onClose={() => setShowNewGamePanel(false)} maxWidth={dialogMaxWidth} fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.newGame}
          <IconButton onClick={() => setShowNewGamePanel(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsNewGame ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!showEndGameModal} onClose={() => setShowEndGameModal(false)} maxWidth={dialogMaxWidth} fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.endGame}
          <IconButton onClick={() => setShowEndGameModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsEndGame ctx={ctx} />
        </DialogContent>
      </Dialog>

      <Dialog open={showExportModal} onClose={() => setShowExportModal(false)} maxWidth={dialogMaxWidth} fullWidth fullScreen={isMobile} slotProps={{ paper: { sx: paperSx } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {text.exportJson}
          <IconButton onClick={() => setShowExportModal(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <ModalsExport ctx={ctx} />
        </DialogContent>
      </Dialog>

      <ModalsDialog ctx={ctx} />

      {/* ── Deal host overlay — shown when ST clicks "Deal Cards" ── */}
      <Dialog
        open={!!activeDealSession}
        onClose={() => setActiveDealSession(null)}
        fullScreen
        slotProps={{ paper: { sx: { bgcolor: 'background.default' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {language === 'zh' ? '发牌控制台' : 'Deal Dashboard'}
          <IconButton onClick={() => setActiveDealSession(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {activeDealSession && (
            <DealHostPage
              sessionId={activeDealSession.sessionId}
              hostToken={activeDealSession.hostToken}
              language={language}
              onApplyToGame={(patch) => {
                if (!newGamePanel) return
                const merged = { ...newGamePanel, ...patch }
                setActiveDealSession(null)
                setShowNewGamePanel(false)
                startNewGame(merged)
              }}
              onClose={() => setActiveDealSession(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
