import { Alert, Box, Button, FormControlLabel, Switch } from '@mui/material'
import type { StorytellerContext } from './useStoryteller'
import { makeT } from '../../lib/t'

export function PresentationControls({ ctx }: { ctx: StorytellerContext }) {
  const t = makeT(ctx.language)
  return <Box sx={{ mb: 1 }}>
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button size="small" variant="outlined" onClick={ctx.openAudienceWindow}>
        {t(ctx.presenting ? 'presentation_focus' : 'presentation_open')}
      </Button>
      {ctx.presenting && <>
        <Button size="small" onClick={ctx.stopPresentation}>{t('presentation_stop')}</Button>
        <FormControlLabel control={<Switch size="small" checked={ctx.privateView} onChange={(_, checked) => ctx.setPrivateView(checked)} />} label={t('presentation_private')} />
      </>}
    </Box>
    {ctx.presenting && <Alert severity="info" sx={{ mt: 1 }}>{t('presentation_hint')}</Alert>}
    {ctx.presentationError && <Alert severity="warning" sx={{ mt: 1 }}>{t('presentation_error')}</Alert>}
  </Box>
}
