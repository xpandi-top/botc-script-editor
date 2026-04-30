// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Button, Chip, Dialog, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, IconButton, InputLabel,
  MenuItem, Select, Switch, TextField, Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { getDisplayName, getIconForCharacter, getAbilityText } from '../../../catalog'

// ── Constants ──────────────────────────────────────────────────
const ST_TAG_PREFIX = '📝'
const DEFAULT_ST_TAGS = ['drunk', 'poisoned', 'protected', 'red herring', 'used']

// stTag format: "📝label" or "📝label::sourceCharId"
function parseStTag(tag: string): { label: string; sourceCharId: string | null } {
  const body = tag.startsWith(ST_TAG_PREFIX) ? tag.slice(ST_TAG_PREFIX.length) : tag
  const sep = body.indexOf('::')
  if (sep === -1) return { label: body, sourceCharId: null }
  return { label: body.slice(0, sep), sourceCharId: body.slice(sep + 2) || null }
}
function buildStTag(label: string, sourceCharId?: string | null): string {
  return `${ST_TAG_PREFIX}${label}${sourceCharId ? `::${sourceCharId}` : ''}`
}

type SkillType = 'know' | 'guess' | 'addTag' | 'removeTag' | 'changeChar'
const SKILL_LABELS: Record<SkillType, { en: string; zh: string }> = {
  know:       { en: 'Know',             zh: '已知信息' },
  guess:      { en: 'Guess',            zh: '猜测' },
  addTag:     { en: 'Add ST Tag',       zh: '添加ST标签' },
  removeTag:  { en: 'Remove Tag',       zh: '移除标签' },
  changeChar: { en: 'Change Character', zh: '变更角色' },
}

// ── Log helpers ─────────────────────────────────────────────────
function eventMentionsSeat(detail: string, seatNum: number) {
  return new RegExp(`#${seatNum}(?:\\D|$)`).test(detail)
}

function buildPlayerEntries(days: any[], seatNum: number, includeNight: boolean) {
  const sortedDays = [...days].sort((a, b) => b.day - a.day)
  return sortedDays.map((day) => {
    const entries: any[] = []

    for (const e of day.eventLog) {
      if (!includeNight && e.phase === 'night') continue
      if (eventMentionsSeat(e.detail, seatNum)) {
        entries.push({ id: `e-${day.day}-${e.id}`, timestamp: e.timestamp, text: e.detail, kind: e.kind, editable: e.detail })
      }
    }
    for (const v of day.voteHistory) {
      if (v.actor === seatNum || v.target === seatNum) {
        const result = v.passed ? 'PASS' : 'FAIL'
        const line = `#${v.actor} → #${v.target}: ${result} (${v.voteCount}/${v.requiredVotes})${v.isExile ? ' [exile]' : ''}`
        entries.push({ id: `v-${day.day}-${v.id}`, timestamp: parseInt(v.id, 10) || 0, text: line, kind: 'vote', editable: v.note || '' })
      }
    }
    for (const s of day.skillHistory) {
      if (s.actor === seatNum || (s.targets || []).includes(seatNum)) {
        const line = `#${s.actor} → [${(s.targets || []).map((t: number) => `#${t}`).join(', ')}] ${s.roleId || '?'}`
        entries.push({ id: `s-${day.day}-${s.id}`, timestamp: parseInt(s.id, 10) || 0, text: line, kind: 'skill', editable: s.statement || '' })
      }
    }
    entries.sort((a, b) => b.timestamp - a.timestamp)
    return { day: day.day, entries }
  }).filter((d) => d.entries.length > 0)
}

const KIND_COLOR: Record<string, any> = { vote: 'primary', skill: 'secondary', tagChange: 'warning', stateChange: 'error', phaseTransition: 'default' }
const KIND_LABEL_EN: Record<string, string> = { vote: 'vote', skill: 'skill', tagChange: 'tag', stateChange: 'state', phaseTransition: 'phase' }

// ── Component ────────────────────────────────────────────────────
export function ArenaSeatPlayerModal({ ctx, seat }: { ctx: any; seat: any }) {
  const {
    language, text, currentDay, days,
    skillOverlay, setSkillOverlay, closeSkillOverlay, openSeatSkill,
    currentScriptCharacters, seatTagDrafts, setSeatTagDrafts,
    customTagPool, updateSeatWithLog, updateCurrentDay, appendEvent,
    addCustomTag, playerModalSeat, setPlayerModalSeat,
    editLogEntry, removeLogEntry, addQuickEvent,
  } = ctx

  const zh = language === 'zh'
  const isOpen = playerModalSeat === seat?.seat
  const phase = currentDay?.phase ?? 'private'
  const isNight = phase === 'night'

  // ── Section state ──
  const [showCharPicker, setShowCharPicker] = useState(false)
  const [stTagInput, setStTagInput] = useState('')
  const [publicTagInput, setPublicTagInput] = useState('')

  // ── Night Ability state ──
  const [skillType, setSkillType] = useState<SkillType | ''>('')
  const [targets, setTargets] = useState<Set<number>>(new Set())
  const [knowKind, setKnowKind] = useState<'good'|'evil'|'character'|'other'>('good')
  const [knowCharId, setKnowCharId] = useState('')
  const [knowOtherText, setKnowOtherText] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [removeTagVal, setRemoveTagVal] = useState('')
  const [newCharId, setNewCharId] = useState('')
  const [isSuccess, setIsSuccess] = useState(true)
  const [skillNote, setSkillNote] = useState('')

  // ── Log state ──
  const [logExpanded, setLogExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [quickAddText, setQuickAddText] = useState('')
  const [quickAddSt, setQuickAddSt] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowCharPicker(false)
      setSkillType('')
      setTargets(new Set())
      setIsSuccess(true)
      setSkillNote('')
      setStTagInput('')
      setPublicTagInput('')
      setLogExpanded(false)
      setEditingId(null)
      setQuickAddText('')
    }
  }, [isOpen])

  if (!isOpen || !seat) return null

  const handleClose = () => {
    setPlayerModalSeat(null)
    if (skillOverlay) closeSkillOverlay(false)
  }

  // ── Character helpers ──
  const actualCharId = seat.characterId
  const perceivedCharId = seat.userCharacterId || seat.characterId
  const showDifferentPerception = seat.userCharacterId && seat.userCharacterId !== seat.characterId
  const actualIcon = actualCharId ? getIconForCharacter(actualCharId) : null
  const perceivedIcon = perceivedCharId ? getIconForCharacter(perceivedCharId) : null

  const reassignChar = (cid: string) => { updateSeatWithLog(seat.seat, (s: any) => ({ ...s, characterId: cid })); setShowCharPicker(false) }
  const reassignPerceived = (cid: string) => { updateSeatWithLog(seat.seat, (s: any) => ({ ...s, userCharacterId: cid })); setShowCharPicker(false) }

  // ── ST Tag helpers ──
  const stTags: string[] = seat.stTags || []
  const removeStTag = (tag: string) => updateSeatWithLog(seat.seat, (s: any) => ({ ...s, stTags: (s.stTags || []).filter((t: string) => t !== tag) }))
  const addStTag = (label: string, sourceCharId?: string | null) => {
    if (!label.trim()) return
    const tag = buildStTag(label.trim(), sourceCharId)
    updateSeatWithLog(seat.seat, (s: any) => ({ ...s, stTags: [...new Set([...(s.stTags || []), tag])] }))
    setStTagInput('')
  }
  const toggleDefaultStTag = (label: string) => {
    const existing = stTags.find((t) => parseStTag(t).label === label)
    if (existing) removeStTag(existing)
    else addStTag(label)
  }

  // ── Custom public tag helpers ──
  const handleAddPublicTag = (label?: string) => {
    const val = (label ?? publicTagInput).trim()
    if (!val) return
    updateSeatWithLog(seat.seat, (s: any) => ({ ...s, customTags: [...new Set([...s.customTags, val])] }))
    setSeatTagDrafts?.((c: any) => ({ ...c, [seat.seat]: '' }))
    setPublicTagInput('')
  }
  const toggleCustomTag = (tag: string) => updateSeatWithLog(seat.seat, (s: any) => ({
    ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v: any) => v !== tag) : [...s.customTags, tag],
  }))
  const characterTag = (c: string) => `💀${c}`
  const isCharacterTag = (tag: string) => tag.startsWith('💀')

  // ── Night Ability helpers ──
  const allSeats: any[] = currentDay?.seats ?? []
  const toggleTarget = (seatNum: number) => setTargets((prev) => { const next = new Set(prev); next.has(seatNum) ? next.delete(seatNum) : next.add(seatNum); return next })
  const allTagsForTargets = useMemo(() => {
    const tagSet = new Set<string>()
    for (const seatNum of targets) {
      const s = allSeats.find((x: any) => x.seat === seatNum)
      if (s) { (s.customTags || []).forEach((t: string) => tagSet.add(t)); (s.stTags || []).forEach((t: string) => tagSet.add(t)) }
    }
    return Array.from(tagSet)
  }, [targets, allSeats])

  const canSaveSkill = useMemo(() => {
    if (!skillType || targets.size === 0) return false
    if (skillType === 'addTag') return tagInput.trim().length > 0
    if (skillType === 'removeTag') return removeTagVal.length > 0
    if (skillType === 'changeChar') return newCharId.length > 0
    if (skillType === 'know' || skillType === 'guess') {
      if (knowKind === 'character') return knowCharId.length > 0
      if (knowKind === 'other') return knowOtherText.trim().length > 0
      return true
    }
    return false
  }, [skillType, targets, tagInput, removeTagVal, newCharId, knowKind, knowCharId, knowOtherText])

  const handleSaveSkill = () => {
    if (!canSaveSkill) return
    const targetArr = Array.from(targets)
    const actorLabel = `#${seat.seat}${actualCharId ? ` (${getDisplayName(actualCharId, language)})` : ''}`
    const targetLabels = targetArr.map((n) => { const s = allSeats.find((x: any) => x.seat === n); return `#${n}${s?.characterId ? ` (${getDisplayName(s.characterId, language)})` : ''}` }).join(', ')
    const successTag = isSuccess ? (zh ? '[成功]' : '[success]') : (zh ? '[失败]' : '[fail]')
    let action = ''
    if (skillType === 'know' || skillType === 'guess') {
      const typeLabel = skillType === 'know' ? (zh ? '已知' : 'know') : (zh ? '猜测' : 'guess')
      let result = knowKind === 'good' ? (zh ? '善良' : 'Good') : knowKind === 'evil' ? (zh ? '邪恶' : 'Evil') : knowKind === 'character' ? (knowCharId ? getDisplayName(knowCharId, language) : '?') : knowOtherText
      action = `${typeLabel}: ${targetLabels} → ${result}`
    } else if (skillType === 'addTag') {
      action = `${zh ? '添加标签' : 'add tag'} [${tagInput.trim()}] → ${targetLabels}`
    } else if (skillType === 'removeTag') {
      action = `${zh ? '移除标签' : 'remove tag'} [${removeTagVal.replace(ST_TAG_PREFIX, '')}] ← ${targetLabels}`
    } else if (skillType === 'changeChar') {
      action = `${zh ? '变更角色' : 'change char'} → ${newCharId ? getDisplayName(newCharId, language) : '?'}: ${targetLabels}`
    }
    const detail = `${actorLabel} ${successTag} ${action}${skillNote.trim() ? ` | ${skillNote.trim()}` : ''}`

    if (isSuccess) {
      if (skillType === 'addTag') {
        const tag = buildStTag(tagInput.trim(), actualCharId || null)
        for (const sn of targetArr) updateSeatWithLog(sn, (s: any) => ({ ...s, stTags: [...new Set([...(s.stTags || []), tag])] }))
      } else if (skillType === 'removeTag') {
        for (const sn of targetArr) updateSeatWithLog(sn, (s: any) => ({ ...s, customTags: (s.customTags || []).filter((t: string) => t !== removeTagVal), stTags: (s.stTags || []).filter((t: string) => t !== removeTagVal) }))
      } else if (skillType === 'changeChar') {
        for (const sn of targetArr) updateSeatWithLog(sn, (s: any) => ({ ...s, characterId: newCharId, userCharacterId: newCharId }))
      }
    }
    updateCurrentDay((d: any) => appendEvent(d, 'skill', detail))
    setSkillType(''); setTargets(new Set()); setTagInput(''); setRemoveTagVal(''); setNewCharId(''); setSkillNote('')
  }

  // ── Log helpers ──
  const logDays = useMemo(() => buildPlayerEntries(days || [currentDay], seat.seat, isNight), [days, currentDay, seat.seat, isNight])
  const handleEdit = (id: string, current: string) => { setEditingId(id); setEditText(current) }
  const handleEditSave = () => { if (editingId) { editLogEntry(editingId, editText); setEditingId(null) } }
  const handleQuickAdd = () => {
    if (!quickAddText.trim()) return
    const detail = `#${seat.seat}: ${quickAddText.trim()}`
    addQuickEvent(detail, quickAddSt ? 'st-only' : 'public')
    setQuickAddText('')
  }

  // ── Section renderers ──

  const SectionLabel = ({ label }: { label: string }) => (
    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </Typography>
  )

  const characterSection = (
    <Box sx={{ mb: 1.5 }}>
      <SectionLabel label={zh ? '角色' : 'Character'} />
      <Box sx={{ display: 'flex', gap: 1, mb: 0.75 }}>
        {/* Actual */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {actualIcon ? <Box component="img" src={actualIcon as string} sx={{ width: 32, height: 32, borderRadius: '50%' }} /> : <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</Box>}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">{zh ? '实际' : 'Actual'}</Typography>
            <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>{actualCharId ? getDisplayName(actualCharId, language) : (zh ? '未分配' : 'None')}</Typography>
            {actualCharId && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>{getAbilityText(actualCharId, language)?.slice(0, 60)}{(getAbilityText(actualCharId, language)?.length ?? 0) > 60 ? '…' : ''}</Typography>}
          </Box>
        </Box>
        {/* Perceived (if different) */}
        {showDifferentPerception && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, p: 1, border: '1px solid', borderColor: 'warning.main', borderRadius: 1 }}>
            {perceivedIcon ? <Box component="img" src={perceivedIcon as string} sx={{ width: 32, height: 32, borderRadius: '50%' }} /> : null}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="warning.main">{zh ? '玩家以为' : 'Perceived'}</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>{perceivedCharId ? getDisplayName(perceivedCharId, language) : '—'}</Typography>
            </Box>
          </Box>
        )}
      </Box>
      <Button size="small" variant="outlined" onClick={() => setShowCharPicker((v) => !v)}>
        {showCharPicker ? '▲' : '▶'} {zh ? '更换角色' : 'Change Character'}
      </Button>
      {showCharPicker && (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{zh ? '实际角色' : 'Actual Character'}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 100, overflow: 'auto', mb: 0.75 }}>
            {(currentScriptCharacters ?? []).map((c: string) => (
              <Chip key={c} label={getDisplayName(c, language)} size="small"
                variant={actualCharId === c ? 'filled' : 'outlined'}
                onClick={() => reassignChar(c)}
                icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 14, height: 14 }} /> : undefined} />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{zh ? '玩家以为' : 'Perceived Character'}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 100, overflow: 'auto' }}>
            {(currentScriptCharacters ?? []).map((c: string) => (
              <Chip key={`per-${c}`} label={getDisplayName(c, language)} size="small"
                variant={perceivedCharId === c ? 'filled' : 'outlined'}
                onClick={() => reassignPerceived(c)}
                icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 14, height: 14 }} /> : undefined} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )

  const publicStatusSection = (
    <Box sx={{ mb: 1.5 }}>
      <SectionLabel label={zh ? '公开状态' : 'Public Status'} />
      {/* Status toggles */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
        {[
          { label: text.aliveTag,    active: !seat.alive,      color: 'error',   toggle: (s: any) => ({ ...s, alive: !s.alive }) },
          { label: text.executedTag, active: seat.isExecuted,  color: 'error',   toggle: (s: any) => ({ ...s, isExecuted: !s.isExecuted }) },
          { label: text.traveler,    active: seat.isTraveler,  color: 'info',    toggle: (s: any) => ({ ...s, isTraveler: !s.isTraveler }) },
          { label: text.noVoteTag,   active: seat.hasNoVote,   color: 'warning', toggle: (s: any) => ({ ...s, hasNoVote: !s.hasNoVote }) },
        ].map(({ label, active, color, toggle }) => (
          <Button key={label} size="small" variant={active ? 'contained' : 'outlined'} color={active ? color as any : 'primary'}
            onClick={() => updateSeatWithLog(seat.seat, toggle)}>
            {label}
          </Button>
        ))}
      </Box>
      {/* Tag quick-add */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
        <TextField size="small" fullWidth placeholder={text.addTag || (zh ? '添加标签' : 'Add tag')}
          value={publicTagInput}
          onChange={(e) => setPublicTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPublicTag() } }} />
        <Button variant="contained" onClick={() => handleAddPublicTag()} sx={{ minWidth: 40, px: 1 }}>+</Button>
      </Box>
      {/* Tag pool chips */}
      {customTagPool?.filter((t: string) => !isCharacterTag(t)).length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
          {customTagPool.filter((t: string) => !isCharacterTag(t)).map((tag: string) => (
            <Chip key={tag} label={tag} size="small" clickable
              color={seat.customTags.includes(tag) ? 'primary' : 'default'}
              variant={seat.customTags.includes(tag) ? 'filled' : 'outlined'}
              onClick={() => toggleCustomTag(tag)} />
          ))}
        </Box>
      )}
      {/* Active custom tags (removable) */}
      {seat.customTags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {seat.customTags.map((tag: string) => {
            const isChar = isCharacterTag(tag)
            const charId = isChar ? [...tag].slice(1).join('') : ''
            const icon = isChar ? getIconForCharacter(charId) : null
            const label = isChar ? getDisplayName(charId, language) : tag
            return (
              <Chip key={tag} label={label} size="small"
                icon={icon ? <Box component="img" src={icon as string} sx={{ width: 14, height: 14 }} /> : undefined}
                onDelete={() => toggleCustomTag(tag)} />
            )
          })}
        </Box>
      )}
    </Box>
  )

  const nightStStatusSection = (
    <Box sx={{ mb: 1.5 }}>
      <SectionLabel label={zh ? '夜间/ST状态' : 'Night / ST Status'} />
      {/* Default tag chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
        {DEFAULT_ST_TAGS.map((label) => {
          const tag = `${ST_TAG_PREFIX}${label}`
          const active = stTags.includes(tag)
          return (
            <Chip key={label} label={label} size="small" clickable
              color={active ? 'warning' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => toggleDefaultStTag(label)} />
          )
        })}
      </Box>
      {/* Existing stTags (removable, with optional source char icon) */}
      {stTags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
          {stTags.map((tag: string) => {
            const { label, sourceCharId } = parseStTag(tag)
            const srcIcon = sourceCharId ? getIconForCharacter(sourceCharId) : null
            return (
              <Chip key={`st-${tag}`} label={label} size="small"
                icon={srcIcon ? <Box component="img" src={srcIcon as string} sx={{ width: 16, height: 16, ml: '4px !important', borderRadius: '50%' }} /> : undefined}
                onDelete={() => removeStTag(tag)}
                sx={{ bgcolor: 'warning.light', color: 'warning.contrastText', '& .MuiChip-deleteIcon': { color: 'warning.dark' } }} />
            )
          })}
        </Box>
      )}
      {/* Quick-add stTag */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <TextField size="small" fullWidth placeholder={zh ? '添加ST标签' : 'Add ST tag'}
          value={stTagInput}
          onChange={(e) => setStTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStTag(stTagInput) } }} />
        <Button variant="contained" color="warning" onClick={() => addStTag(stTagInput)} sx={{ minWidth: 40, px: 1 }}>+</Button>
      </Box>
    </Box>
  )

  const abilitySection = (
    <Box sx={{ mb: 1.5 }}>
      <SectionLabel label={isNight ? (zh ? '夜间技能' : 'Night Ability') : (zh ? '日间技能' : 'Day Ability')} />
      {skillOverlay ? (
        // Active skill form (from openSeatSkill)
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">{zh ? '目标' : 'Target'}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {(currentDay?.seats ?? []).map((s: any) => (
                <Button key={s.seat} size="small"
                  variant={skillOverlay.draft?.targets?.includes(s.seat) ? 'contained' : 'outlined'}
                  onClick={() => setSkillOverlay((p: any) => { if (!p) return p; const targets = p.draft.targets.includes(s.seat) ? p.draft.targets.filter((t: number) => t !== s.seat) : [...p.draft.targets, s.seat]; return { ...p, draft: { ...p.draft, targets } } })}>
                  #{s.seat}
                </Button>
              ))}
            </Box>
          </Box>
          <TextField size="small" fullWidth label={text.statement} value={skillOverlay.draft?.statement ?? ''}
            onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, statement: e.target.value } } : p)} />
          <TextField size="small" fullWidth label={text.note} value={skillOverlay.draft?.note ?? ''}
            onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, note: e.target.value } } : p)} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <Button size="small" color="error" onClick={() => closeSkillOverlay(false)}>✕ {zh ? '取消' : 'Cancel'}</Button>
            <Button size="small" variant="contained" onClick={() => { closeSkillOverlay(true); setPlayerModalSeat(null) }}>✓ {text.saveSkill}</Button>
          </Box>
        </Box>
      ) : (
        // Night/day skill panel
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>{zh ? '技能类型' : 'Skill Type'}</InputLabel>
            <Select value={skillType} label={zh ? '技能类型' : 'Skill Type'}
              onChange={(e) => { setSkillType(e.target.value as any); setTargets(new Set()) }}>
              <MenuItem value="">{zh ? '— 选择 —' : '— Select —'}</MenuItem>
              {(Object.keys(SKILL_LABELS) as SkillType[]).map((k) => (
                <MenuItem key={k} value={k}>{zh ? SKILL_LABELS[k].zh : SKILL_LABELS[k].en}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {skillType && (
            <>
              <Box sx={{ maxHeight: 140, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
                {allSeats.map((s: any) => (
                  <Box key={s.seat} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, cursor: 'pointer' }}
                    onClick={() => toggleTarget(s.seat)}>
                    <Box sx={{ width: 18, height: 18, border: '2px solid', borderColor: targets.has(s.seat) ? 'primary.main' : 'divider', borderRadius: 0.5, bgcolor: targets.has(s.seat) ? 'primary.main' : 'transparent', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      #{s.seat} {s.name}{s.characterId ? ` — ${getDisplayName(s.characterId, language)}` : ''}
                      {!s.alive && <Box component="span" sx={{ color: 'text.disabled', ml: 0.5 }}>†</Box>}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {(skillType === 'know' || skillType === 'guess') && (
                <Box>
                  <FormControl size="small" fullWidth sx={{ mb: 0.5 }}>
                    <InputLabel>{zh ? '结果类型' : 'Result Type'}</InputLabel>
                    <Select value={knowKind} label={zh ? '结果类型' : 'Result Type'} onChange={(e) => setKnowKind(e.target.value as any)}>
                      <MenuItem value="good">{zh ? '善良' : 'Good'}</MenuItem>
                      <MenuItem value="evil">{zh ? '邪恶' : 'Evil'}</MenuItem>
                      <MenuItem value="character">{zh ? '角色' : 'Character'}</MenuItem>
                      <MenuItem value="other">{zh ? '其他' : 'Other'}</MenuItem>
                    </Select>
                  </FormControl>
                  {knowKind === 'character' && (
                    <FormControl size="small" fullWidth>
                      <InputLabel>{zh ? '角色' : 'Character'}</InputLabel>
                      <Select value={knowCharId} label={zh ? '角色' : 'Character'} onChange={(e) => setKnowCharId(e.target.value)}>
                        {(currentScriptCharacters ?? []).map((c: string) => <MenuItem key={c} value={c}>{getDisplayName(c, language)}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}
                  {knowKind === 'other' && <TextField size="small" fullWidth label={zh ? '内容' : 'Detail'} value={knowOtherText} onChange={(e) => setKnowOtherText(e.target.value)} />}
                </Box>
              )}

              {skillType === 'addTag' && (
                <TextField size="small" fullWidth label={zh ? '标签内容' : 'Tag'} value={tagInput} onChange={(e) => setTagInput(e.target.value)} />
              )}
              {skillType === 'removeTag' && (
                <FormControl size="small" fullWidth>
                  <InputLabel>{zh ? '移除标签' : 'Tag to Remove'}</InputLabel>
                  <Select value={removeTagVal} label={zh ? '移除标签' : 'Tag to Remove'} onChange={(e) => setRemoveTagVal(e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {allTagsForTargets.map((t: string) => <MenuItem key={t} value={t}>{t.replace(ST_TAG_PREFIX, '')}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              {skillType === 'changeChar' && (
                <FormControl size="small" fullWidth>
                  <InputLabel>{zh ? '变更为角色' : 'Change to Character'}</InputLabel>
                  <Select value={newCharId} label={zh ? '变更为角色' : 'Change to Character'} onChange={(e) => setNewCharId(e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {(currentScriptCharacters ?? []).map((c: string) => (
                      <MenuItem key={c} value={c}>
                        {getIconForCharacter(c) && <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 16, height: 16, mr: 0.5, verticalAlign: 'middle' }} />}
                        {getDisplayName(c, language)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField size="small" fullWidth label={zh ? '备注（可选）' : 'Note (optional)'} value={skillNote} onChange={(e) => setSkillNote(e.target.value)} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FormControlLabel
                  control={<Switch checked={isSuccess} onChange={(e) => setIsSuccess(e.target.checked)} size="small" />}
                  label={<Typography variant="caption">{isSuccess ? (zh ? '成功' : 'Success') : (zh ? '失败' : 'Fail')}</Typography>} />
                <Button size="small" variant="contained" disabled={!canSaveSkill} onClick={handleSaveSkill}>{zh ? '保存' : 'Save'}</Button>
              </Box>
            </>
          )}

          {!skillType && (
            <Button size="small" variant="outlined" onClick={() => openSeatSkill?.(seat.seat)}>
              {zh ? '发动即兴技能' : 'Use Ability (Quick)'}
            </Button>
          )}
        </Box>
      )}
    </Box>
  )

  const logSection = (
    <Accordion expanded={logExpanded} onChange={(_, v) => setLogExpanded(v)} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: '4px !important', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
        <Typography variant="caption" fontWeight={700}>{zh ? '📋 事件记录' : '📋 Event Log'}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1, px: 1 }}>
        {/* Quick-add */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 1 }}>
          <TextField size="small" placeholder={zh ? '快速添加记录…' : 'Quick add note…'} value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd() } }}
            sx={{ flex: 1 }} />
          <FormControlLabel
            control={<Switch size="small" checked={quickAddSt} onChange={(e) => setQuickAddSt(e.target.checked)} />}
            label={<Typography variant="caption">{quickAddSt ? (zh ? 'ST' : 'ST') : (zh ? '公开' : 'Pub')}</Typography>}
            sx={{ mx: 0 }} />
          <Button size="small" variant="contained" onClick={handleQuickAdd} sx={{ minWidth: 40, px: 1 }}>+</Button>
        </Box>

        {logDays.length === 0 ? (
          <Typography variant="caption" color="text.secondary">{zh ? '暂无记录' : 'No events'}</Typography>
        ) : (
          logDays.map(({ day, entries }) => (
            <Box key={day} sx={{ mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="primary.main">{zh ? `第${day}天` : `Day ${day}`}</Typography>
              <Divider sx={{ mb: 0.5, mt: 0.25 }} />
              {entries.map((e: any) => (
                <Box key={e.id} sx={{ mb: 0.5 }}>
                  {editingId === e.id ? (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <TextField size="small" value={editText} onChange={(ev) => setEditText(ev.target.value)} sx={{ flex: 1 }} autoFocus />
                      <IconButton size="small" onClick={handleEditSave} color="primary">✓</IconButton>
                      <IconButton size="small" onClick={() => setEditingId(null)}>✕</IconButton>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <Chip label={KIND_LABEL_EN[e.kind] ?? e.kind} size="small"
                        color={(KIND_COLOR[e.kind] ?? 'default') as any}
                        sx={{ fontSize: '0.6rem', height: 16, flexShrink: 0, mt: 0.2, '& .MuiChip-label': { px: 0.4 } }} />
                      <Typography variant="body2" sx={{ fontSize: '0.78rem', flex: 1, wordBreak: 'break-word' }}>{e.text}</Typography>
                      <IconButton size="small" sx={{ p: 0.25 }} onClick={() => handleEdit(e.id, e.editable)}>✏️</IconButton>
                      <IconButton size="small" sx={{ p: 0.25 }} onClick={() => removeLogEntry(e.id)}>🗑️</IconButton>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          ))
        )}
      </AccordionDetails>
    </Accordion>
  )

  const modal = (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { maxHeight: '92vh', m: 1 } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.5, pt: 1.5, px: 2 }}>
        <Typography fontWeight={700}>#{seat.seat} {seat.name}</Typography>
        <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1.5, px: 2 }}>
        {isNight ? (
          <>
            <Divider sx={{ mb: 1.5 }} />
            {characterSection}
            <Divider sx={{ mb: 1.5 }} />
            {publicStatusSection}
            <Divider sx={{ mb: 1.5 }} />
            {nightStStatusSection}
            <Divider sx={{ mb: 1.5 }} />
            {abilitySection}
            <Divider sx={{ mb: 1.5 }} />
            {logSection}
          </>
        ) : (
          <>
            <Divider sx={{ mb: 1.5 }} />
            {publicStatusSection}
            <Divider sx={{ mb: 1.5 }} />
            {abilitySection}
            <Divider sx={{ mb: 1.5 }} />
            {logSection}
          </>
        )}
      </DialogContent>
    </Dialog>
  )

  return createPortal(modal, document.body)
}
