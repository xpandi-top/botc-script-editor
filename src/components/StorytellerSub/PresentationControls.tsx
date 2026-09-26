import { Alert, Box, Button, FormControlLabel, Switch } from '@mui/material'
import CastConnectedIcon from '@mui/icons-material/CastConnected'
import type { StorytellerContext } from './useStoryteller'
import { makeT } from '../../lib/t'

/**
 * Status strip for the audience window. Opening the window lives in the game
 * rail (and the mobile drawer); this only appears while presenting, or when
 * the browser refused to open it.
 */
export function PresentationControls({ ctx }: { ctx: StorytellerContext }) {
  const t = makeT(ctx.language)
  if (!ctx.presenting && !ctx.presentationError) return null
  return <Box sx={{ mb: 1 }}>
    {ctx.presenting && <Alert severity="info" icon={<CastConnectedIcon fontSize="inherit" />}
      sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5, '& .MuiAlert-message': { flex: '1 1 240px', minWidth: 0 }, '& .MuiAlert-action': { ml: 0, pl: 0, flexWrap: 'wrap', alignItems: 'center', gap: 0.5 } }}
      action={<>
        <FormControlLabel control={<Switch size="small" checked={ctx.privateView} onChange={(_, checked) => ctx.setPrivateView(checked)} />} label={t('presentation_private')} sx={{ mr: 0.5 }} />
        <Button size="small" color="inherit" onClick={ctx.openAudienceWindow}>{t('presentation_focus')}</Button>
        <Button size="small" color="inherit" onClick={ctx.stopPresentation}>{t('presentation_stop')}</Button>
      </>}>
      {t('presentation_hint')}
    </Alert>}
    {ctx.presentationError && <Alert severity="warning" sx={{ mt: ctx.presenting ? 1 : 0 }}>{t('presentation_error')}</Alert>}
  </Box>
}
