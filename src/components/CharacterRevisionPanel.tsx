import { Box, Typography, Paper, Chip, Grid } from '@mui/material'
import {
  getAbilityText,
  getCharacterRevisionIds,
  getCurrentRevision,
  getDisplayName,
  getIconForCharacter,
  getRevisionNote,
  getRevisionText,
} from '../catalog'
import type { CharacterEntry, Language } from '../types'

type CharacterRevisionPanelProps = {
  character?: CharacterEntry
  language: Language
  title: string
  currentRevisionLabel: string
  revisionHistoryLabel: string
  englishTextLabel: string
  chineseTextLabel: string
  revisionNoteLabel: string
  currentLabel: string
  noCharacterSelectedLabel: string
}

export function CharacterRevisionPanel({
  character,
  language,
  title,
  currentRevisionLabel,
  revisionHistoryLabel,
  englishTextLabel,
  chineseTextLabel,
  revisionNoteLabel,
  currentLabel,
  noCharacterSelectedLabel,
}: CharacterRevisionPanelProps) {
  if (!character) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary">{noCharacterSelectedLabel}</Typography>
      </Paper>
    )
  }

  const icon = getIconForCharacter(character.id)
  const revisionIds = getCharacterRevisionIds(character.id)
  const currentRevision = getCurrentRevision(character.id)
  const currentAbility = getAbilityText(character.id, language)

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {icon ? (
          <Box component="img" src={icon} alt="" sx={{ width: 48, height: 48 }} />
        ) : (
          <Box sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200', borderRadius: 1 }}>
            <Typography variant="caption">{character.id.slice(0, 2).toUpperCase()}</Typography>
          </Box>
        )}
        <Box>
          <Typography variant="overline" color="text.secondary">{title}</Typography>
          <Typography variant="h6">{getDisplayName(character.id, language)}</Typography>
          <Typography variant="caption" color="text.secondary">{character.id}</Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle2">{currentRevisionLabel}</Typography>
          <Chip label={currentRevision} size="small" color="primary" />
        </Box>
        <Typography variant="body2">{currentAbility}</Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{revisionHistoryLabel}</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {revisionIds.map((revision) => (
            <Paper key={revision} variant="outlined" sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2">{revision}</Typography>
                {revision === currentRevision && (
                  <Chip label={currentLabel} size="small" color="primary" />
                )}
              </Box>
              <Grid container spacing={1}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">{revisionNoteLabel}</Typography>
                  <Typography variant="body2">{getRevisionNote(character.id, revision) || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">{englishTextLabel}</Typography>
                  <Typography variant="body2">{getRevisionText(character.id, 'en', revision)}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">{chineseTextLabel}</Typography>
                  <Typography variant="body2">{getRevisionText(character.id, 'zh', revision)}</Typography>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Box>
      </Box>
    </Paper>
  )
}