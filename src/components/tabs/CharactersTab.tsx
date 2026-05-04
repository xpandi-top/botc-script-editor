import { useState } from 'react'
import {
  Box, Button, Dialog, DialogContent, DialogTitle, IconButton,
  Paper, TextField, Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { CharacterRevisionPanel } from '../CharacterRevisionPanel'
import { FilterCheckbox } from '../FilterCheckbox'
import {
  editionLabels,
  getAbilityText,
  getDisplayName,
  getIconForCharacter,
  getCurrentRevision,
  teamLabels,
  teamOrder,
  toTitleCase,
} from '../../catalog'
import type { CharacterEntry, Language, Team } from '../../types'

type Props = {
  uiText: Record<string, string>
  uiLanguage: Language
  filteredCharacters: CharacterEntry[]
  availableEditions: string[]
  selectedTeams: Team[]
  selectedEditions: string[]
  selectedCharacter: CharacterEntry | undefined
  characterQuery: string
  setCharacterQuery: (v: string) => void
  setSelectedCharacterId: (id: string) => void
  toggleTeam: (team: Team) => void
  toggleEdition: (edition: string) => void
}

export function CharactersTab({
  uiText,
  uiLanguage,
  filteredCharacters,
  availableEditions,
  selectedTeams,
  selectedEditions,
  selectedCharacter,
  characterQuery,
  setCharacterQuery,
  setSelectedCharacterId,
  toggleTeam,
  toggleEdition,
}: Props) {
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const handleSelect = (id: string) => {
    setSelectedCharacterId(id)
    setMobileDetailOpen(true)
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, height: { lg: 'calc(100vh - 160px)' }, alignItems: 'flex-start' }}>
        {/* ── Left: list panel ── */}
        <Paper elevation={0} sx={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          borderRadius: 3, background: 'rgba(255,251,245,0.9)', border: '1px solid', borderColor: 'divider',
          height: { lg: '100%' },
          overflow: 'hidden',
        }}>
          {/* Sticky filters */}
          <Box sx={{ p: 2, pb: 1, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box>
                <Typography variant="h6">{uiText.allCharacters}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {filteredCharacters.length} {uiText.resultsSuffix}
                </Typography>
              </Box>
            </Box>

            <TextField
              fullWidth size="small"
              placeholder={uiText.searchCharacters}
              value={characterQuery}
              onChange={(e) => setCharacterQuery(e.target.value)}
              sx={{ mb: 1.5 }}
            />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
              {teamOrder.map((team) => (
                <FilterCheckbox key={team} checked={selectedTeams.includes(team)}
                  label={teamLabels[uiLanguage][team]} onChange={() => toggleTeam(team)} />
              ))}
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {availableEditions.map((edition) => (
                <FilterCheckbox key={edition} checked={selectedEditions.includes(edition)}
                  label={editionLabels[uiLanguage][edition] ?? toTitleCase(edition)}
                  onChange={() => toggleEdition(edition)} />
              ))}
            </Box>
          </Box>

          {/* Scrollable character list */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
            <Box sx={{ display: 'grid', gap: 1 }}>
              {filteredCharacters.map((character) => {
                const icon = getIconForCharacter(character.id)
                const team = teamLabels[uiLanguage][character.team]
                const edition = editionLabels[uiLanguage][character.edition] ?? toTitleCase(character.edition)
                const currentRevision = getCurrentRevision(character.id)
                const isSelected = character.id === selectedCharacter?.id

                return (
                  <Button
                    key={character.id}
                    onClick={() => handleSelect(character.id)}
                    sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5,
                      justifyContent: 'flex-start', border: '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      background: isSelected ? 'rgba(133, 63, 34, 0.05)' : '#fffdf8',
                      textTransform: 'none',
                      '&:hover': { background: 'rgba(133, 63, 34, 0.08)' },
                    }}
                  >
                    {icon ? (
                      <Box component="img" src={icon} alt="" sx={{ width: 48, height: 48, borderRadius: 999, objectFit: 'contain', background: '#f2ebdf', flexShrink: 0 }} />
                    ) : (
                      <Box sx={{ width: 48, height: 48, borderRadius: 999, background: '#f2ebdf', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ fontWeight: 700, color: '#5d4730' }}>{character.id.slice(0, 2).toUpperCase()}</Typography>
                      </Box>
                    )}
                    <Box sx={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>{getDisplayName(character.id, uiLanguage)}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{team}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        {character.id} · {edition} · {currentRevision}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}
                        dangerouslySetInnerHTML={{ __html: getAbilityText(character.id, uiLanguage) }} />
                    </Box>
                  </Button>
                )
              })}
            </Box>
          </Box>
        </Paper>

        {/* ── Right panel: desktop only ── */}
        <Box sx={{ display: { xs: 'none', lg: 'block' }, width: 380, flexShrink: 0, height: '100%', overflowY: 'auto' }}>
          <CharacterRevisionPanel
            character={selectedCharacter}
            chineseTextLabel={uiText.chineseText}
            currentLabel={uiText.current}
            currentRevisionLabel={uiText.currentRevision}
            englishTextLabel={uiText.englishText}
            language={uiLanguage}
            noCharacterSelectedLabel={uiText.noCharacterSelected}
            revisionNoteLabel={uiText.revisionNote}
            revisionHistoryLabel={uiText.revisionHistory}
            title={uiText.characterVersions}
          />
        </Box>
      </Box>

      {/* ── Mobile: detail popup ── */}
      <Dialog
        open={mobileDetailOpen}
        onClose={() => setMobileDetailOpen(false)}
        fullScreen
        sx={{ display: { lg: 'none' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 1 }}>
          <Box sx={{ flex: 1 }}>
            {selectedCharacter && (
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {getDisplayName(selectedCharacter.id, uiLanguage)}
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setMobileDetailOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <CharacterRevisionPanel
            character={selectedCharacter}
            chineseTextLabel={uiText.chineseText}
            currentLabel={uiText.current}
            currentRevisionLabel={uiText.currentRevision}
            englishTextLabel={uiText.englishText}
            language={uiLanguage}
            noCharacterSelectedLabel={uiText.noCharacterSelected}
            revisionNoteLabel={uiText.revisionNote}
            revisionHistoryLabel={uiText.revisionHistory}
            title={uiText.characterVersions}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
