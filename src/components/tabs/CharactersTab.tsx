import { Box, Button, Paper, TextField, Typography } from '@mui/material'
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
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, background: 'rgba(255,251,245,0.9)', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6">{uiText.allCharacters}</Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredCharacters.length} {uiText.resultsSuffix}
            </Typography>
          </Box>
        </Box>

        <TextField
          fullWidth
          size="small"
          placeholder={uiText.searchCharacters}
          value={characterQuery}
          onChange={(e) => setCharacterQuery(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {teamOrder.map((team) => (
            <FilterCheckbox
              key={team}
              checked={selectedTeams.includes(team)}
              label={teamLabels[uiLanguage][team]}
              onChange={() => toggleTeam(team)}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {availableEditions.map((edition) => (
            <FilterCheckbox
              key={edition}
              checked={selectedEditions.includes(edition)}
              label={editionLabels[uiLanguage][edition] ?? toTitleCase(edition)}
              onChange={() => toggleEdition(edition)}
            />
          ))}
        </Box>

        <Box sx={{ display: 'grid', gap: 1.5 }}>
          {filteredCharacters.map((character) => {
            const icon = getIconForCharacter(character.id)
            const team = teamLabels[uiLanguage][character.team]
            const edition = editionLabels[uiLanguage][character.edition] ?? toTitleCase(character.edition)
            const currentRevision = getCurrentRevision(character.id)
            const isSelected = character.id === selectedCharacter?.id

            return (
              <Button
                key={character.id}
                onClick={() => setSelectedCharacterId(character.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  p: 1.5,
                  justifyContent: 'flex-start',
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  background: isSelected ? 'rgba(133, 63, 34, 0.05)' : '#fffdf8',
                  textTransform: 'none',
                  '&:hover': { background: 'rgba(133, 63, 34, 0.08)' },
                }}
              >
                {icon ? (
                  <Box component="img" src={icon} alt="" sx={{ width: 56, height: 56, borderRadius: 999, objectFit: 'contain', background: '#f2ebdf' }} />
                ) : (
                  <Box sx={{ width: 56, height: 56, borderRadius: 999, background: '#f2ebdf', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: '#5d4730' }}>{character.id.slice(0, 2).toUpperCase()}</Typography>
                  </Box>
                )}
                <Box sx={{ textAlign: 'left' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 600 }}>{getDisplayName(character.id, uiLanguage)}</Typography>
                    <Typography variant="caption" component="span" color="text.secondary">{team}</Typography>
                  </Box>
                  <Typography variant="caption" component="span" sx={{ display: 'block', color: 'text.secondary' }}>
                    {character.id} · {edition} · {currentRevision}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} dangerouslySetInnerHTML={{ __html: getAbilityText(character.id, uiLanguage) }} />
                </Box>
              </Button>
            )
          })}
        </Box>
      </Paper>

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
  )
}
