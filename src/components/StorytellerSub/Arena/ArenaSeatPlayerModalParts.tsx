import { Box, DialogTitle, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { getAbilityTextForScript, getDisplayName, getIconForCharacter } from '../../../catalog'
import type { Language } from '../../../types'
import { ResponsiveDialog, ResponsiveDialogContent } from '../../ui'

export function ModalSectionLabel({ label }: { label: string }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
      {label}
    </Typography>
  )
}

type AbilityDetailDialogProps = {
  charId: string | null
  language: Language
  pinnedRevisions?: Record<string, string>
  onClose: () => void
}

export function AbilityDetailDialog({ charId, language, pinnedRevisions, onClose }: AbilityDetailDialogProps) {
  if (!charId) return null

  const icon = getIconForCharacter(charId)
  const name = getDisplayName(charId, language)
  const ability = getAbilityTextForScript(charId, language, pinnedRevisions) || getAbilityTextForScript(charId, 'en', pinnedRevisions) || ''

  return (
    <ResponsiveDialog open onClose={onClose} maxWidth="xs" mobile="compact">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        {icon && <Box component="img" src={icon as string} sx={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />}
        <Typography sx={{ flex: 1, fontWeight: 700 }}>{name}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <ResponsiveDialogContent sx={{ pt: 0.5 }}>
        <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.primary' }}>{ability}</Typography>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
