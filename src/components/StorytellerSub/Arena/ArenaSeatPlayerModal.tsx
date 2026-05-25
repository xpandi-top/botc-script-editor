// @ts-nocheck
import type { StorytellerSeat } from '../types'
import type { StorytellerContext } from '../useStoryteller'
import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Accordion, AccordionDetails, AccordionSummary,
  Box, Button, Chip, Dialog, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, IconButton, InputLabel,
  MenuItem, Select, Switch, TextField, Tooltip, Typography, useTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ListIcon from '@mui/icons-material/List'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import { getDisplayName, getIconForCharacter, getAbilityTextForScript, allCharacters, characterById } from '../../../catalog'
import { buildPlayerLogEntries, filterPlayerLogByCurrentPhase } from '../../../utils/playerLog'
import { logPhrase } from '../../../utils/logI18n'
import { LogDetailText } from '../LogDetailText'
import { useT } from '../../../context/I18nContext'
import { translateStTag } from './ArenaSeatComponents'

const TRAVELER_CHAR_IDS = allCharacters.filter((c) => c.team === 'traveler').map((c) => c.id)

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

type SkillType = 'know' | 'guess' | 'change' | 'changeStatus' | ''

// ── Log helpers ─────────────────────────────────────────────────

const ENTRY_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'error' | 'warning'> = {
  vote: 'primary', skill: 'secondary', event: 'success',
}

function phaseLabel(phase: string, text: any): string {
  return { night: text.nightPhase, private: text.privateChat, public: text.publicChat, nomination: text.nomination }[phase] ?? phase
}

// ── Component ────────────────────────────────────────────────────
export function ArenaSeatPlayerModal({ ctx, seat }: { ctx: StorytellerContext; seat: any }) {
  const {
    language, text, currentDay, days,
    skillOverlay, setSkillOverlay, closeSkillOverlay, openSeatSkill,
    currentScriptCharacters, seatTagDrafts, setSeatTagDrafts,
    customTagPool, updateSeatWithLog, updateCurrentDay, appendEvent,
    addCustomTag, playerModalSeat, setPlayerModalSeat,
    editLogEntry, removeLogEntry, addQuickEvent,
    nightShowCharacter, activeScriptSlug, scriptOptions,
  } = ctx

  const pinnedRevisions = scriptOptions?.find((s: any) => s.slug === activeScriptSlug)?.pinnedRevisions

  const { t, tpl } = useT()
  const zh = language === 'zh'
  const isOpen = playerModalSeat === seat?.seat
  const [abilityModalCharId, setAbilityModalCharId] = React.useState<string | null>(null)
  const muiTheme = useTheme()
  const isDark = muiTheme.palette.mode === 'dark'
  const stBg     = isDark ? 'rgba(210, 140, 0, 0.13)' : 'rgba(255, 200, 0, 0.22)'
  const stBorder = isDark ? 'rgba(210, 140, 0, 0.40)' : 'rgba(180, 130, 0, 0.45)'
  const stText   = isDark ? '#E8C97A' : 'rgba(80, 50, 0, 0.90)'

  // ── Section state ──
  const [showCharPicker, setShowCharPicker] = useState(false)
  const [stTagInput, setStTagInput] = useState('')
  const [publicTagInput, setPublicTagInput] = useState('')
  const [charReminderPickerOpen, setCharReminderPickerOpen] = useState(false)
  const [selectedReminderChar, setSelectedReminderChar] = useState<string | null>(null)
  const [charPublicPickerOpen, setCharPublicPickerOpen] = useState(false)
  const [selectedPublicChar, setSelectedPublicChar] = useState<string | null>(null)

  // ── Night Ability state ──
  const [skillType, setSkillType] = useState<SkillType>('')
  const [targets, setTargets] = useState<Set<number>>(new Set())
  // know/guess sub-state
  const [knowResult, setKnowResult] = useState('info') // 'characters'|'team'|'type'|'sameTeam'|'diffTeam'|'sameType'|'diffType'|'info'|'truefalse'
  const [knowChars, setKnowChars] = useState<string[]>([])
  const [knowTeam, setKnowTeam] = useState('good')
  const [knowType, setKnowType] = useState('townsfolk')
  const [knowInfo, setKnowInfo] = useState('')
  const [knowTrueFalse, setKnowTrueFalse] = useState(true)
  // change sub-state
  const [changeTo, setChangeTo] = useState('character')
  const [changeToChar, setChangeToChar] = useState('')
  const [changeToTeam, setChangeToTeam] = useState('good')
  // changeStatus sub-state
  const [csSubtype, setCsSubtype] = useState('addST') // addST|removeST|addPublic|removePublic
  const [tagInput, setTagInput] = useState('')
  const [removeTagVal, setRemoveTagVal] = useState('')
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
      setKnowResult('info'); setKnowChars([]); setKnowTeam('good'); setKnowType('townsfolk'); setKnowInfo(''); setKnowTrueFalse(true)
      setChangeTo('character'); setChangeToChar(''); setChangeToTeam('good')
      setCsSubtype('addST'); setTagInput(''); setRemoveTagVal('')
      setIsSuccess(true)
      setSkillNote('')
      setStTagInput('')
      setPublicTagInput('')
      setCharReminderPickerOpen(false)
      setSelectedReminderChar(null)
      setCharPublicPickerOpen(false)
      setSelectedPublicChar(null)
      setLogExpanded(false)
      setEditingId(null)
      setQuickAddText('')
    }
  }, [isOpen])

  // ── Character helpers (safe even when seat is null) ──
  const actualCharId = seat?.characterId ?? null
  const perceivedCharId = seat?.userCharacterId || seat?.characterId || null
  const allSeats: any[] = currentDay?.seats ?? []
  const isNight = (currentDay?.phase ?? 'private') === 'night'

  // ── useMemo hooks — must be before any conditional return ──
  const stTagsForTargets = useMemo(() => {
    const s = new Set<string>()
    for (const n of targets) { const seat = allSeats.find((x: any) => x.seat === n); (seat?.stTags || []).forEach((t: string) => s.add(t)) }
    return Array.from(s)
  }, [targets, allSeats])

  const publicTagsForTargets = useMemo(() => {
    const s = new Set<string>()
    for (const n of targets) { const seat = allSeats.find((x: any) => x.seat === n); (seat?.customTags || []).forEach((t: string) => s.add(t)) }
    return Array.from(s)
  }, [targets, allSeats])

  // ── Script reminder tags — derived from chars in script + in-play ──────────
  // Replaces the hardcoded DEFAULT_ST_TAGS wherever script reminders are available.
  const scriptReminderTags = useMemo(() => {
    const ids = new Set<string>([
      ...(currentScriptCharacters ?? []),
      ...allSeats.map((s: any) => s.characterId).filter(Boolean),
    ])
    const tags = new Set<string>()
    for (const id of ids) {
      const char = characterById[id]
      ;(char?.reminders ?? []).forEach((r: string) => tags.add(r))
      ;(char?.remindersGlobal ?? []).forEach((r: string) => tags.add(r))
    }
    return [...tags].sort()
  }, [currentScriptCharacters, allSeats])

  // Fall back to DEFAULT_ST_TAGS when no script reminders (e.g. no script loaded)
  const stTagChips = scriptReminderTags.length > 0 ? scriptReminderTags : DEFAULT_ST_TAGS

  // All script chars with deduplicated reminders (empty array = no reminders)
  // Sorted: in-play first, then alphabetically within each group
  const scriptAllChars = useMemo(() => {
    const inPlayIds = new Set(allSeats.map((s: any) => s.characterId).filter(Boolean))
    const ids = [...new Set<string>([...(currentScriptCharacters ?? []), ...inPlayIds])]
    return ids
      .map(id => {
        const char = characterById[id]
        const reminders = [...new Set([...(char?.reminders ?? []), ...(char?.remindersGlobal ?? [])])]
        return { id, reminders, isInPlay: inPlayIds.has(id) }
      })
      .sort((a, b) => {
        if (b.isInPlay !== a.isInPlay) return (b.isInPlay ? 1 : 0) - (a.isInPlay ? 1 : 0)
        return 0
      })
  }, [currentScriptCharacters, allSeats])

  const canSaveSkill = useMemo(() => {
    if (!skillType) return false
    if (skillType === 'know' || skillType === 'guess') {
      if (knowResult === 'characters') return knowChars.length > 0
      if (knowResult === 'demonBluffs') return true
      if (knowResult === 'info') return knowInfo.trim().length > 0
      return true
    }
    if (skillType === 'change') {
      if (changeTo === 'character') return changeToChar.length > 0
      return true
    }
    if (skillType === 'changeStatus') {
      if (csSubtype === 'addST' || csSubtype === 'addPublic') return tagInput.trim().length > 0
      return removeTagVal.length > 0
    }
    return false
  }, [skillType, knowResult, knowChars, knowInfo, changeTo, changeToChar, csSubtype, tagInput, removeTagVal])

  const logDays = useMemo(
    () => filterPlayerLogByCurrentPhase(buildPlayerLogEntries(days || [currentDay], seat?.seat, language), isNight),
    [days, currentDay, seat?.seat, isNight, language],
  )

  // ── Conditional return after all hooks ──
  if (!isOpen || !seat) return null

  const handleClose = () => {
    setPlayerModalSeat(null)
    if (skillOverlay) closeSkillOverlay(false)
  }

  // ── Character helpers ──
  const showDifferentPerception = seat.userCharacterId && seat.userCharacterId !== seat.characterId
  const actualIcon = actualCharId ? getIconForCharacter(actualCharId) : null
  const perceivedIcon = perceivedCharId ? getIconForCharacter(perceivedCharId) : null

  const reassignChar = (cid: string) => { updateSeatWithLog(seat.seat, (s: any) => ({ ...s, characterId: cid })); setShowCharPicker(false) }
  const reassignPerceived = (cid: string) => { updateSeatWithLog(seat.seat, (s: any) => ({ ...s, userCharacterId: cid })); setShowCharPicker(false) }

  // ── ST Tag helpers ──
  const stTags: string[] = seat.stTags || []
  const removeStTag = (tag: string) => updateSeatWithLog(seat.seat, (s: any) => ({ ...s, stTags: (s.stTags || []).filter((t: string) => t !== tag) }))
  const addStTag = (label: string, sourceCharId?: string | null) => {
    const clean = label.trim().replace(/^📝+/, '')
    if (!clean) return
    const tag = buildStTag(clean, sourceCharId)
    updateSeatWithLog(seat.seat, (s: any) => ({ ...s, stTags: [...new Set([...(s.stTags || []), tag])] }))
    setStTagInput('')
  }
  const toggleDefaultStTag = (label: string) => {
    const existing = stTags.find((t) => parseStTag(t).label === label)
    if (existing) removeStTag(existing)
    else addStTag(label)
  }

  // ── Custom public tag helpers ──
  const handleAddPublicTag = (label?: string, sourceCharId?: string | null) => {
    const val = (label ?? publicTagInput).trim()
    if (!val) return
    const stored = sourceCharId ? `📝${val}::${sourceCharId}` : val
    updateSeatWithLog(seat.seat, (s: any) => ({ ...s, customTags: [...new Set([...s.customTags, stored])] }))
    setSeatTagDrafts?.((c: any) => ({ ...c, [seat.seat]: '' }))
    setPublicTagInput('')
  }
  const toggleCustomTag = (tag: string) => updateSeatWithLog(seat.seat, (s: any) => ({
    ...s, customTags: s.customTags.includes(tag) ? s.customTags.filter((v: any) => v !== tag) : [...s.customTags, tag],
  }))
  const characterTag = (c: string) => `💀${c}`
  const isCharacterTag = (tag: string) => tag.startsWith('💀')

  // ── Night Ability helpers ──
  const toggleTarget = (seatNum: number) => setTargets((prev) => { const next = new Set(prev); next.has(seatNum) ? next.delete(seatNum) : next.add(seatNum); return next })

  const handleSaveSkill = () => {
    if (!canSaveSkill) return
    const targetArr = Array.from(targets)
    const tLabels = targetArr.map((n) => `#${n}`).join(', ')
    const actorLabel = `#${seat.seat}${actualCharId ? ` (${getDisplayName(actualCharId, language)})` : ''}`

    let action = ''
    if (skillType === 'know' || skillType === 'guess') {
      const verb = logPhrase(language, skillType === 'know' ? 'know' : 'guess')
      const resultStr =
        knowResult === 'characters' ? knowChars.map((c) => getDisplayName(c, language)).join(', ') :
        knowResult === 'demonBluffs' ? (currentDay?.demonBluffs ?? []).map((c: string) => getDisplayName(c, language)).join(', ') :
        knowResult === 'team' ? logPhrase(language, knowTeam === 'good' ? 'good' : 'evil') :
        knowResult === 'type' ? knowType :
        knowResult === 'sameTeam' ? logPhrase(language, 'sameTeam') :
        knowResult === 'diffTeam' ? logPhrase(language, 'diffTeam') :
        knowResult === 'sameType' ? logPhrase(language, 'sameType') :
        knowResult === 'diffType' ? logPhrase(language, 'diffType') :
        knowResult === 'info' ? knowInfo :
        knowResult === 'truefalse' ? logPhrase(language, knowTrueFalse ? 'true' : 'false') : ''
      action = `${verb}: ${tLabels} → ${resultStr}`
    } else if (skillType === 'change') {
      const toStr = changeTo === 'character'
        ? `${logPhrase(language, 'charPrefix')}:${changeToChar ? getDisplayName(changeToChar, language) : '?'}`
        : `${logPhrase(language, 'teamPrefix')}:${logPhrase(language, changeToTeam === 'good' ? 'good' : 'evil')}`
      action = `${logPhrase(language, 'change')}: ${tLabels} → ${toStr}`
    } else if (skillType === 'changeStatus') {
      const tagName = csSubtype === 'removeST' || csSubtype === 'removePublic'
        ? (removeTagVal.startsWith('📝') ? parseStTag(removeTagVal).label : removeTagVal)
        : tagInput.trim()
      const iconPart = actualCharId ? `[icon:${actualCharId}]` : 'ST:'
      const verb = csSubtype === 'addST'       ? `${logPhrase(language, 'addST')}${iconPart}`
                 : csSubtype === 'removeST'    ? `${logPhrase(language, 'removeST')}${iconPart}`
                 : csSubtype === 'addPublic'   ? logPhrase(language, 'addTag')
                 :                               logPhrase(language, 'removeTag')
      action = `${verb}:${tagName} → ${tLabels}`
    }
    const detail = `${actorLabel} ${action}${skillNote.trim() ? ` | ${skillNote.trim()}` : ''}`

    // Apply state changes
    if (isSuccess) {
      if (skillType === 'changeStatus') {
        if (csSubtype === 'addST') {
          const raw = tagInput.trim().replace(/^📝+/, '')
          const tag = buildStTag(raw, actualCharId || null)
          for (const sn of targetArr) updateSeatWithLog(sn, (s: any) => ({ ...s, stTags: [...new Set([...(s.stTags || []), tag])] }))
        } else if (csSubtype === 'removeST') {
          for (const sn of targetArr) updateSeatWithLog(sn, (s: any) => ({ ...s, stTags: (s.stTags || []).filter((t: string) => t !== removeTagVal) }))
        } else if (csSubtype === 'addPublic') {
          const tag = tagInput.trim()
          for (const sn of targetArr) updateSeatWithLog(sn, (s: any) => {
            if (tag === text.aliveTag) return { ...s, alive: false }
            if (tag === text.executedTag) return { ...s, isExecuted: true }
            if (tag === text.traveler) return { ...s, isTraveler: true }
            if (tag === text.noVoteTag) return { ...s, hasNoVote: true }
            return { ...s, customTags: [...new Set([...s.customTags, tag])] }
          })
        } else if (csSubtype === 'removePublic') {
          for (const sn of targetArr) updateSeatWithLog(sn, (s: any) => ({ ...s, customTags: s.customTags.filter((t: string) => t !== removeTagVal) }))
        }
      } else if (skillType === 'change') {
        if (changeTo === 'character' && changeToChar) {
          for (const sn of targetArr) updateSeatWithLog(sn, (s: any) => ({ ...s, characterId: changeToChar, userCharacterId: changeToChar }))
        } else if (changeTo === 'team') {
          for (const sn of targetArr) updateSeatWithLog(sn, (s: any) => ({ ...s, teamTag: changeToTeam === 'evil' ? 'evil' : 'good' }))
        }
      }
    }

    const sr = {
      id: `${Date.now()}`,
      actor: seat.seat,
      targets: targetArr,
      roleId: actualCharId || '',
      targetNotes: {},
      statement: action,
      note: skillNote.trim(),
      result: isSuccess ? 'success' as const : 'failure' as const,
      activatedDuringPhase: currentDay?.phase ?? 'night',
    }
    updateCurrentDay((d: any) => appendEvent({ ...d, skillHistory: [sr, ...d.skillHistory] }, 'skill', detail))
    setSkillType(''); setTargets(new Set()); setTagInput(''); setRemoveTagVal(''); setSkillNote('')
    setKnowChars([]); setKnowInfo(''); setChangeToChar('')
  }

  // ── Log helpers ──
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
      <SectionLabel label={t('characters_section')} />
      <Box sx={{ display: 'flex', gap: 1, mb: 0.75 }}>
        {/* Actual */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {actualIcon ? <Box component="img" src={actualIcon as string} sx={{ width: 32, height: 32, borderRadius: '50%' }} /> : <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</Box>}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">{t('actual_short')}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>{actualCharId ? getDisplayName(actualCharId, language) : t('none_assigned')}</Typography>
              {actualCharId && getAbilityTextForScript(actualCharId, language, pinnedRevisions) && (
                <IconButton size="small" sx={{ p: 0.25, ml: 0.25 }} onClick={(e) => { e.stopPropagation(); setAbilityModalCharId(actualCharId) }}>
                  <InfoOutlinedIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                </IconButton>
              )}
            </Box>
            {actualCharId && (() => { const ab = getAbilityTextForScript(actualCharId, language, pinnedRevisions); return ab ? <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', lineHeight: 1.4 }}>{ab.slice(0, 60)}{ab.length > 60 ? '…' : ''}</Typography> : null })()}
          </Box>
        </Box>
        {/* Perceived (if different) */}
        {showDifferentPerception && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, p: 1, border: '1px solid', borderColor: 'warning.main', borderRadius: 1 }}>
            {perceivedIcon ? <Box component="img" src={perceivedIcon as string} sx={{ width: 32, height: 32, borderRadius: '50%' }} /> : null}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="warning.main">{t('perceived_character')}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>{perceivedCharId ? getDisplayName(perceivedCharId, language) : '—'}</Typography>
                {perceivedCharId && getAbilityTextForScript(perceivedCharId, language, pinnedRevisions) && (
                  <IconButton size="small" sx={{ p: 0.25, ml: 0.25 }} onClick={(e) => { e.stopPropagation(); setAbilityModalCharId(perceivedCharId) }}>
                    <InfoOutlinedIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                  </IconButton>
                )}
              </Box>
              {perceivedCharId && (() => { const ab = getAbilityTextForScript(perceivedCharId, language, pinnedRevisions); return ab ? <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', lineHeight: 1.4 }}>{ab.slice(0, 60)}{ab.length > 60 ? '…' : ''}</Typography> : null })()}
            </Box>
          </Box>
        )}
      </Box>
      <Button size="small" variant="outlined" onClick={() => setShowCharPicker((v) => !v)}>
        {showCharPicker ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />} {t('change_character')}
      </Button>
      {showCharPicker && (
        <Box sx={{ mt: 0.75 }}>
          {(() => {
            const charOptions = seat.isTraveler ? TRAVELER_CHAR_IDS : (currentScriptCharacters ?? [])
            return (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('actual_character')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 100, overflow: 'auto', mb: 0.75 }}>
                  {charOptions.map((c: string) => (
                    <Chip key={c} label={getDisplayName(c, language)} size="small"
                      variant={actualCharId === c ? 'filled' : 'outlined'}
                      onClick={() => reassignChar(c)}
                      icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 14, height: 14 }} /> : undefined} />
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>{t('perceived_character')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 100, overflow: 'auto' }}>
                  {charOptions.map((c: string) => (
                    <Chip key={`per-${c}`} label={getDisplayName(c, language)} size="small"
                      variant={perceivedCharId === c ? 'filled' : 'outlined'}
                      onClick={() => reassignPerceived(c)}
                      icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 14, height: 14 }} /> : undefined} />
                  ))}
                </Box>
              </>
            )
          })()}
        </Box>
      )}
    </Box>
  )

  const publicStatusSection = (
    <Box sx={{ mb: 1.5 }}>
      <SectionLabel label={t('public')} />
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
      {/* Character reminder picker for public tags */}
      {charPublicPickerOpen && scriptAllChars.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.75, mb: 0.75 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: selectedPublicChar ? 0.75 : 0 }}>
            {(() => {
              const withR = scriptAllChars.filter(c => c.reminders.length > 0)
              const withoutR = scriptAllChars.filter(c => c.reminders.length === 0)
              const renderIcon = (c: typeof scriptAllChars[number]) => {
                const icon = getIconForCharacter(c.id)
                const name = getDisplayName(c.id, language)
                const isSelected = selectedPublicChar === c.id
                return (
                  <Tooltip key={c.id} title={name} placement="top" arrow>
                    <Box component="img" src={icon as string}
                      onClick={() => setSelectedPublicChar(isSelected ? null : c.id)}
                      sx={{
                        width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                        outline: isSelected ? '2px solid' : '1px solid',
                        outlineColor: isSelected ? 'primary.main' : 'divider',
                        transition: 'outline 0.12s',
                      }}
                    />
                  </Tooltip>
                )
              }
              return (
                <>
                  {withR.map(renderIcon)}
                  {withoutR.length > 0 && withR.length > 0 && (
                    <Box sx={{ width: '100%', borderTop: '1px dashed', borderColor: 'divider', my: 0.25 }} />
                  )}
                  {withoutR.map(renderIcon)}
                </>
              )
            })()}
          </Box>
          {selectedPublicChar && (() => {
            const charEntry = scriptAllChars.find(c => c.id === selectedPublicChar)
            const charIcon = getIconForCharacter(selectedPublicChar)
            return charEntry ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  {charIcon && <Box component="img" src={charIcon as string} sx={{ width: 16, height: 16, borderRadius: '50%' }} />}
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {getDisplayName(selectedPublicChar, language)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    {t('type_custom_or_pick_reminder')}
                  </Typography>
                </Box>
                {charEntry.reminders.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {charEntry.reminders.map(reminder => {
                      const storedTag = `📝${reminder}::${selectedPublicChar}`
                      const active = seat.customTags.includes(storedTag)
                      return (
                        <Chip key={reminder}
                          label={translateStTag(reminder, language)}
                          size="small" clickable
                          color={active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          onClick={() => active ? toggleCustomTag(storedTag) : handleAddPublicTag(reminder, selectedPublicChar)}
                        />
                      )
                    })}
                  </Box>
                )}
              </Box>
            ) : null
          })()}
        </Box>
      )}
      {/* Tag quick-add — links to selectedPublicChar when set */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 0.5 }}>
        {selectedPublicChar && charPublicPickerOpen && (() => {
          const icon = getIconForCharacter(selectedPublicChar)
          return icon ? <Box component="img" src={icon as string} sx={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, outline: '1.5px solid', outlineColor: 'primary.main' }} /> : null
        })()}
        <TextField size="small" fullWidth
          placeholder={selectedPublicChar && charPublicPickerOpen
            ? tpl('tag_for_char', getDisplayName(selectedPublicChar, language))
            : (text.addTag || t('add_public_tag'))}
          value={publicTagInput}
          onChange={(e) => setPublicTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPublicTag(undefined, selectedPublicChar) } }}
          />
        <Tooltip title={charPublicPickerOpen ? (t('close_char_picker')) : (t('pick_by_character'))} placement="top">
          <IconButton size="small"
            color={charPublicPickerOpen ? 'primary' : 'default'}
            onClick={() => { setCharPublicPickerOpen(v => !v); setSelectedPublicChar(null) }}>
            <AccountCircleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button variant="contained" onClick={() => handleAddPublicTag(undefined, selectedPublicChar)} sx={{ minWidth: 40, px: 1 }}>+</Button>
      </Box>
      {/* Tag pool chips — when char selected, clicks add linked version */}
      {customTagPool?.filter((t: string) => !isCharacterTag(t)).length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
          {customTagPool.filter((t: string) => !isCharacterTag(t)).map((tag: string) => {
            const linkedCharId = charPublicPickerOpen ? selectedPublicChar : null
            const storedLinked = linkedCharId ? `📝${tag}::${linkedCharId}` : tag
            const active = seat.customTags.includes(linkedCharId ? storedLinked : tag)
            return (
              <Chip key={tag} label={tag} size="small" clickable
                color={active ? 'primary' : 'default'}
                variant={active ? 'filled' : 'outlined'}
                onClick={() => {
                  if (linkedCharId) {
                    active ? toggleCustomTag(storedLinked) : handleAddPublicTag(tag, linkedCharId)
                  } else {
                    toggleCustomTag(tag)
                  }
                }} />
            )
          })}
        </Box>
      )}
      {/* Active custom tags (removable) */}
      {seat.customTags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {seat.customTags.map((tag: string) => {
            const isChar = isCharacterTag(tag)
            const isLinked = !isChar && tag.startsWith('📝')
            let icon = null, label = tag
            if (isChar) {
              const charId = [...tag].slice(1).join('')
              icon = getIconForCharacter(charId)
              label = getDisplayName(charId, language)
            } else if (isLinked) {
              const body = tag.slice(2)
              const sep = body.indexOf('::')
              const rawLabel = sep === -1 ? body : body.slice(0, sep)
              label = translateStTag(rawLabel, language)
              const srcId = sep === -1 ? '' : body.slice(sep + 2)
              icon = srcId ? getIconForCharacter(srcId) : null
            }
            return (
              <Chip key={tag} label={label} size="small"
                icon={icon ? <Box component="img" src={icon as string} sx={{ width: 14, height: 14, borderRadius: '50%' }} /> : undefined}
                onDelete={() => toggleCustomTag(tag)} />
            )
          })}
        </Box>
      )}
    </Box>
  )

  const nightStStatusSection = (
    <Box sx={{ mb: 1.5 }}>
      <SectionLabel label={t('night_st_status')} />
      {/* Script reminder chips — when char selected, clicks link to that char */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
        {stTagChips.map((label) => {
          const linkedCharId = charReminderPickerOpen ? selectedReminderChar : null
          const active = linkedCharId
            ? stTags.some(t => { const p = parseStTag(t); return p.label === label && p.sourceCharId === linkedCharId })
            : stTags.some(t => parseStTag(t).label === label)
          const displayLabel = translateStTag(label, language)
          return (
            <Chip key={label} label={displayLabel} size="small" clickable
              color={active ? 'warning' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => {
                if (linkedCharId) {
                  const existing = stTags.find(t => { const p = parseStTag(t); return p.label === label && p.sourceCharId === linkedCharId })
                  if (existing) removeStTag(existing)
                  else addStTag(label, linkedCharId)
                } else {
                  toggleDefaultStTag(label)
                }
              }} />
          )
        })}
      </Box>
      {/* Existing stTags (removable, with optional source char icon) */}
      {stTags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
          {stTags.map((tag: string) => {
            const { label, sourceCharId } = parseStTag(tag)
            const srcIcon = sourceCharId ? getIconForCharacter(sourceCharId) : null
            const displayLabel = translateStTag(label, language)
            return (
              <Chip key={`st-${tag}`} label={displayLabel} size="small"
                icon={srcIcon ? <Box component="img" src={srcIcon as string} sx={{ width: 16, height: 16, ml: '4px !important', borderRadius: '50%' }} /> : undefined}
                onDelete={() => removeStTag(tag)}
                sx={{ bgcolor: 'warning.light', color: 'warning.contrastText', '& .MuiChip-deleteIcon': { color: 'warning.dark' } }} />
            )
          })}
        </Box>
      )}
      {/* Character + Reminder picker */}
      {charReminderPickerOpen && scriptAllChars.length > 0 && (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.75, mb: 0.75 }}>
          {/* Character icon row — in-play first, divider before no-reminder chars */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: selectedReminderChar ? 0.75 : 0 }}>
            {(() => {
              const withR = scriptAllChars.filter(c => c.reminders.length > 0)
              const withoutR = scriptAllChars.filter(c => c.reminders.length === 0)
              const renderIcon = (c: typeof scriptAllChars[number]) => {
                const icon = getIconForCharacter(c.id)
                const name = getDisplayName(c.id, language)
                const isSelected = selectedReminderChar === c.id
                return (
                  <Tooltip key={c.id} title={name} placement="top" arrow>
                    <Box component="img" src={icon as string}
                      onClick={() => setSelectedReminderChar(isSelected ? null : c.id)}
                      sx={{
                        width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                        opacity: c.isInPlay ? 1 : 0.45,
                        outline: isSelected ? '2px solid' : c.isInPlay ? '1.5px solid' : '1px solid',
                        outlineColor: isSelected ? 'warning.main' : c.isInPlay ? 'warning.light' : 'divider',
                        filter: c.isInPlay ? 'none' : 'grayscale(50%)',
                        transition: 'outline 0.12s, opacity 0.12s',
                        '&:hover': { opacity: 1, filter: 'none' },
                      }}
                    />
                  </Tooltip>
                )
              }
              return (
                <>
                  {withR.map(renderIcon)}
                  {withoutR.length > 0 && withR.length > 0 && (
                    <Box sx={{ width: '100%', borderTop: '1px dashed', borderColor: 'divider', my: 0.25 }} />
                  )}
                  {withoutR.map(renderIcon)}
                </>
              )
            })()}
          </Box>
          {/* Selected char name + reminder chips */}
          {selectedReminderChar && (() => {
            const charEntry = scriptAllChars.find(c => c.id === selectedReminderChar)
            const charIcon = getIconForCharacter(selectedReminderChar)
            return charEntry ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  {charIcon && <Box component="img" src={charIcon as string} sx={{ width: 16, height: 16, borderRadius: '50%' }} />}
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {getDisplayName(selectedReminderChar, language)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    {t('type_custom_or_pick_reminder')}
                  </Typography>
                </Box>
                {charEntry.reminders.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {charEntry.reminders.map(reminder => {
                      const active = stTags.some(t => {
                        const p = parseStTag(t)
                        return p.label === reminder && p.sourceCharId === selectedReminderChar
                      })
                      return (
                        <Chip key={reminder}
                          label={translateStTag(reminder, language)}
                          size="small" clickable
                          color={active ? 'warning' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          onClick={() => {
                            if (active) {
                              const existing = stTags.find(t => {
                                const p = parseStTag(t)
                                return p.label === reminder && p.sourceCharId === selectedReminderChar
                              })
                              if (existing) removeStTag(existing)
                            } else {
                              addStTag(reminder, selectedReminderChar)
                            }
                          }}
                        />
                      )
                    })}
                  </Box>
                )}
              </Box>
            ) : null
          })()}
        </Box>
      )}
      {/* Quick-add stTag — links to selectedReminderChar when set */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        {selectedReminderChar && charReminderPickerOpen && (() => {
          const icon = getIconForCharacter(selectedReminderChar)
          return icon ? <Box component="img" src={icon as string} sx={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, outline: '1.5px solid', outlineColor: 'warning.main' }} /> : null
        })()}
        <TextField size="small" fullWidth
          placeholder={selectedReminderChar && charReminderPickerOpen
            ? tpl('tag_for_char', getDisplayName(selectedReminderChar, language))
            : t('add_st_tag')}
          value={stTagInput}
          onChange={(e) => setStTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStTag(stTagInput, selectedReminderChar) } }} />
        <Tooltip title={charReminderPickerOpen ? (t('close_char_picker')) : (t('pick_by_character'))} placement="top">
          <IconButton size="small"
            color={charReminderPickerOpen ? 'warning' : 'default'}
            onClick={() => { setCharReminderPickerOpen(v => !v); setSelectedReminderChar(null) }}>
            <AccountCircleIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button variant="contained" color="warning" onClick={() => addStTag(stTagInput, selectedReminderChar)} sx={{ minWidth: 40, px: 1 }}>+</Button>
      </Box>
    </Box>
  )

  // Helper: player tag summary string for target list
  const seatTagSummary = (s: any) => {
    const tags = [
      ...s.customTags,
      ...(s.stTags || []).map((t: string) => parseStTag(t).label),
    ]
    return tags.length ? `(${tags.join(', ')})` : ''
  }

  // ── Player multi-select list (shared across skill types) ──
  // ── Shared char grid renderer (highlights bluffs + not-in-play, groups by team) ──
  const renderCharGrid = (
    isSelected: (id: string) => boolean,
    onToggle: (id: string) => void,
    selectedColor: 'primary' | 'secondary',
  ) => {
    const inPlayIds = new Set((currentDay?.seats ?? []).map((s: any) => s.characterId).filter(Boolean))
    const bluffIds = new Set(currentDay?.demonBluffs ?? [])
    const TEAM_ORDER_LIST = ['townsfolk', 'outsider', 'minion', 'demon'] as const
    const TEAM_COLOR_MAP: Record<string, string> = {
      townsfolk: '#1565c0',
      outsider:  '#0277bd',
      minion:    '#b71c1c',
      demon:     '#7b1fa2',
    }
    const grouped: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] }
    for (const id of (currentScriptCharacters ?? [])) {
      const teamId = characterById[id]?.team
      if (teamId && grouped[teamId]) grouped[teamId].push(id)
    }
    const sections = TEAM_ORDER_LIST.filter((teamId) => grouped[teamId].length > 0)
    return (
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5, maxHeight: 160, overflow: 'auto' }}>
        {sections.map((team, si) => {
          const teamColor = TEAM_COLOR_MAP[team]
          return (
            <Box key={team}>
              {si > 0 && <Divider sx={{ my: 0.5 }} />}
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, px: 0.5, py: 0.25, color: teamColor, fontSize: '0.65rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t(team as any)}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {grouped[team].map((c) => {
                  const isBluff = bluffIds.has(c)
                  const isNotInPlay = !inPlayIds.has(c)
                  const sel = isSelected(c)
                  return (
                    <Chip key={c} size="small" clickable
                      label={getDisplayName(c, language)}
                      icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 14, height: 14 }} /> : undefined}
                      color={sel ? selectedColor : isBluff ? 'warning' : 'default'}
                      variant={sel ? 'filled' : 'outlined'}
                      sx={isNotInPlay && !sel ? { opacity: 0.45, fontStyle: 'italic' } : isBluff && !sel ? { borderColor: 'warning.main', color: 'warning.main' } : undefined}
                      onClick={() => onToggle(c)} />
                  )
                })}
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  }

  const TEAM_TYPE_COLORS: Record<string, string> = {
    townsfolk: '#1565c0', outsider: '#0277bd', minion: '#b71c1c', demon: '#7b1fa2',
  }
  const ALIGN_COLORS: Record<string, string> = { good: '#1565c0', evil: '#b71c1c' }
  const TYPE_LABEL: Record<string, string> = { townsfolk: 'T', outsider: 'O', minion: 'M', demon: 'D' }

  const PlayerList = ({ showTags = true }: { showTags?: boolean }) => (
    <Box sx={{ maxHeight: 160, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
      {allSeats.map((s: any) => {
        const charName = s.characterId ? getDisplayName(s.characterId, language) : ''
        const tagSummary = seatTagSummary(s)
        const char = s.characterId ? characterById[s.characterId] : null
        const charTeam = char?.team ?? null
        // teamTag overrides alignment (set by Change→Team skill)
        const alignIsEvil = s.teamTag === 'evil' ? true : s.teamTag === 'good' ? false : (charTeam === 'minion' || charTeam === 'demon')
        const alignLabel = (s.teamTag || charTeam) ? (alignIsEvil ? 'E' : 'G') : null
        const typeLabel = charTeam ? (TYPE_LABEL[charTeam] ?? null) : null
        const teamColor = charTeam ? TEAM_TYPE_COLORS[charTeam] : undefined
        const alignColor = alignIsEvil ? ALIGN_COLORS.evil : ALIGN_COLORS.good
        return (
          <Box key={s.seat} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, py: 0.25, cursor: 'pointer' }}
            onClick={() => toggleTarget(s.seat)}>
            <Box sx={{ width: 18, height: 18, mt: 0.2, border: '2px solid', borderColor: targets.has(s.seat) ? 'primary.main' : 'divider', borderRadius: 0.5, bgcolor: targets.has(s.seat) ? 'primary.main' : 'transparent', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.3, flex: 1 }}>
                  #{s.seat} {s.name}{charName ? ` — ${charName}` : ''}
                  {!s.alive && <Box component="span" sx={{ color: 'text.disabled', ml: 0.5 }}>†</Box>}
                </Typography>
                {alignLabel && (
                  <Box component="span" sx={{ fontSize: '0.62rem', fontWeight: 700, px: 0.4, py: 0.1, borderRadius: 0.5, border: '1px solid', borderColor: alignColor, color: alignColor, lineHeight: 1, flexShrink: 0 }}>
                    {alignLabel}
                  </Box>
                )}
                {typeLabel && (
                  <Box component="span" sx={{ fontSize: '0.62rem', fontWeight: 700, px: 0.4, py: 0.1, borderRadius: 0.5, border: '1px solid', borderColor: teamColor, color: teamColor, lineHeight: 1, flexShrink: 0 }}>
                    {typeLabel}
                  </Box>
                )}
              </Box>
              {showTags && tagSummary && <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>{tagSummary}</Typography>}
            </Box>
          </Box>
        )
      })}
    </Box>
  )

  const abilitySection = (
    <Box sx={{ mb: 1.5 }}>
      <SectionLabel label={isNight ? (t('night_ability')) : t('day_ability')} />
      {skillOverlay ? (
        // Active skillOverlay form (from openSeatSkill)
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
            {(currentDay?.seats ?? []).map((s: any) => {
              const isChecked = skillOverlay.draft?.targets?.includes(s.seat)
              const publicTags = [...(s.customTags ?? []), ...(!s.alive ? [text.aliveTag] : []), ...(s.hasNoVote ? [text.noVoteTag] : [])]
              const toggleTarget = () => setSkillOverlay((p: any) => {
                if (!p) return p
                const ts = p.draft.targets.includes(s.seat)
                  ? p.draft.targets.filter((t: number) => t !== s.seat)
                  : [...p.draft.targets, s.seat]
                const tn = { ...p.draft.targetNotes }
                if (!ts.includes(s.seat)) delete tn[s.seat]
                return { ...p, draft: { ...p.draft, targets: ts, targetNotes: tn } }
              })
              return (
                <Box key={s.seat}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, cursor: 'pointer' }} onClick={toggleTarget}>
                    <Box sx={{ width: 18, height: 18, border: '2px solid', borderColor: isChecked ? 'primary.main' : 'divider', borderRadius: 0.5, bgcolor: isChecked ? 'primary.main' : 'transparent', flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', flex: 1 }}>
                      #{s.seat} {s.name}
                      {!s.alive && <Box component="span" sx={{ color: 'text.disabled', ml: 0.5 }}>†</Box>}
                    </Typography>
                    {publicTags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
                        {publicTags.map((t: string) => (
                          <Box key={t} component="span" sx={{ fontSize: '0.65rem', px: 0.5, py: 0.1, bgcolor: 'action.selected', borderRadius: 0.5, color: 'text.secondary' }}>{t}</Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                  {isChecked && (
                    <Box sx={{ pl: 3, pb: 0.5 }}>
                      <TextField
                        size="small" fullWidth
                        placeholder={t('player_note')}
                        value={skillOverlay.draft?.targetNotes?.[s.seat] ?? ''}
                        onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, targetNotes: { ...p.draft.targetNotes, [s.seat]: e.target.value } } } : p)}
                        sx={{ '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                      />
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
          <TextField size="small" fullWidth label={text.statement} value={skillOverlay.draft?.statement ?? ''}
            onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, statement: e.target.value } } : p)} />
          <TextField size="small" fullWidth label={text.note} value={skillOverlay.draft?.note ?? ''}
            onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, note: e.target.value } } : p)} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {(['public', 'st-only'] as const).map((v) => (
                <Button key={v} size="small"
                  variant={(skillOverlay.visibility ?? 'public') === v ? 'contained' : 'outlined'}
                  color={v === 'st-only' ? 'warning' : 'primary'}
                  onClick={() => setSkillOverlay((p: any) => p ? { ...p, visibility: v } : p)}
                  sx={{ fontSize: '0.72rem', py: 0.25 }}>
                  {v === 'public' ? t('public') : t('st_only')}
                </Button>
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" color="error" onClick={() => closeSkillOverlay(false)} startIcon={<CloseIcon fontSize="small" />}>{t('cancel')}</Button>
              <Button size="small" variant="contained" onClick={() => closeSkillOverlay(true)} startIcon={<CheckIcon fontSize="small" />}>{text.saveSkill}</Button>
            </Box>
          </Box>
        </Box>
      ) : !isNight ? (
        <Button variant="outlined" fullWidth onClick={() => openSeatSkill?.(seat.seat)}>
          {t('use_day_ability')}
        </Button>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Skill type toggle row */}
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {(['know', 'guess', 'change', 'changeStatus'] as const).map((skillKey) => {
              const labels: Record<string, string> = { know: t('know'), guess: t('guess'), change: t('change'), changeStatus: t('change_status') }
              return (
                <Button key={skillKey} size="small" variant={skillType === skillKey ? 'contained' : 'outlined'}
                  onClick={() => { setSkillType(skillType === skillKey ? '' : skillKey); setTargets(new Set()); setRemoveTagVal('') }}>
                  {labels[skillKey]}
                </Button>
              )
            })}
          </Box>

          {/* ── Know / Guess ── */}
          {(skillType === 'know' || skillType === 'guess') && (
            <>
              <Typography variant="caption" color="text.secondary">{t('edit_players')}</Typography>
              <PlayerList />
              <Typography variant="caption" color="text.secondary">{t('result')}</Typography>
              {/* Result type button group */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {[
                  { key: 'characters', label: t('characters_section') },
                  { key: 'demonBluffs', label: t('demon_bluffs') },
                  { key: 'team', label: t('team_label') },
                  { key: 'type', label: t('type') },
                  { key: 'sameTeam', label: t('same_team') },
                  { key: 'diffTeam', label: t('diff_team') },
                  { key: 'sameType', label: t('same_type') },
                  { key: 'diffType', label: t('diff_type') },
                  { key: 'info', label: t('info') },
                  { key: 'truefalse', label: t('true_false') },
                ].map(({ key, label }) => (
                  <Chip key={key} label={label} size="small" clickable
                    color={knowResult === key ? 'primary' : 'default'}
                    variant={knowResult === key ? 'filled' : 'outlined'}
                    onClick={() => setKnowResult(key)} />
                ))}
              </Box>
              {/* Result value input */}
              {knowResult === 'characters' && renderCharGrid(
                (c) => knowChars.includes(c),
                (c) => setKnowChars((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]),
                'secondary',
              )}
              {knowResult === 'demonBluffs' && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, border: '1px solid', borderColor: 'warning.main', borderRadius: 1, p: 0.75, bgcolor: isDark ? 'rgba(237,108,2,0.08)' : 'rgba(255,167,38,0.10)' }}>
                  {(currentDay?.demonBluffs ?? []).length === 0 ? (
                    <Typography variant="caption" color="text.secondary">{t('demon_bluffs_unset')}</Typography>
                  ) : (currentDay?.demonBluffs ?? []).map((c: string) => (
                    <Chip key={c} size="small"
                      label={getDisplayName(c, language)}
                      icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 14, height: 14 }} /> : undefined}
                      color="warning"
                      variant="filled" />
                  ))}
                </Box>
              )}
              {knowResult === 'team' && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {(['good', 'evil'] as const).map((teamKey) => (
                    <Button key={teamKey} size="small" variant={knowTeam === teamKey ? 'contained' : 'outlined'} onClick={() => setKnowTeam(teamKey)}>
                      {teamKey === 'good' ? (t('good')) : (t('evil'))}
                    </Button>
                  ))}
                </Box>
              )}
              {knowResult === 'type' && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {(['townsfolk', 'outsider', 'minion', 'demon'] as const).map((typeKey) => (
                    <Button key={typeKey} size="small" variant={knowType === typeKey ? 'contained' : 'outlined'} onClick={() => setKnowType(typeKey)}>
                      {t(typeKey)}
                    </Button>
                  ))}
                </Box>
              )}
              {knowResult === 'info' && (
                <TextField size="small" fullWidth placeholder={t('info_text')} value={knowInfo} onChange={(e) => setKnowInfo(e.target.value)} />
              )}
              {knowResult === 'truefalse' && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" variant={knowTrueFalse ? 'contained' : 'outlined'} color="success" onClick={() => setKnowTrueFalse(true)}>{t('true_label')}</Button>
                  <Button size="small" variant={!knowTrueFalse ? 'contained' : 'outlined'} color="error" onClick={() => setKnowTrueFalse(false)}>{t('false_label')}</Button>
                </Box>
              )}
            </>
          )}

          {/* ── Change ── */}
          {skillType === 'change' && (
            <>
              <Typography variant="caption" color="text.secondary">{t('edit_players')}</Typography>
              <PlayerList />
              <Typography variant="caption" color="text.secondary">{t('change_to')}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button size="small" variant={changeTo === 'character' ? 'contained' : 'outlined'} onClick={() => setChangeTo('character')}>
                  {t('characters_section')}
                </Button>
                <Button size="small" variant={changeTo === 'team' ? 'contained' : 'outlined'} onClick={() => setChangeTo('team')}>
                  {t('team_label')}
                </Button>
              </Box>
              {changeTo === 'character' && renderCharGrid(
                (c) => changeToChar === c,
                (c) => setChangeToChar(changeToChar === c ? '' : c),
                'primary',
              )}
              {changeTo === 'team' && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {(['good', 'evil'] as const).map((teamKey) => (
                    <Button key={teamKey} size="small" variant={changeToTeam === teamKey ? 'contained' : 'outlined'} onClick={() => setChangeToTeam(teamKey)}>
                      {teamKey === 'good' ? (t('good')) : (t('evil'))}
                    </Button>
                  ))}
                </Box>
              )}
            </>
          )}

          {/* ── Change Status ── */}
          {skillType === 'changeStatus' && (
            <>
              {/* Subtype selector */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {[
                  { key: 'addST', label: '+' + t('st_tag') },
                  { key: 'removeST', label: '-' + t('st_tag') },
                  { key: 'addPublic', label: '+' + t('public_tag') },
                  { key: 'removePublic', label: '-' + t('public_tag') },
                ].map(({ key, label }) => (
                  <Button key={key} size="small"
                    variant={csSubtype === key ? 'contained' : 'outlined'}
                    color={key.startsWith('add') ? 'success' : 'error'}
                    onClick={() => { setCsSubtype(key); setRemoveTagVal(''); setTagInput('') }}>
                    {label}
                  </Button>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">{t('edit_players')}</Typography>
              <PlayerList showTags />
              {/* Tag input / selector */}
              {(csSubtype === 'addST') && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                    <TextField size="small" fullWidth placeholder={t('st_tag')} value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {stTagChips.map((tag) => (
                      <Chip key={tag} label={translateStTag(tag, language)} size="small" clickable
                        color={tagInput === tag ? 'warning' : 'default'}
                        variant={tagInput === tag ? 'filled' : 'outlined'}
                        onClick={() => setTagInput(tagInput === tag ? '' : tag)} />
                    ))}
                  </Box>
                </Box>
              )}
              {csSubtype === 'addPublic' && (
                <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column' }}>
                  <TextField size="small" fullWidth placeholder={t('public_tag')} value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {[text.aliveTag, text.executedTag, text.traveler, text.noVoteTag].filter(Boolean).map((tag: string) => (
                      <Chip key={tag} label={tag} size="small" clickable
                        color={tagInput === tag ? 'primary' : 'default'}
                        variant={tagInput === tag ? 'filled' : 'outlined'}
                        onClick={() => setTagInput(tagInput === tag ? '' : tag)} />
                    ))}
                    {customTagPool?.filter((tag: string) => !tag.startsWith('💀')).map((tag: string) => (
                      <Chip key={tag} label={tag} size="small" clickable
                        color={tagInput === tag ? 'primary' : 'default'}
                        variant={tagInput === tag ? 'filled' : 'outlined'}
                        onClick={() => setTagInput(tagInput === tag ? '' : tag)} />
                    ))}
                  </Box>
                </Box>
              )}
              {csSubtype === 'removeST' && (
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('remove_st_tag')}</InputLabel>
                  <Select value={removeTagVal} label={t('remove_st_tag')} onChange={(e) => setRemoveTagVal(e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {stTagsForTargets.map((t: string) => <MenuItem key={t} value={t}>{parseStTag(t).label}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
              {csSubtype === 'removePublic' && (
                <FormControl size="small" fullWidth>
                  <InputLabel>{t('remove_public_tag')}</InputLabel>
                  <Select value={removeTagVal} label={t('remove_public_tag')} onChange={(e) => setRemoveTagVal(e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {publicTagsForTargets.map((t: string) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              )}
            </>
          )}

          {/* Footer: note + success toggle + save */}
          {skillType && (
            <>
              <TextField size="small" fullWidth label={t('note_optional')} value={skillNote} onChange={(e) => setSkillNote(e.target.value)} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FormControlLabel
                  control={<Switch checked={isSuccess} onChange={(e) => setIsSuccess(e.target.checked)} size="small" />}
                  label={<Typography variant="caption">{isSuccess ? (t('success')) : t('false_label')}</Typography>} />
                <Button size="small" variant="contained" disabled={!canSaveSkill} onClick={handleSaveSkill}>{t('save')}</Button>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  )

  const logSection = (
    <Accordion expanded={logExpanded} onChange={(_, v) => setLogExpanded(v)} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: '4px !important', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
        <Typography variant="caption" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ListIcon fontSize="small" />{t('event_log')}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1, px: 1 }}>
        {/* Quick-add */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 1 }}>
          <TextField size="small" placeholder={t('quick_add_note')} value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd() } }}
            sx={{ flex: 1 }} />
          <FormControlLabel
            control={<Switch size="small" checked={quickAddSt} onChange={(e) => setQuickAddSt(e.target.checked)} />}
            label={<Typography variant="caption">{quickAddSt ? 'ST' : t('public_short')}</Typography>}
            sx={{ mx: 0 }} />
          <Button size="small" variant="contained" onClick={handleQuickAdd} sx={{ minWidth: 40, px: 1 }}>+</Button>
        </Box>

        {logDays.length === 0 ? (
          <Typography variant="caption" color="text.secondary">{t('no_events')}</Typography>
        ) : (
          logDays.map(({ day, entries }) => (
            <Box key={day} sx={{ mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="primary.main">{tpl('day_n', day)}</Typography>
              <Divider sx={{ mb: 0.5, mt: 0.25 }} />
              {entries.map((e: any) => (
                <Box key={e.id} sx={{ mb: 0.5 }}>
                  {editingId === e.id ? (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <TextField size="small" value={editText} onChange={(ev) => setEditText(ev.target.value)} sx={{ flex: 1 }} autoFocus />
                      <IconButton size="small" onClick={handleEditSave} color="primary"><CheckIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => setEditingId(null)}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                  ) : (
                    <Box sx={{
                      p: 0.75, borderRadius: 1,
                      bgcolor: e.visibility === 'st-only' ? stBg : 'background.paper',
                      border: '1px solid',
                      borderColor: e.visibility === 'st-only' ? stBorder : 'divider',
                    }}>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', mb: 0.25 }}>
                        <Chip size="small" sx={{ height: 18, fontSize: '0.62rem' }}
                          label={e.type === 'vote' ? text.filterVote : e.type === 'skill' ? text.filterSkill : text.filterEvent}
                          color={(ENTRY_COLORS[e.type] ?? 'default') as any} />
                        {e.visibility === 'st-only' && (
                          <Chip label="ST" size="small" color="warning" sx={{ height: 18, fontSize: '0.62rem' }} />
                        )}
                        {e.phase && <Chip label={phaseLabel(e.phase, text)} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.62rem' }} />}
                        <Box sx={{ flex: 1 }} />
                        <IconButton size="small" sx={{ p: 0.25 }} onClick={() => handleEdit(e.id, e.editable)}>
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" sx={{ p: 0.25 }} color="error" onClick={() => removeLogEntry(e.id)}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                      <LogDetailText detail={e.text} variant="body2" sx={{ fontSize: '0.82rem', color: e.visibility === 'st-only' ? stText : 'text.primary' }} />
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
            {(nightShowCharacter || seat.isTraveler) && (
              <>
                {characterSection}
                <Divider sx={{ mb: 1.5 }} />
              </>
            )}
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

  const abilityDetailModal = abilityModalCharId ? (() => {
    const charId = abilityModalCharId
    const icon = getIconForCharacter(charId)
    const name = getDisplayName(charId, language)
    const ability = getAbilityTextForScript(charId, language, pinnedRevisions) || getAbilityTextForScript(charId, 'en', pinnedRevisions) || ''
    return (
      <Dialog open onClose={() => setAbilityModalCharId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
          {icon && <Box component="img" src={icon as string} sx={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />}
          <Typography fontWeight={700} sx={{ flex: 1 }}>{name}</Typography>
          <IconButton size="small" onClick={() => setAbilityModalCharId(null)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0.5 }}>
          <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.primary' }}>{ability}</Typography>
        </DialogContent>
      </Dialog>
    )
  })() : null

  return createPortal(<>{modal}{abilityDetailModal}</>, document.body)
}
