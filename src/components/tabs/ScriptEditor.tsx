import React from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
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
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CloseIcon from '@mui/icons-material/Close'
import {
  getDisplayName,
  getIconForCharacter,
  teamLabels,
  editionLabels,
  toTitleCase,
  getCharacterRevisionIds,
  getCurrentRevision,
  getRevisionForScript,
  getRevisionText,
  getAbilityText,
  getCharacterById,
} from '../../catalog'
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
  onCreateCustomFromId?: (id: string) => void
}

// ── Character icon + name row used in the Available picker ───────────────────
function PickerCharRow({
  id,
  uiLanguage,
  selected,
  onToggle,
}: {
  id: string
  uiLanguage: Language
  selected: boolean
  onToggle: () => void
}) {
  const icon = getIconForCharacter(id)
  const name = getDisplayName(id, uiLanguage)
  const ability = getAbilityText(id, uiLanguage) ?? getAbilityText(id, 'en')

  return (
    <Tooltip
      title={ability ? <Typography variant="caption" sx={{ lineHeight: 1.4, display: 'block', maxWidth: 260 }}>{ability}</Typography> : ''}
      placement="right"
      arrow
    >
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: '5px 8px',
          borderRadius: 1,
          cursor: 'pointer',
          bgcolor: selected ? 'primary.main' : 'transparent',
          '&:hover': { bgcolor: selected ? 'primary.dark' : 'action.hover' },
          transition: 'background-color 0.1s',
        }}
      >
        {icon ? (
          <Box component="img" src={icon} alt="" sx={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'contain', bgcolor: 'background.paper', flexShrink: 0, opacity: selected ? 0.95 : 1 }} />
        ) : (
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: selected ? 'primary.light' : 'action.disabledBackground', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: 'text.secondary' }}>{id.slice(0, 2).toUpperCase()}</Typography>
          </Box>
        )}
        <Typography variant="body2" sx={{ fontSize: '0.8rem', lineHeight: 1.2, color: selected ? 'primary.contrastText' : 'text.primary', fontWeight: selected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </Typography>
      </Box>
    </Tooltip>
  )
}

// ── Selected character row ────────────────────────────────────────────────────
function SelectedCharRow({
  character,
  activeScript,
  uiLanguage,
  updateActiveScript,
  toggleCharacterInScript,
}: {
  character: ResolvedScriptCharacter
  activeScript: EditableScript
  uiLanguage: Language
  updateActiveScript: Props['updateActiveScript']
  toggleCharacterInScript: (id: string) => void
}) {
  const zh = uiLanguage === 'zh'
  const icon = getIconForCharacter(character.id)
  const revIds = getCharacterRevisionIds(character.id)
  const currentRev = getCurrentRevision(character.id)
  const pinnedRev = getRevisionForScript(character.id, activeScript.pinnedRevisions)
  const hasPinned = !!activeScript.pinnedRevisions?.[character.id]
  const pinnedAbility = (hasPinned && pinnedRev && pinnedRev !== currentRev)
    ? (getRevisionText(character.id, uiLanguage, pinnedRev) || getAbilityText(character.id, uiLanguage))
    : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', py: '3px', px: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        {/* Icon */}
        {icon ? (
          <Box component="img" src={icon} alt="" sx={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'contain', bgcolor: 'background.paper', flexShrink: 0 }} />
        ) : (
          <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'action.disabledBackground', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography sx={{ fontSize: '0.45rem', fontWeight: 700, color: 'text.secondary' }}>{character.id.slice(0, 2).toUpperCase()}</Typography>
          </Box>
        )}
        {/* Name */}
        <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {character.name ?? getDisplayName(character.id, uiLanguage)}
        </Typography>
        {/* Version selector — only if multiple revisions */}
        {revIds.length > 1 && (
          <FormControl size="small" sx={{ minWidth: 90, flexShrink: 0 }}>
            <Select
              value={pinnedRev ?? currentRev ?? ''}
              onChange={(e) => {
                const val = e.target.value
                updateActiveScript((s) => {
                  const next = { ...(s.pinnedRevisions ?? {}) }
                  if (!val || val === currentRev) delete next[character.id]
                  else next[character.id] = val
                  return { ...s, pinnedRevisions: next }
                })
              }}
              renderValue={(val) => {
                const r = val as string
                return r === currentRev ? r + (zh ? '（当前）' : ' (cur)') : r
              }}
              sx={{
                fontSize: '0.7rem',
                '& .MuiSelect-select': { py: '2px', pl: 1 },
                borderColor: hasPinned ? 'primary.main' : undefined,
                color: hasPinned ? 'primary.main' : undefined,
              }}
            >
              {revIds.map((r) => (
                <MenuItem key={r} value={r}>
                  <Box sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" sx={{ fontWeight: r === currentRev ? 700 : 400 }}>
                      {r}{r === currentRev ? (zh ? '（当前）' : ' (current)') : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'normal', lineHeight: 1.3 }}>
                      {getRevisionText(character.id, uiLanguage, r) || getAbilityText(character.id, uiLanguage)}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {/* Remove */}
        <Tooltip title={zh ? '移除' : 'Remove'}>
          <IconButton size="small" onClick={() => toggleCharacterInScript(character.id)} sx={{ p: '2px', flexShrink: 0 }}>
            <CloseIcon sx={{ fontSize: '0.85rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
      {pinnedAbility && (
        <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.25, ml: 3.5, lineHeight: 1.3, fontSize: '0.7rem' }}>
          {pinnedAbility}
        </Typography>
      )}
    </Box>
  )
}

// ── Accordion section header helper ──────────────────────────────────────────
function SectionAccordion({
  title,
  badge,
  children,
  defaultExpanded = false,
}: {
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
}) {
  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', mb: 1.5, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: '8px', alignItems: 'center', gap: 1 } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{title}</Typography>
        {badge}
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 2 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  )
}

export function ScriptEditor({
  activeScript,
  updateActiveScript,
  uiText,
  uiLanguage,
  onCreateCustomFromId,
  editorQuery,
  setEditorQuery,
  groupedEditorCharacters,
  activeScriptCharacters,
  groupedScriptCharacters,
  toggleCharacterInScript,
  availableEditions,
}: Props) {
  const zh = uiLanguage === 'zh'

  const hasNotes = !!activeScript.notes?.trim()
  const bootleggerCount = (activeScript.meta.bootlegger?.filter(Boolean).length ?? 0) + (activeScript.meta.bootlegger_zh?.filter(Boolean).length ?? 0)
  const jinxCount = activeScript.meta.jinxes?.length ?? 0

  // IDs in the script that can't be resolved to any known character
  const unknownCharIds = React.useMemo(() => {
    const resolvedIds = new Set(activeScriptCharacters.map((c) => c.id))
    return activeScript.characters.filter((id) => !resolvedIds.has(id) && !getCharacterById(id))
  }, [activeScript.characters, activeScriptCharacters])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Script Info ── */}
      <SectionAccordion
        title={zh ? '脚本信息' : 'Script Info'}
        defaultExpanded
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
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
      </SectionAccordion>

      {/* ── Characters ── */}
      <SectionAccordion
        title={zh ? '角色' : 'Characters'}
        defaultExpanded
        badge={
          <Chip
            size="small"
            label={activeScriptCharacters.length}
            color={activeScriptCharacters.length > 0 ? 'primary' : 'default'}
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        }
      >
        {/* Unknown character warning */}
        {unknownCharIds.length > 0 && (
          <Box sx={{ mb: 1.5, p: 1.5, border: '1px solid', borderColor: 'warning.main', borderRadius: 1, bgcolor: 'warning.light' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <WarningAmberIcon fontSize="small" color="warning" />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                {zh ? '未知角色 ID（不在当前数据库中）' : 'Unknown IDs (not in database)'}
              </Typography>
            </Box>
            {unknownCharIds.map((id) => (
              <Box key={id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>{id}</Typography>
                {onCreateCustomFromId && (
                  <Button size="small" variant="outlined" color="warning" sx={{ fontSize: '0.65rem', py: 0.25 }}
                    onClick={() => onCreateCustomFromId(id)}>
                    {zh ? '创建自定义' : 'Create custom'}
                  </Button>
                )}
                <Button size="small" variant="outlined" color="error" sx={{ fontSize: '0.65rem', py: 0.25 }}
                  onClick={() => updateActiveScript((s) => ({ ...s, characters: s.characters.filter((c) => c !== id) }))}>
                  {zh ? '移除' : 'Remove'}
                </Button>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 280px' }, gap: 2, alignItems: 'start' }}>
          {/* Left: Available characters */}
          <Box>
            <TextField
              fullWidth size="small"
              placeholder={uiText.filterCharacters}
              value={editorQuery}
              onChange={(e) => setEditorQuery(e.target.value)}
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ maxHeight: '52vh', overflowY: 'auto', pr: 0.5 }}>
              {groupedEditorCharacters.map((group) => (
                <Box key={group.team} sx={{ mb: 1.5 }}>
                  {/* Team header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 1, mb: 0.5, background: getTeamColor(group.team) }}>
                    <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: 'white', letterSpacing: 0.5 }}>
                      {teamLabels[uiLanguage][group.team]?.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.65rem' }}>
                      {group.characters.filter((c) => activeScript.characters.includes(c.id)).length}/{group.characters.length}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 0.25 }}>
                    {group.characters.map((character) => (
                      <PickerCharRow
                        key={character.id}
                        id={character.id}
                        uiLanguage={uiLanguage}
                        selected={activeScript.characters.includes(character.id)}
                        onToggle={() => toggleCharacterInScript(character.id)}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right: Selected characters */}
          <Paper variant="outlined" sx={{ p: 1.5, position: 'sticky', top: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {zh ? '已选' : 'Selected'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {activeScriptCharacters.length} {uiText.selectedCount}
              </Typography>
            </Box>

            {groupedScriptCharacters.length > 0 ? (
              groupedScriptCharacters.map((group) => (
                <Box key={group.team} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5, py: '2px', borderRadius: '4px 4px 0 0', background: getTeamColor(group.team), mb: 0.25 }}>
                    <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: 'white', fontSize: '0.65rem', letterSpacing: 0.5 }}>
                      {teamLabels[uiLanguage][group.team]?.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.6rem' }}>
                      {group.characters.length}
                    </Typography>
                  </Box>
                  {group.characters.map((character) => (
                    <SelectedCharRow
                      key={character.id}
                      character={character}
                      activeScript={activeScript}
                      uiLanguage={uiLanguage}
                      updateActiveScript={updateActiveScript}
                      toggleCharacterInScript={toggleCharacterInScript}
                    />
                  ))}
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 3, fontSize: '0.8rem' }}>
                {uiText.noCharacters}
              </Typography>
            )}
          </Paper>
        </Box>
      </SectionAccordion>

      {/* ── Notes ── */}
      <SectionAccordion
        title={zh ? '脚本备注' : 'Script Notes'}
        badge={hasNotes ? <Chip size="small" label={zh ? '已有内容' : 'has content'} color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} /> : undefined}
      >
        <TextField
          fullWidth multiline minRows={3} size="small"
          placeholder={zh ? '在此记录说书人备注、版本说明或游戏提示…' : 'ST notes, version notes, gameplay tips…'}
          value={activeScript.notes ?? ''}
          onChange={(e) => updateActiveScript((s) => ({ ...s, notes: e.target.value }))}
        />
      </SectionAccordion>

      {/* ── Advanced: Bootlegger rules + Jinxes ── */}
      <SectionAccordion
        title={zh ? '高级设置' : 'Advanced'}
        badge={
          (bootleggerCount > 0 || jinxCount > 0) ? (
            <Chip size="small" label={bootleggerCount + jinxCount} color="secondary" sx={{ height: 18, fontSize: '0.65rem' }} />
          ) : undefined
        }
      >
        {/* Bootlegger EN */}
        <Typography variant="subtitle2" sx={{ mb: 0.5, mt: 0.5 }}>{uiText.bootleggerRules}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{uiText.bootleggerRulesHelp}</Typography>
        <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
          {(activeScript.meta.bootlegger ?? []).map((rule, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1 }}>
              <TextField fullWidth size="small" placeholder={uiText.bootleggerRulePlaceholder} value={rule}
                onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger: (s.meta.bootlegger ?? []).map((r, i) => i === index ? e.target.value : r) } }))} />
              <Button size="small" variant="outlined" onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger: (s.meta.bootlegger ?? []).filter((_, i) => i !== index) } }))}>
                {uiText.remove}
              </Button>
            </Box>
          ))}
          <Button size="small" variant="outlined" onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger: [...(s.meta.bootlegger ?? []), ''] } }))}>
            {uiText.addRule}
          </Button>
        </Box>

        {/* Bootlegger ZH */}
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{uiText.bootleggerRulesZh}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{uiText.bootleggerRulesZhHelp}</Typography>
        <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
          {(activeScript.meta.bootlegger_zh ?? []).map((rule, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1 }}>
              <TextField fullWidth size="small" placeholder={uiText.bootleggerRuleZhPlaceholder} value={rule}
                onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, bootlegger_zh: (s.meta.bootlegger_zh ?? []).map((r, i) => i === index ? e.target.value : r) } }))} />
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
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{uiText.scriptJinxes}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{uiText.scriptJinxesHelp}</Typography>
        <Box sx={{ display: 'grid', gap: 1 }}>
          {(activeScript.meta.jinxes ?? []).map((jinx, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <TextField size="small" placeholder={uiText.jinxPairPlaceholder} value={jinx.id ?? ''}
                onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, id: e.target.value } : j) } }))}
                sx={{ flex: '1 1 130px' }} />
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select value={jinx.status ?? 'active'}
                  onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, status: e.target.value === 'inactive' ? 'inactive' : 'active' } : j) } }))}>
                  <MenuItem value="active">{uiText.jinxStatusActive}</MenuItem>
                  <MenuItem value="inactive">{uiText.jinxStatusInactive}</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" placeholder={uiText.jinxReasonEnPlaceholder} value={jinx.reason ?? ''}
                onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, reason: e.target.value } : j) } }))}
                sx={{ flex: '2 1 160px' }} />
              <TextField size="small" placeholder={uiText.jinxReasonZhPlaceholder} value={jinx.reason_zh ?? ''}
                onChange={(e) => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).map((j, i) => i === index ? { ...j, reason_zh: e.target.value } : j) } }))}
                sx={{ flex: '2 1 160px' }} />
              <IconButton size="small" color="error"
                onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: (s.meta.jinxes ?? []).filter((_, i) => i !== index) } }))}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button size="small" variant="outlined"
            onClick={() => updateActiveScript((s) => ({ ...s, meta: { ...s.meta, jinxes: [...(s.meta.jinxes ?? []), { id: '', status: 'active', reason: '', reason_zh: '' }] } }))}>
            {uiText.addJinx}
          </Button>
        </Box>
      </SectionAccordion>

    </Box>
  )
}
