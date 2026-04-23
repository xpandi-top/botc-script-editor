// @ts-nocheck
import React from 'react'
import { createPortal } from 'react-dom'
import { Box, Button, Typography, TextField, FormControl, Select, MenuItem, InputLabel, IconButton, Dialog, DialogTitle, DialogContent } from '@mui/material'
import { getDisplayName, getIconForCharacter } from '../../../catalog'
import { useIsMobile } from './useIsMobile'

export function ArenaSeatSkillPopout({ ctx, seat }: { ctx: any, seat: any }) {
  const {
    language, text, currentDay, skillOverlay, setSkillOverlay,
    skillPopoutSeat, setSkillRoleDropdownOpen,
    currentScriptCharacters, closeSkillOverlay,
  } = ctx

  const isSkillPopoutOpen = skillPopoutSeat === seat?.seat
  const isMobile = useIsMobile()

  if (!isSkillPopoutOpen || !skillOverlay) return null

  const handleTargetToggle = (seatNum: number) => {
    setSkillOverlay((p: any) => {
      if (!p) return p
      const targets = p.draft.targets.includes(seatNum)
        ? p.draft.targets.filter((t: number) => t !== seatNum)
        : [...p.draft.targets, seatNum]
      return { ...p, draft: { ...p.draft, targets } }
    })
  }

  const handleRoleSelect = (roleId: string) => {
    setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, roleId } } : p)
    setSkillRoleDropdownOpen(false)
  }

  const draft = skillOverlay?.draft ?? {}

  // JSX variable (not a nested component) — avoids remount-on-render that kills input focus
  const skillContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">{language === 'zh' ? '发动者' : 'Actor'}</Typography>
          <Typography variant="body2">
            <strong>#{seat?.seat} {seat?.name}</strong>
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {language === 'zh' ? '目标' : 'Target'}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {(currentDay?.seats ?? []).map((s: any) => (
            <Button
              key={s.seat}
              size="small"
              variant={draft.targets?.includes(s.seat) ? 'contained' : 'outlined'}
              onClick={() => handleTargetToggle(s.seat)}
            >
              #{s.seat}
            </Button>
          ))}
        </Box>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {text.skillRole}
        </Typography>
        <FormControl size="small" fullWidth>
          <Select
            value={draft.roleId ?? ''}
            displayEmpty
            onChange={(e) => handleRoleSelect(e.target.value)}
          >
            <MenuItem value="">{language === 'zh' ? '— 未声明 —' : '— None —'}</MenuItem>
            {(currentScriptCharacters ?? []).map((c: string) => (
              <MenuItem key={c} value={c}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getIconForCharacter(c) && (
                    <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 18, height: 18 }} />
                  )}
                  {getDisplayName(c, language)}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TextField
        size="small"
        fullWidth
        label={text.statement}
        value={draft.statement ?? ''}
        onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, statement: e.target.value } } : p)}
        sx={{ mb: 1 }}
      />

      <TextField
        size="small"
        fullWidth
        label={text.note}
        value={draft.note ?? ''}
        onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, note: e.target.value } } : p)}
        sx={{ mb: 1 }}
      />

      {draft.targets?.map((t: number) => (
        <TextField
          key={t}
          size="small"
          fullWidth
          label={`#${t} ${text.targetNote}`}
          value={draft.targetNotes?.[t] ?? ''}
          onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, targetNotes: { ...p.draft.targetNotes, [t]: e.target.value } } } : p)}
          sx={{ mb: 1 }}
        />
      ))}

      <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
        <InputLabel>{language === 'zh' ? '结果' : 'Result'}</InputLabel>
        <Select
          value={draft.result ?? ''}
          label={language === 'zh' ? '结果' : 'Result'}
          onChange={(e) => setSkillOverlay((p: any) => p ? { ...p, draft: { ...p.draft, result: e.target.value || null } } : p)}
        >
          <MenuItem value="">{language === 'zh' ? '— 未选择 —' : '— None —'}</MenuItem>
          <MenuItem value="success">{language === 'zh' ? '成功' : 'Success'}</MenuItem>
          <MenuItem value="failure">{language === 'zh' ? '失败' : 'Failure'}</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
        <Button size="small" color="error" onClick={() => closeSkillOverlay(false)}>
          ✕ {language === 'zh' ? '取消' : 'Cancel'}
        </Button>
        <Button size="small" variant="contained" onClick={() => closeSkillOverlay(true)}>
          ✓ {text.saveSkill}
        </Button>
      </Box>
    </Box>
  )

  const dialog = (
    <Dialog
      open={isSkillPopoutOpen}
      onClose={() => {}}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      slotProps={{ backdrop: { onClick: () => {} } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        {language === 'zh' ? '发动技能' : 'Use Skill'}
        <IconButton size="small" onClick={() => closeSkillOverlay(false)}>✕</IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {skillContent}
      </DialogContent>
    </Dialog>
  )

  return isMobile ? createPortal(dialog, document.body) : dialog
}
