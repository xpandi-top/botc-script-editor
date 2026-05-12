import React from 'react'
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import { getDisplayName, teamLabels, editionLabels, toTitleCase, getCharacterRevisionIds, getCurrentRevision, getRevisionForScript } from '../../catalog'
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
  charColumns: '1' | '2'
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
  charColumns,
}: Props) {
  const [notesOpen, setNotesOpen] = React.useState(false)
  const zh = uiLanguage === 'zh'

  return (
    <Box>
      {/* Title / author / edition — top */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
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

      {/* Script Notes */}
      <Box sx={{ mb: 3 }}>
        <Button
          size="small"
          startIcon={<NoteAltIcon fontSize="small" />}
          endIcon={notesOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          onClick={() => setNotesOpen((v) => !v)}
          sx={{ textTransform: 'none', mb: 0.5 }}
        >
          {zh ? '脚本备注' : 'Script Notes'}
          {activeScript.notes && !notesOpen && (
            <Chip size="small" label={zh ? '已有备注' : 'has notes'} sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} color="primary" variant="outlined" />
          )}
        </Button>
        <Collapse in={notesOpen}>
          <TextField
            fullWidth multiline minRows={3} size="small"
            placeholder={zh ? '在此记录说书人备注、版本说明或游戏提示…' : 'ST notes, version notes, gameplay tips…'}
            value={activeScript.notes ?? ''}
            onChange={(e) => updateActiveScript((s) => ({ ...s, notes: e.target.value }))}
          />
        </Collapse>
      </Box>

      {/* Bootlegger rules EN */}
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

      {/* Bootlegger rules ZH */}
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

      {/* Jinxes */}
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

      {/* Character picker */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 300px' }, gap: 2, mb: 3 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{uiText.availableCharacters}</Typography>
          <TextField fullWidth size="small" placeholder={uiText.filterCharacters} value={editorQuery} onChange={(e) => setEditorQuery(e.target.value)} sx={{ mb: 2 }} />
          {groupedEditorCharacters.map((group) => (
            <Box key={group.team} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, mb: 1, background: getTeamColor(group.team) }}>
                <Typography variant="subtitle2" sx={{ flex: 1, fontStyle: 'italic', color: 'white' }}>{teamLabels[uiLanguage][group.team]}</Typography>
                <Typography variant="caption" sx={{ color: 'white' }}>{group.characters.length}</Typography>
              </Box>
              <Box sx={{ maxHeight: 400, overflowY: 'auto', display: 'grid', gridTemplateColumns: charColumns === '2' ? 'repeat(2, 1fr)' : '1fr', gap: 1 }}>
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
                {group.characters.map((character) => {
                  const revIds = getCharacterRevisionIds(character.id)
                  const currentRev = getCurrentRevision(character.id)
                  const pinnedRev = getRevisionForScript(character.id, activeScript.pinnedRevisions)
                  const hasPinned = !!activeScript.pinnedRevisions?.[character.id]
                  return (
                    <Box key={character.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: '1px solid', borderColor: hasPinned ? 'primary.main' : 'divider', borderRadius: 1, mb: 1, gap: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{character.name ?? getDisplayName(character.id, uiLanguage)}</Typography>
                        <Typography variant="caption" color="text.secondary">{character.id}</Typography>
                      </Box>
                      {revIds.length > 1 && (
                        <Tooltip title={zh ? '选择版本（影响说书人显示的技能文本）' : 'Pin a revision — affects ability text shown in Storyteller'}>
                          <FormControl size="small" sx={{ minWidth: 90 }}>
                            <Select
                              value={pinnedRev ?? ''}
                              displayEmpty
                              onChange={(e) => {
                                const val = e.target.value
                                updateActiveScript((s) => {
                                  const next = { ...(s.pinnedRevisions ?? {}) }
                                  if (!val || val === currentRev) {
                                    delete next[character.id]
                                  } else {
                                    next[character.id] = val
                                  }
                                  return { ...s, pinnedRevisions: next }
                                })
                              }}
                              sx={{ fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.5 } }}
                            >
                              <MenuItem value={currentRev ?? ''}>{zh ? '当前版本' : 'Current'}</MenuItem>
                              {revIds.filter((r) => r !== currentRev).map((r) => (
                                <MenuItem key={r} value={r}>{r}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Tooltip>
                      )}
                      <IconButton size="small" onClick={() => toggleCharacterInScript(character.id)}>×</IconButton>
                    </Box>
                  )
                })}
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">{uiText.noCharacters}</Typography>
          )}
        </Paper>
      </Box>

    </Box>
  )
}
