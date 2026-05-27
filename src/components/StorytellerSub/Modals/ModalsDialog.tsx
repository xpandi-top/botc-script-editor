// @ts-nocheck
import type { StorytellerContext } from '../useStoryteller'
import React from 'react'
import {
  Button, DialogContentText, DialogTitle,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import { makeT, makeTpl } from '../../../lib/t'
import { ResponsiveDialog, ResponsiveDialogActions, ResponsiveDialogContent } from '../../ui'

export function ModalsDialog({ ctx }: { ctx: StorytellerContext }) {
  const {
    language, text,
    showSaveBeforeNewGame, setShowSaveBeforeNewGame,
    confirmNewGameAfterSave, confirmNewGameDiscard,
    dialogState, setDialogState, confirmDialog,
  } = ctx

  const zh = language === 'zh'
  const t = makeT(language)
  const tpl = makeTpl(language)

  const deleteDayState = dialogState?.kind === 'deleteDay' ? dialogState : null

  return (
    <>
      {/* ── Delete day confirmation ── */}
      <ResponsiveDialog
        open={!!deleteDayState}
        onClose={() => setDialogState(null)}
        maxWidth="xs"
        mobile="compact"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {tpl('delete_day_n', deleteDayState?.dayNum)}
        </DialogTitle>
        <ResponsiveDialogContent>
          <DialogContentText>
            {t('delete_day_confirm')}
          </DialogContentText>
        </ResponsiveDialogContent>
        <ResponsiveDialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => setDialogState(null)} sx={{ mr: 'auto' }}>
            {t('cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<DeleteForeverIcon fontSize="small" />}
            onClick={confirmDialog}
          >
            {t('delete')}
          </Button>
        </ResponsiveDialogActions>
      </ResponsiveDialog>

      {/* ── Save-before-new-game prompt ── */}
      <ResponsiveDialog
        open={!!showSaveBeforeNewGame}
        onClose={() => setShowSaveBeforeNewGame(false)}
        maxWidth="xs"
        mobile="compact"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {text.saveBeforeNewGameTitle}
        </DialogTitle>
        <ResponsiveDialogContent>
          <DialogContentText>
            {text.saveBeforeNewGameBody}
          </DialogContentText>
        </ResponsiveDialogContent>
        <ResponsiveDialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowSaveBeforeNewGame(false)}
            sx={{ mr: 'auto' }}
          >
            {t('cancel')}
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
        </ResponsiveDialogActions>
      </ResponsiveDialog>

    </>
  )
}
