// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import {
  Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'

export function ModalsDialog({ ctx }: { ctx: StorytellerContext }) {
  const {
    language, text,
    showSaveBeforeNewGame, setShowSaveBeforeNewGame,
    confirmNewGameAfterSave, confirmNewGameDiscard,
    dialogState, setDialogState, confirmDialog,
  } = ctx

  const zh = language === 'zh'

  const deleteDayState = dialogState?.kind === 'deleteDay' ? dialogState : null

  return (
    <>
      {/* ── Delete day confirmation ── */}
      <Dialog
        open={!!deleteDayState}
        onClose={() => setDialogState(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {zh ? `删除第 ${deleteDayState?.dayNum} 天？` : `Delete Day ${deleteDayState?.dayNum}?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {zh
              ? '此天的所有数据（事件、投票、技能记录）将被永久删除，且不可恢复。'
              : 'All data for this day (events, votes, skill log) will be permanently removed.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => setDialogState(null)} sx={{ mr: 'auto' }}>
            {zh ? '取消' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteForeverIcon fontSize="small" />}
            onClick={confirmDialog}
          >
            {zh ? '删除' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Save-before-new-game prompt ── */}
      <Dialog
        open={!!showSaveBeforeNewGame}
        onClose={() => setShowSaveBeforeNewGame(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {text.saveBeforeNewGameTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {text.saveBeforeNewGameBody}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowSaveBeforeNewGame(false)}
            sx={{ mr: 'auto' }}
          >
            {zh ? '取消' : 'Cancel'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteForeverIcon fontSize="small" />}
            onClick={() => { setShowSaveBeforeNewGame(false); confirmNewGameDiscard() }}
          >
            {text.discardAndNew}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon fontSize="small" />}
            onClick={() => { setShowSaveBeforeNewGame(false); confirmNewGameAfterSave() }}
          >
            {text.saveAndNew}
          </Button>
        </DialogActions>
      </Dialog>

    </>
  )
}
