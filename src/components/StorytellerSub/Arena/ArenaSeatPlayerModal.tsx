// @ts-nocheck
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle, Divider,
  FormControl, IconButton, InputLabel, MenuItem, Select, Tab, Tabs, TextField, Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { getDisplayName, getIconForCharacter } from '../../../catalog'

export function ArenaSeatPlayerModal({ ctx, seat }: { ctx: any; seat: any }) {
  const {
    language, text, currentDay, skillOverlay, setSkillOverlay,
    currentScriptCharacters, closeSkillOverlay, openSeatSkill,
    seatTagDrafts, setSeatTagDrafts, customTagPool, updateSeatWithLog, addCustomTag,
    playerModalSeat, setPlayerModalSeat, playerModalTab, setPlayerModalTab,
    setSkillRoleDropdownOpen,
  } = ctx

  const [showCharacters, setShowCharacters] = useState(false)
  const isOpen = playerModalSeat === seat?.seat
  if (!isOpen || !seat) return null

  const draft = skillOverlay?.draft ?? {}
  const characterTag = (c: string) => `💀${c}`
  const isCharacterTag = (tag: string) => tag.startsWith('💀')

  const handleClose = () => {
    setPlayerModalSeat(null)
    if (skillOverlay) closeSkillOverlay(false)
  }

  const handleTargetToggle = (seatNum: number) => {
    setSkillOverlay((p: any) => {
      if (!p) return p
      const targets = p.draft.targets.includes(seatNum)
        ? p.draft.targets.filter((t: number) => t !== seatNum)
        : [...p.draft.targets, seatNum]
      return { ...p, draft: { ...p.draft, targets } }
    })
  }

  const handleAddTag = () => {
    addCustomTag(seat.seat)
    setSeatTagDrafts((c: any) => ({ ...c, [seat.seat]: '' }))
  }

  const handleToggleTag = (tag: string) => {
    updateSeatWithLog(seat.seat, (s: any) => ({
      ...s,
      customTags: s.customTags.includes(tag)
        ? s.customTags.filter((v: any) => v !== tag)
        : [...s.customTags, tag],
    }))
  }

  const abilityTab = skillOverlay ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">{language === 'zh' ? '目标' : 'Target'}</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
          {(currentDay?.seats ?? []).map((s: any) => (
            <Button key={s.seat} size="small"
              variant={draft.targets?.includes(s.seat) ? 'contained' : 'outlined'}
              onClick={() => handleTargetToggle(s.seat)}>
              #{s.seat}
            </Button>
          ))}
        </Box>
      </Box>
      <FormControl size="small" fullWidth>
        <InputLabel>{text.skillRole}</InputLabel>
        <Select value={draft.roleId ?? ''} label={text.skillRole}
          onChange={(e) => { setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, roleId: e.target.value } } : p); setSkillRoleDropdownOpen(false) }}>
          <MenuItem value="">{language === 'zh' ? '— 未声明 —' : '— None —'}</MenuItem>
          {(currentScriptCharacters ?? []).map((c: string) => (
            <MenuItem key={c} value={c}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getIconForCharacter(c) && <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 18, height: 18 }} />}
                {getDisplayName(c, language)}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField size="small" fullWidth label={text.statement} value={draft.statement ?? ''}
        onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, statement: e.target.value } } : p)} />
      <TextField size="small" fullWidth label={text.note} value={draft.note ?? ''}
        onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, note: e.target.value } } : p)} />
      {draft.targets?.map((t: number) => (
        <TextField key={t} size="small" fullWidth label={`#${t} ${text.targetNote}`}
          value={draft.targetNotes?.[t] ?? ''}
          onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, targetNotes: { ...p.draft.targetNotes, [t]: e.target.value } } } : p)} />
      ))}
      <FormControl size="small" fullWidth>
        <InputLabel>{language === 'zh' ? '结果' : 'Result'}</InputLabel>
        <Select value={draft.result ?? ''} label={language === 'zh' ? '结果' : 'Result'}
          onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, result: e.target.value || null } } : p)}>
          <MenuItem value="">{language === 'zh' ? '— 未选择 —' : '— None —'}</MenuItem>
          <MenuItem value="success">{language === 'zh' ? '成功' : 'Success'}</MenuItem>
          <MenuItem value="failure">{language === 'zh' ? '失败' : 'Failure'}</MenuItem>
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, pt: 1 }}>
        <Button size="small" color="error" onClick={() => closeSkillOverlay(false)}>✕ {language === 'zh' ? '取消' : 'Cancel'}</Button>
        <Button size="small" variant="contained" onClick={() => { closeSkillOverlay(true); setPlayerModalSeat(null) }}>✓ {text.saveSkill}</Button>
      </Box>
    </Box>
  ) : (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <Button variant="contained" onClick={() => openSeatSkill(seat.seat)}>
        {language === 'zh' ? '发动技能' : 'Use Ability'}
      </Button>
    </Box>
  )

  const statusTab = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {[
          { label: text.aliveTag, active: !seat.alive, color: 'error', toggle: (s: any) => ({ ...s, alive: !s.alive }) },
          { label: text.executedTag, active: seat.isExecuted, color: 'error', toggle: (s: any) => ({ ...s, isExecuted: !s.isExecuted }) },
          { label: text.traveler, active: seat.isTraveler, color: 'info', toggle: (s: any) => ({ ...s, isTraveler: !s.isTraveler }) },
          { label: text.noVoteTag, active: seat.hasNoVote, color: 'warning', toggle: (s: any) => ({ ...s, hasNoVote: !s.hasNoVote }) },
        ].map(({ label, active, color, toggle }) => (
          <Button key={label} size="small" variant={active ? 'contained' : 'outlined'} color={active ? color as any : 'primary'}
            onClick={() => updateSeatWithLog(seat.seat, toggle)}>
            {label}
          </Button>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <TextField size="small" fullWidth placeholder={text.addTag || 'Add tag'}
          value={seatTagDrafts[seat.seat] ?? ''}
          onChange={(e) => setSeatTagDrafts((c: any) => ({ ...c, [seat.seat]: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }} />
        <Button variant="contained" onClick={handleAddTag} sx={{ minWidth: 40, px: 1 }}>+</Button>
      </Box>
      {customTagPool.filter((t: string) => !isCharacterTag(t)).length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {customTagPool.filter((t: string) => !isCharacterTag(t)).map((tag: string) => (
            <Chip key={tag} label={tag} size="small" clickable
              color={seat.customTags.includes(tag) ? 'primary' : 'default'}
              variant={seat.customTags.includes(tag) ? 'filled' : 'outlined'}
              onClick={() => handleToggleTag(tag)} />
          ))}
        </Box>
      )}
      {currentScriptCharacters?.length > 0 && (
        <>
          <Divider>
            <Button size="small" onClick={() => setShowCharacters((v) => !v)} sx={{ textTransform: 'none' }}>
              {showCharacters ? '▼' : '▶'} {text.characters || 'Characters'}
            </Button>
          </Divider>
          {showCharacters && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 180, overflow: 'auto' }}>
              {currentScriptCharacters.map((c: string) => {
                const tag = characterTag(c)
                const icon = getIconForCharacter(c)
                return (
                  <Chip key={c} size="small" clickable
                    color={seat.customTags.includes(tag) ? 'primary' : 'default'}
                    variant={seat.customTags.includes(tag) ? 'filled' : 'outlined'}
                    onClick={() => handleToggleTag(tag)}
                    icon={icon ? <Box component="img" src={icon as string} sx={{ width: 18, height: 18, ml: 0.5 }} /> : undefined}
                    label={getDisplayName(c, language)} />
                )
              })}
            </Box>
          )}
        </>
      )}
    </Box>
  )

  const modal = (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
        <Typography fontWeight={700}>#{seat.seat} {seat.name}</Typography>
        <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <Tabs value={playerModalTab} onChange={(_, v) => setPlayerModalTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={language === 'zh' ? '技能' : 'Ability'} />
        <Tab label={language === 'zh' ? '状态' : 'Status'} />
      </Tabs>
      <DialogContent sx={{ pt: 2 }}>
        {playerModalTab === 0 ? abilityTab : statusTab}
      </DialogContent>
    </Dialog>
  )

  return createPortal(modal, document.body)
}
