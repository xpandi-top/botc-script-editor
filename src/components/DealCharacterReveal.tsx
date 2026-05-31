import { Box, Paper, Typography } from '@mui/material'
import type { DealCard } from '../lib/firebaseDeal'
import { getAbilityText, getDisplayName, getIconForCharacter } from '../catalog'
import { makeTpl } from '../lib/t'

interface Props {
  card: DealCard
  language: 'en' | 'zh'
  effectiveSeat: number | null
}

export function DealCharacterReveal({ card, language, effectiveSeat }: Props) {
  const icon = getIconForCharacter(card.characterId)
  const tpl = makeTpl(language)

  return (
    <Paper elevation={4} sx={{ p: 3, borderRadius: 3, maxWidth: 300, width: '100%', textAlign: 'center' }}>
      {icon && (
        <Box component="img" src={icon}
          sx={{ width: 96, height: 96, objectFit: 'contain', mb: 2, mx: 'auto', display: 'block' }}
        />
      )}
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {getDisplayName(card.characterId, language)}
      </Typography>
      {effectiveSeat != null && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {tpl('seat_n', effectiveSeat)}
        </Typography>
      )}
      {language !== 'en' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {getDisplayName(card.characterId, 'en')}
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.5 }}>
        {getAbilityText(card.characterId, language)}
      </Typography>
    </Paper>
  )
}
