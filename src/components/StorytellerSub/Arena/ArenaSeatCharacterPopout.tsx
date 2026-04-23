// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Box, Button, Typography, IconButton, Chip, Dialog, Divider,
  Select, MenuItem, FormControl, InputLabel, TextField,
  FormControlLabel, Switch, Checkbox, FormGroup,
} from '@mui/material'
import { getDisplayName, getIconForCharacter, getAbilityText } from '../../../catalog'

const ST_TAG_PREFIX = '📝'

type SkillType = 'know' | 'guess' | 'addTag' | 'removeTag' | 'changeChar'

const SKILL_LABELS: Record<SkillType, { en: string; zh: string }> = {
  know:       { en: 'Know',            zh: '已知信息' },
  guess:      { en: 'Guess',           zh: '猜测' },
  addTag:     { en: 'Add ST Tag',      zh: '添加ST标签' },
  removeTag:  { en: 'Remove Tag',      zh: '移除标签' },
  changeChar: { en: 'Change Character', zh: '变更角色' },
}

export function ArenaSeatCharacterPopout({ ctx, seat }: { ctx: any, seat: any }) {
  const {
    language, characterPopoutSeat, setCharacterPopoutSeat, text,
    updateSeatWithLog, currentDay, currentScriptCharacters, customTagPool = [],
  } = ctx

  const isCharacterPopoutOpen = characterPopoutSeat === seat?.seat
  const allSeats: any[] = currentDay?.seats ?? []

  const actualCharId    = seat?.characterId
  const perceivedCharId = seat?.userCharacterId || seat?.characterId
  const showDifferentPerception = seat?.userCharacterId && seat?.userCharacterId !== seat?.characterId

  // ── Character view state ──
  const [viewingPerceived,   setViewingPerceived]   = useState(false)
  const [showCharacterPicker, setShowCharacterPicker] = useState(!actualCharId)

  // ── Skill panel state ──
  const [skillType,     setSkillType]     = useState<SkillType | ''>('')
  const [targets,       setTargets]       = useState<Set<number>>(new Set())
  const [knowKind,      setKnowKind]      = useState<'good' | 'evil' | 'character' | 'other'>('good')
  const [knowCharId,    setKnowCharId]    = useState('')
  const [knowOtherText, setKnowOtherText] = useState('')
  const [tagInput,      setTagInput]      = useState('')
  const [removeTagVal,  setRemoveTagVal]  = useState('')
  const [newCharId,     setNewCharId]     = useState('')
  const [isSuccess,     setIsSuccess]     = useState(true)

  const stTags = seat?.stTags || []

  useEffect(() => {
    if (isCharacterPopoutOpen) {
      setViewingPerceived(false)
      setShowCharacterPicker(!actualCharId)
      setSkillType('')
      setTargets(new Set())
      setIsSuccess(true)
    }
  }, [isCharacterPopoutOpen, actualCharId])

  // ── Character actions ──
  const reassignCharacter = (charId: string) => {
    updateSeatWithLog(seat.seat, (s: any) => ({ ...s, characterId: charId }))
    setShowCharacterPicker(false)
  }

  const setPerceivedCharacter = (charId: string) => {
    updateSeatWithLog(seat.seat, (s: any) => ({ ...s, userCharacterId: charId }))
    setShowCharacterPicker(false)
  }

  const removeStTag = (tag: string) => {
    updateSeatWithLog(seat.seat, (s: any) => ({
      ...s, stTags: (s.stTags || []).filter((t: string) => t !== tag),
    }))
  }

  // ── Skill save ──
  const canSave = useMemo(() => {
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
    if (!canSave) return
    if (!isSuccess) {
      // No state change on failure — just close skill panel
      setSkillType('')
      setTargets(new Set())
      return
    }

    const targetArr = Array.from(targets)

    if (skillType === 'addTag') {
      const tag = `${ST_TAG_PREFIX}${tagInput.trim()}`
      for (const seatNum of targetArr) {
        updateSeatWithLog(seatNum, (s: any) => ({
          ...s, stTags: [...new Set([...(s.stTags || []), tag])],
        }))
      }
    } else if (skillType === 'removeTag') {
      for (const seatNum of targetArr) {
        updateSeatWithLog(seatNum, (s: any) => ({
          ...s,
          customTags: (s.customTags || []).filter((t: string) => t !== removeTagVal),
          stTags: (s.stTags || []).filter((t: string) => t !== removeTagVal),
        }))
      }
    } else if (skillType === 'changeChar') {
      for (const seatNum of targetArr) {
        updateSeatWithLog(seatNum, (s: any) => ({
          ...s, characterId: newCharId, userCharacterId: newCharId,
        }))
      }
    }
    // know/guess → log only (updateSeatWithLog with no change still writes event via appendEvent in the hook? no — just close)

    setSkillType('')
    setTargets(new Set())
    setTagInput('')
    setRemoveTagVal('')
    setNewCharId('')
  }

  // ── Helpers ──
  const toggleTarget = (seatNum: number) => {
    setTargets((prev) => {
      const next = new Set(prev)
      next.has(seatNum) ? next.delete(seatNum) : next.add(seatNum)
      return next
    })
  }

  const allTagsForTargets = useMemo(() => {
    const tagSet = new Set<string>()
    for (const seatNum of targets) {
      const s = allSeats.find((x: any) => x.seat === seatNum)
      if (s) {
        ;(s.customTags || []).forEach((t: string) => tagSet.add(t))
        ;(s.stTags || []).forEach((t: string) => tagSet.add(t))
      }
    }
    return Array.from(tagSet)
  }, [targets, allSeats])

  const displayedCharId  = viewingPerceived ? perceivedCharId : actualCharId
  const displayedIcon    = displayedCharId ? getIconForCharacter(displayedCharId) : null
  const displayedName    = displayedCharId ? getDisplayName(displayedCharId, language) : ''
  const displayedAbility = displayedCharId ? getAbilityText(displayedCharId, language) : ''

  if (!isCharacterPopoutOpen || !seat) return null

  const zh = language === 'zh'

  const content = (
    <Dialog
      open={isCharacterPopoutOpen}
      onClose={() => {}}
      maxWidth="sm"
      fullWidth
      slotProps={{ backdrop: { onClick: () => {} }, paper: { 'data-character-popup': true, sx: { p: 2, borderRadius: 2, maxHeight: '92vh' } } }}
    >
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          #{seat.seat} {seat.name}
        </Typography>
        <IconButton size="small" onClick={() => setCharacterPopoutSeat(null)}>✕</IconButton>
      </Box>

      {/* ── Actual / Perceived toggle ── */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <Button size="small" variant={!viewingPerceived ? 'contained' : 'outlined'} onClick={() => setViewingPerceived(false)}>
          {zh ? '实际角色' : 'Actual'}
        </Button>
        {showDifferentPerception && (
          <Button size="small" variant={viewingPerceived ? 'contained' : 'outlined'} onClick={() => setViewingPerceived(true)}>
            {zh ? '玩家以为' : 'Perceived'}
          </Button>
        )}
      </Box>

      {/* ── Character display ── */}
      {displayedCharId ? (
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {displayedIcon && <Box component="img" src={displayedIcon as string} sx={{ width: 36, height: 36 }} />}
            <Typography variant="body1" fontWeight={600}>{displayedName}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontSize: '0.8rem' }}>{displayedAbility}</Typography>
          <Button size="small" variant="outlined" onClick={() => setShowCharacterPicker(true)}>
            {zh ? '更换角色' : 'Change'}
          </Button>
        </Box>
      ) : (
        <Button size="small" variant="contained" onClick={() => setShowCharacterPicker(true)} sx={{ mb: 1 }}>
          {zh ? '+ 分配角色' : '+ Assign Character'}
        </Button>
      )}

      {/* ── Character picker ── */}
      {showCharacterPicker && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">{zh ? '实际角色' : 'Actual'}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, maxHeight: 120, overflow: 'auto' }}>
            {(currentScriptCharacters ?? []).map((c: string) => (
              <Chip
                key={c}
                label={getDisplayName(c, language)}
                size="small"
                variant={actualCharId === c ? 'filled' : 'outlined'}
                onClick={() => reassignCharacter(c)}
                icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 14, height: 14 }} /> : undefined}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>{zh ? '玩家以为' : 'Perceived'}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, maxHeight: 120, overflow: 'auto' }}>
            {(currentScriptCharacters ?? []).map((c: string) => (
              <Chip
                key={`per-${c}`}
                label={getDisplayName(c, language)}
                size="small"
                variant={perceivedCharId === c ? 'filled' : 'outlined'}
                onClick={() => setPerceivedCharacter(c)}
                icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 14, height: 14 }} /> : undefined}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Existing ST tags ── */}
      {stTags.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">{zh ? 'ST标签' : 'ST Tags'}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
            {stTags.map((tag: string) => (
              <Chip
                key={`st-${tag}`}
                label={tag.replace(ST_TAG_PREFIX, '')}
                size="small"
                onDelete={() => removeStTag(tag)}
                sx={{ bgcolor: 'warning.light' }}
              />
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 1 }} />

      {/* ── Skill panel ── */}
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {zh ? '夜间技能操作' : 'Night Skill Action'}
      </Typography>

      {/* Skill type */}
      <FormControl size="small" fullWidth sx={{ mb: 1 }}>
        <InputLabel>{zh ? '技能类型' : 'Skill Type'}</InputLabel>
        <Select
          value={skillType}
          label={zh ? '技能类型' : 'Skill Type'}
          onChange={(e) => { setSkillType(e.target.value as SkillType | ''); setTargets(new Set()) }}
        >
          <MenuItem value="">{zh ? '— 选择 —' : '— Select —'}</MenuItem>
          {(Object.keys(SKILL_LABELS) as SkillType[]).map((k) => (
            <MenuItem key={k} value={k}>{language === 'zh' ? SKILL_LABELS[k].zh : SKILL_LABELS[k].en}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {skillType && (
        <>
          {/* Target player checkboxes */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {zh ? '目标玩家' : 'Target Players'}
          </Typography>
          <Box sx={{ maxHeight: 160, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5, mb: 1 }}>
            {allSeats.map((s: any) => {
              const sActual    = s.characterId ? getDisplayName(s.characterId, language) : '—'
              const sPerceived = s.userCharacterId && s.userCharacterId !== s.characterId
                ? getDisplayName(s.userCharacterId, language) : null
              const sTags = [...(s.customTags || []), ...(s.stTags || []).map((t: string) => t.replace(ST_TAG_PREFIX, ''))]
              return (
                <Box
                  key={s.seat}
                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, py: 0.25, cursor: 'pointer' }}
                  onClick={() => toggleTarget(s.seat)}
                >
                  <Checkbox
                    checked={targets.has(s.seat)}
                    size="small"
                    sx={{ p: 0.25 }}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleTarget(s.seat)}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      #{s.seat} {s.name}
                      {!s.alive && <Box component="span" sx={{ color: 'text.disabled', ml: 0.5 }}>†</Box>}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                      {sActual}{sPerceived ? ` / ${sPerceived}` : ''}
                    </Typography>
                    {sTags.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.1 }}>
                        {sTags.map((t: string, i: number) => (
                          <Chip key={i} label={t} size="small" sx={{ fontSize: '0.65rem', height: 14, '& .MuiChip-label': { px: 0.4 } }} />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>

          {/* Skill config */}
          {(skillType === 'know' || skillType === 'guess') && (
            <Box sx={{ mb: 1 }}>
              <FormControl size="small" fullWidth sx={{ mb: 0.75 }}>
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
                    <MenuItem value="">{zh ? '选择' : 'Select'}</MenuItem>
                    {(currentScriptCharacters ?? []).map((c: string) => (
                      <MenuItem key={c} value={c}>{getDisplayName(c, language)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {knowKind === 'other' && (
                <TextField size="small" fullWidth label={zh ? '内容' : 'Detail'} value={knowOtherText} onChange={(e) => setKnowOtherText(e.target.value)} />
              )}
            </Box>
          )}

          {skillType === 'addTag' && (
            <Box sx={{ mb: 1 }}>
              <TextField
                size="small"
                fullWidth
                label={zh ? '标签内容' : 'Tag'}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                sx={{ mb: 0.5 }}
              />
              {customTagPool.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                  {customTagPool.map((t: string) => (
                    <Chip key={t} label={t} size="small" onClick={() => setTagInput(t)}
                      variant={tagInput === t ? 'filled' : 'outlined'}
                      sx={{ fontSize: '0.7rem', height: 18, cursor: 'pointer', '& .MuiChip-label': { px: 0.5 } }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {skillType === 'removeTag' && (
            <FormControl size="small" fullWidth sx={{ mb: 1 }}>
              <InputLabel>{zh ? '选择要移除的标签' : 'Tag to Remove'}</InputLabel>
              <Select value={removeTagVal} label={zh ? '选择要移除的标签' : 'Tag to Remove'} onChange={(e) => setRemoveTagVal(e.target.value)}>
                <MenuItem value="">{zh ? '—' : '—'}</MenuItem>
                {allTagsForTargets.map((t: string) => (
                  <MenuItem key={t} value={t}>{t.replace(ST_TAG_PREFIX, '')}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {skillType === 'changeChar' && (
            <FormControl size="small" fullWidth sx={{ mb: 1 }}>
              <InputLabel>{zh ? '变更为角色' : 'Change to Character'}</InputLabel>
              <Select value={newCharId} label={zh ? '变更为角色' : 'Change to Character'} onChange={(e) => setNewCharId(e.target.value)}>
                <MenuItem value="">{zh ? '选择' : 'Select'}</MenuItem>
                {(currentScriptCharacters ?? []).map((c: string) => (
                  <MenuItem key={c} value={c}>
                    {getIconForCharacter(c) && (
                      <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 16, height: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    )}
                    {getDisplayName(c, language)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Success toggle + Save */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
            <FormControlLabel
              control={<Switch checked={isSuccess} onChange={(e) => setIsSuccess(e.target.checked)} size="small" />}
              label={<Typography variant="caption">{isSuccess ? (zh ? '成功' : 'Success') : (zh ? '失败' : 'Fail')}</Typography>}
            />
            <Button
              size="small"
              variant="contained"
              disabled={!canSave}
              onClick={handleSaveSkill}
            >
              {zh ? '保存' : 'Save'}
            </Button>
          </Box>
        </>
      )}
    </Dialog>
  )

  return createPortal(content, document.body)
}
