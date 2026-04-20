import {
  Box,
  Button,
  Checkbox,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { getDisplayName, teamLabels, editionLabels, toTitleCase } from '../../catalog'
import type { CharacterGroup, EditableScript, Language, ResolvedScriptCharacter, ResolvedScriptCharacterGroup } from '../../types'

function getTeamColor(team: string) {
  const colors: Record<string, string> = {
    townsfolk: '#2f6b6a',
    outsider: '#7f6a3a',
    minion: '#8d4031',
    demon: '#482121',
    traveler: '#4f5870',
    fabled: '#5c4a3d',
    loric: '#3c5268',
  }
  return colors[team] || '#666'
}

type Props = {
  activeScript: EditableScript
  updateActiveScript: (updater: (script: EditableScript) => EditableScript, nextSlug?: string) => void
  uiText: Record<string, string>
  uiLanguage: Language
  editorQuery: string
  setEditorQuery: (v: string) => void
  groupedEditorCharacters: CharacterGroup[]
  activeScriptCharacters: ResolvedScriptCharacter[]
  groupedScriptCharacters: ResolvedScriptCharacterGroup[]
  toggleCharacterInScript: (id: string) => void
  availableEditions: string[]
}

export function ScriptEditor({
  activeScript,
  updateActiveScript,
  uiText,
  uiLanguage,
  editorQuery,
  setEditorQuery,
  groupedEditorCharacters,
  activeScriptCharacters,
  groupedScriptCharacters,
  toggleCharacterInScript,
  availableEditions,
}: Props) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>{uiText.bootleggerRules}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{uiText.bootleggerRulesHelp}</Typography>
      <Box sx={{ display: 'grid', gap: 1, mb: 3 }}>
        {(activeScript.meta.bootlegger ?? []).map((rule, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth size="small"
              placeholder={uiText.bootleggerRulePlaceholder}
              value={rule}
              onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger: (s.meta.bootlegger ?? []).map((r, i) => i === index ? e.target.value : r) } }))}
            />
            <Button size="small" variant="outlined" onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger: (s.meta.bootlegger ?? []).filter((_, i) => i !== index) } }))}>
              {uiText.remove}
            </Button>
          </Box>
        ))}
        <Button size="small" variant="outlined" onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger: [...(s.meta.bootlegger ?? []), ''] } }))}>
          {uiText.addRule}
        </Button>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>{uiText.bootleggerRulesZh}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{uiText.bootleggerRulesZhHelp}</Typography>
      <Box sx={{ display: 'grid', gap: 1, mb: 3 }}>
        {(activeScript.meta.bootlegger_zh ?? []).map((rule, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth size="small"
              placeholder={uiText.bootleggerRuleZhPlaceholder}
              value={rule}
              onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger_zh: (s.meta.bootlegger_zh ?? []).map((r, i) => i === index ? e.target.value : r) } }))}
            />
            <Button size="small" variant="outlined" onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger_zh: (s.meta.bootlegger_zh ?? []).filter((_, i) => i !== index) } }))}>
              {uiText.remove}
            </Button>
          </Box>
        ))}
        <Button size="small" variant="outlined" onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger_zh: [...(s.meta.bootlegger_zh ?? []), ''] } }))}>
          {uiText.addRule}
        </Button>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>{uiText.scriptJinxes}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{uiText.scriptJinxesHelp}</Typography>
      <Box sx={{ display: 'grid', gap: 1, mb: 3 }}>
        {(activeScript.meta.jinxes ?? []).map((jinx, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField size="small" placeholder={uiText.jinxPairPlaceholder} value={jinx.id ?? ''} onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, id: e.target.value } : j) } }))} sx={{ flex: '1 1 150px' }} />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select value={jinx.status ?? 'active'} onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, status: e.target.value === 'inactive' ? 'inactive' : 'active' } : j) } }))}>
                <MenuItem value="active">{uiText.jinxStatusActive}</MenuItem>
                <MenuItem value="inactive">{uiText.jinxStatusInactive}</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" placeholder={uiText.jinxReasonEnPlaceholder} value={jinx.reason ?? ''} onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, reason: e.target.value } : j) } }))} sx={{ flex: '1 1 150px' }} />
            <TextField size="small" placeholder={uiText.jinxReasonZhPlaceholder} value={jinx.reason_zh ?? ''} onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, reason_zh: e.target.value } : j) } }))} sx={{ flex: '1 1 150px' }} />
            <Button size="small" variant="outlined" onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).filter((_, i) => i !== index) } }))}>{uiText.remove}</Button>
          </Box>
        ))}
        <Button size="small" variant="outlined" onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: [...(s.meta.jinxes ?? []), { id: '', status: 'active', reason: '', reason_zh: '' }] } }))}>
          {uiText.addJinx}
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 300px' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{uiText.availableCharacters}</Typography>
          <TextField fullWidth size="small" placeholder={uiText.filterCharacters} value={editorQuery} onChange={(e) => setEditorQuery(e.target.value)} sx={{ mb: 2 }} />
          {groupedEditorCharacters.map((group) => (
            <Box key={group.team} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, mb: 1, background: getTeamColor(group.team) }}>
                <Typography variant="subtitle2" sx={{ flex: 1, fontStyle: 'italic', color: 'white' }}>{teamLabels[uiLanguage][group.team]}</Typography>
                <Typography variant="caption" sx={{ color: 'white' }}>{group.characters.length}</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                {group.characters.map((character) => (
                  <Box key={character.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Checkbox checked={activeScript.characters.includes(character.id)} onChange={() => toggleCharacterInScript(character.id)} size="small" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{getDisplayName(character.id, uiLanguage)}</Typography>
                      <Typography variant="caption" color="text.secondary">{character.id}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{uiText.selectedCharacters}</Typography>
            <Typography variant="body2" color="text.secondary">{activeScriptCharacters.length} {uiText.selectedCount}</Typography>
          </Box>
          {groupedScriptCharacters.length > 0 ? (
            groupedScriptCharacters.map((group) => (
              <Box key={group.team} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, mb: 1, background: getTeamColor(group.team) }}>
                  <Typography variant="subtitle2" sx={{ flex: 1, fontStyle: 'italic', color: 'white' }}>{teamLabels[uiLanguage][group.team]}</Typography>
                  <Typography variant="caption" sx={{ color: 'white' }}>{group.characters.length}</Typography>
                </Box>
                {group.characters.map((character) => (
                  <Box key={character.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{character.name ?? getDisplayName(character.id, uiLanguage)}</Typography>
                      <Typography variant="caption" color="text.secondary">{character.id}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => toggleCharacterInScript(character.id)}>×</IconButton>
                  </Box>
                ))}
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">{uiText.noCharacters}</Typography>
          )}
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3, mt: 2 }}>
        <TextField label={uiText.title} value={activeScript.title} onChange={(e) => updateActiveScript((s) => ({ ...s, title: e.target.value }))} size="small" />
        <TextField label={uiText.chineseTitle} value={activeScript.titleZh} onChange={(e) => updateActiveScript((s) => ({ ...s, titleZh: e.target.value }))} size="small" />
        <TextField label={uiText.author} value={activeScript.author} onChange={(e) => updateActiveScript((s) => ({ ...s, author: e.target.value }))} size="small" />
        <FormControl size="small">
          <Select value={activeScript.edition} onChange={(e) => updateActiveScript((s) => ({ ...s, edition: e.target.value }))}>
            {availableEditions.map((edition) => (
              <MenuItem key={edition} value={edition}>{editionLabels[uiLanguage][edition] ?? toTitleCase(edition)}</MenuItem>
            ))}
            <MenuItem value="custom">{uiText.custom}</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  )
}
