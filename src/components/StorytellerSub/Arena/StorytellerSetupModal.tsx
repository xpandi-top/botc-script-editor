// @ts-nocheck
import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Box, Button, Chip, Collapse, Dialog, DialogContent, DialogTitle,
  IconButton, InputAdornment, List, ListItem, ListItemAvatar, ListItemButton,
  ListItemText, TextField, Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { allCharacters, getDisplayName, getAbilityText, getIconForCharacter } from '../../../catalog'

const FABLED_CHARS = allCharacters.filter((c) => c.team === 'fabled')
const LORIC_CHARS = allCharacters.filter((c) => c.edition === 'loric')

export function StorytellerSetupModal({ ctx }: { ctx: any }) {
  const {
    language, showStSetupModal, setShowStSetupModal,
    stFabledIds, setStFabledIds, stCustomRules, setStCustomRules,
    stName, setStName,
  } = ctx

  const [editMode, setEditMode] = useState(false)
  const [rulesValue, setRulesValue] = useState(stCustomRules)
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')

  const filteredChars = useMemo(() => {
    const pool = [...FABLED_CHARS, ...LORIC_CHARS]
    const q = search.toLowerCase()
    return q ? pool.filter((c) => getDisplayName(c.id, language).toLowerCase().includes(q) || c.id.includes(q)) : pool
  }, [search, language])

  const handleClose = () => {
    if (editMode) { setStCustomRules(rulesValue); setEditMode(false) }
    setShowPicker(false)
    setShowStSetupModal(false)
  }

  const handleEnterEdit = () => { setRulesValue(stCustomRules); setEditMode(true) }

  const handleSaveEdit = () => { setStCustomRules(rulesValue); setEditMode(false) }

  const handleToggleFabled = (id: string) => {
    setStFabledIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  if (!showStSetupModal) return null

  const activeChars = stFabledIds
    .map((id: string) => ({ id, name: getDisplayName(id, language), icon: getIconForCharacter(id) }))

  const modal = (
    <Dialog open={showStSetupModal} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '1.2rem' }}>📖</Typography>
          <Typography fontWeight={700}>{language === 'zh' ? '说书人设置' : 'Storyteller Setup'}</Typography>
        </Box>
        <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* ST Name */}
        <Box sx={{ mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            label={language === 'zh' ? '主持人名称' : 'Storyteller Name'}
            placeholder={language === 'zh' ? '输入你的ST名称' : 'Your name as Storyteller'}
            value={stName ?? ''}
            onChange={(e) => setStName(e.target.value)}
          />
        </Box>

        {/* Fabled / Loric section */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {language === 'zh' ? '传说 / 奇遇角色' : 'Fabled / Loric'}
            </Typography>
            <Button size="small" startIcon={<AddIcon />}
              onClick={() => setShowPicker((v) => !v)}
              endIcon={showPicker ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
              {language === 'zh' ? '添加' : 'Add'}
            </Button>
          </Box>

          {/* Active chips */}
          {activeChars.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1 }}>
              {activeChars.map(({ id, name, icon }) => (
                <Box key={id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 0.75, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                  {icon && <Box component="img" src={icon} sx={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0, mt: 0.25 }} />}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" fontWeight={700}>{getDisplayName(id, language)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {language !== 'en' ? getDisplayName(id, 'en') : getDisplayName(id, 'zh')}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                      {getAbilityText(id, language)}
                    </Typography>
                  </Box>
                  <IconButton size="small" sx={{ p: 0.25, flexShrink: 0 }} onClick={() => handleToggleFabled(id)}>
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
              {language === 'zh' ? '未选择' : 'None selected'}
            </Typography>
          )}

          {/* Picker */}
          <Collapse in={showPicker}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
              <Box sx={{ p: 1 }}>
                <TextField size="small" fullWidth placeholder={language === 'zh' ? '搜索…' : 'Search…'}
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start">🔍</InputAdornment> } }} />
              </Box>
              <List dense disablePadding sx={{ maxHeight: 240, overflow: 'auto' }}>
                {filteredChars.length === 0 && (
                  <ListItem><ListItemText primary="—" /></ListItem>
                )}
                {filteredChars.map((c) => {
                  const icon = getIconForCharacter(c.id)
                  const name = getDisplayName(c.id, language)
                  const active = stFabledIds.includes(c.id)
                  return (
                    <ListItemButton key={c.id} selected={active} onClick={() => handleToggleFabled(c.id)}
                      sx={{ py: 0.5, bgcolor: active ? 'action.selected' : undefined }}>
                      {icon && (
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                          <Box component="img" src={icon} sx={{ width: 32, height: 32, objectFit: 'contain' }} />
                        </ListItemAvatar>
                      )}
                      <ListItemText
                        disableTypography
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography variant="body2" fontWeight={active ? 700 : 600}>
                              {getDisplayName(c.id, language)}
                            </Typography>
                            {language !== 'en' && (
                              <Typography variant="caption" color="text.secondary">
                                {getDisplayName(c.id, 'en')}
                              </Typography>
                            )}
                            {language === 'en' && (
                              <Typography variant="caption" color="text.secondary">
                                {getDisplayName(c.id, 'zh')}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ color: c.edition === 'loric' ? 'info.main' : 'warning.main', fontWeight: 600 }}>
                              {c.edition === 'loric' ? 'Loric' : 'Fabled'}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35, mt: 0.25 }}>
                            {getAbilityText(c.id, language)}
                          </Typography>
                        }
                      />
                      {active && <CheckIcon fontSize="small" color="primary" />}
                    </ListItemButton>
                  )
                })}
              </List>
            </Box>
          </Collapse>
        </Box>

        {/* Custom Rules section */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {language === 'zh' ? '自定义规则' : 'Custom Rules'}
            </Typography>
            {editMode ? (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton size="small" color="primary" onClick={handleSaveEdit}><CheckIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => setEditMode(false)}><CloseIcon fontSize="small" /></IconButton>
              </Box>
            ) : (
              <IconButton size="small" onClick={handleEnterEdit}><EditIcon fontSize="small" /></IconButton>
            )}
          </Box>

          {editMode ? (
            <TextField
              multiline rows={5} fullWidth autoFocus
              value={rulesValue}
              onChange={(e) => setRulesValue(e.target.value)}
              placeholder={language === 'zh' ? '输入自定义规则…' : 'Enter custom rules…'}
            />
          ) : stCustomRules ? (
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover', whiteSpace: 'pre-wrap', cursor: 'text' }}
              onClick={handleEnterEdit}>
              <Typography variant="body2">{stCustomRules}</Typography>
            </Box>
          ) : (
            <Box sx={{ p: 1.5, borderRadius: 1, border: '1px dashed', borderColor: 'divider', cursor: 'text' }}
              onClick={handleEnterEdit}>
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                {language === 'zh' ? '点击添加自定义规则…' : 'Click to add custom rules…'}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )

  return createPortal(modal, document.body)
}
