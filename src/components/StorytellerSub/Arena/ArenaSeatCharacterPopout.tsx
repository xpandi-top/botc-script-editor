// @ts-nocheck
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Box, Button, Typography, TextField, Paper, IconButton, Chip, Grid, Dialog, DialogTitle, DialogContent, Tooltip } from '@mui/material'
import { getDisplayName, getIconForCharacter, getAbilityText } from '../../../catalog'
import { useIsMobile } from './useIsMobile'

const ST_TAG_PREFIX = '📝'

const DEFAULT_ST_TAGS: Record<string, string> = {
  drunk: '🍺',
  poisoned: '☠️',
  mad: '🤪',
}

export function ArenaSeatCharacterPopout({ ctx, seat }: { ctx: any, seat: any }) {
  const { 
    language, characterPopoutSeat, setCharacterPopoutSeat, text, 
    updateSeatWithLog, currentDay, currentScriptCharacters,
  } = ctx

  const isCharacterPopoutOpen = characterPopoutSeat === seat?.seat
  const isMobile = useIsMobile()

  const actualCharId = seat?.characterId
  const perceivedCharId = seat?.userCharacterId || seat?.characterId
  const showDifferentPerception = seat?.userCharacterId && seat?.userCharacterId !== seat?.characterId

  const [viewingPerceived, setViewingPerceived] = useState(false)
  const [showCharacterPicker, setShowCharacterPicker] = useState(!actualCharId)

  const displayedCharId = viewingPerceived ? perceivedCharId : actualCharId
  const displayedIcon = displayedCharId ? getIconForCharacter(displayedCharId) : null
  const displayedName = displayedCharId ? getDisplayName(displayedCharId, language) : ''
  const displayedAbility = displayedCharId ? getAbilityText(displayedCharId, language) : ''

  const stTags = seat?.stTags || []
  const [stTagDraft, setStTagDraft] = useState('')

  useEffect(() => {
    if (isCharacterPopoutOpen) {
      setViewingPerceived(false)
      setShowCharacterPicker(!actualCharId)
    }
  }, [isCharacterPopoutOpen, actualCharId])

  const addStTag = () => {
    const trimmed = stTagDraft.trim()
    if (!trimmed) return
    updateSeatWithLog(seat.seat, (s: any) => ({
      ...s,
      stTags: [...(s.stTags || []), `${ST_TAG_PREFIX}${trimmed}`]
    }))
    setStTagDraft('')
  }

  const removeStTag = (tag: string) => {
    updateSeatWithLog(seat.seat, (s: any) => ({
      ...s,
      stTags: (s.stTags || []).filter((t: string) => t !== tag)
    }))
  }

  const addDefaultStTag = (tagKey: string) => {
    const tag = `${DEFAULT_ST_TAGS[tagKey] || ''} ${tagKey}`
    updateSeatWithLog(seat.seat, (s: any) => ({
      ...s,
      stTags: [...(s.stTags || []), `${ST_TAG_PREFIX}${tag}`]
    }))
  }

  const reassignCharacter = (newCharId: string) => {
    updateSeatWithLog(seat.seat, (s: any) => ({ ...s, characterId: newCharId }))
    setShowCharacterPicker(false)
  }

  const setPerceivedCharacter = (newCharId: string) => {
    updateSeatWithLog(seat.seat, (s: any) => ({ ...s, userCharacterId: newCharId }))
    setShowCharacterPicker(false)
  }

  const actualIcon = actualCharId ? getIconForCharacter(actualCharId) : null
  const actualName = actualCharId ? getDisplayName(actualCharId, language) : ''
  const actualAbility = actualCharId ? getAbilityText(actualCharId, language) : ''
  const perceivedIcon = perceivedCharId ? getIconForCharacter(perceivedCharId) : null
  const perceivedName = perceivedCharId ? getDisplayName(perceivedCharId, language) : ''

  if (!isCharacterPopoutOpen || !seat) return null

  const content = (
    <Dialog open={isCharacterPopoutOpen} onClose={() => {}} disableEscapeKeyDown maxWidth="sm" fullWidth slotProps={{ backdrop: { onClick: () => {} }, paper: { 'data-character-popup': true, sx: { p: 2, width: 360, borderRadius: 2, maxHeight: '80vh' } } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" fontWeight={700}>{language === 'zh' ? '角色分配' : 'Assign Character'}</Typography>
        <IconButton size="small" onClick={() => setCharacterPopoutSeat(null)}>✕</IconButton>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
        <Button size="small" variant={!viewingPerceived ? 'contained' : 'outlined'} onClick={() => setViewingPerceived(false)}>
          {language === 'zh' ? '实际角色' : 'Actual'}
        </Button>
        {showDifferentPerception && (
          <Button size="small" variant={viewingPerceived ? 'contained' : 'outlined'} onClick={() => setViewingPerceived(true)}>
            {language === 'zh' ? '玩家以为' : 'Perceived'}
          </Button>
        )}
      </Box>

      {displayedCharId ? (
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            {displayedIcon && (
              <Box component="img" src={displayedIcon as string} sx={{ width: 40, height: 40 }} />
            )}
            <Typography variant="body1" fontWeight={600}>{displayedName}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{displayedAbility}</Typography>
          <Button size="small" variant="outlined" onClick={() => setShowCharacterPicker(true)}>
            {language === 'zh' ? '更换角色' : 'Change'}
          </Button>
        </Box>
      ) : (
        <Button size="small" variant="contained" onClick={() => setShowCharacterPicker(true)} sx={{ mb: 1.5 }}>
          {language === 'zh' ? '+ 分配角色' : '+ Assign Character'}
        </Button>
      )}

      {showCharacterPicker && (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">{language === 'zh' ? '实际角色' : 'Actual Character'}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, maxHeight: 150, overflow: 'auto' }}>
            {(currentScriptCharacters ?? []).map((c: string) => (
              <Chip
                key={c}
                label={getDisplayName(c, language)}
                size="small"
                variant={actualCharId === c ? 'filled' : 'outlined'}
                onClick={() => reassignCharacter(c)}
                icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 16, height: 16 }} /> : undefined}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{language === 'zh' ? '玩家以为' : 'Perceived Character'}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, maxHeight: 150, overflow: 'auto' }}>
            {(currentScriptCharacters ?? []).map((c: string) => (
              <Chip
                key={`per-${c}`}
                label={getDisplayName(c, language)}
                size="small"
                variant={perceivedCharId === c ? 'filled' : 'outlined'}
                onClick={() => setPerceivedCharacter(c)}
                icon={getIconForCharacter(c) ? <Box component="img" src={getIconForCharacter(c) as string} sx={{ width: 16, height: 16 }} /> : undefined}
              />
            ))}
          </Box>
        </Box>
      )}

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {language === 'zh' ? '快捷标签' : 'Quick Tags'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {Object.keys(DEFAULT_ST_TAGS).map((key) => (
            <Button key={key} size="small" onClick={() => addDefaultStTag(key)}>
              {DEFAULT_ST_TAGS[key]} {language === 'zh' ? key : key}
            </Button>
          ))}
        </Box>
      </Box>

      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {language === 'zh' ? 'ST专属标签' : 'ST Tags'}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
          {stTags.map((tag: string) => (
            <Chip
              key={`st-${tag}`}
              label={tag.replace(ST_TAG_PREFIX, '')}
              size="small"
              onDelete={() => removeStTag(tag)}
            />
          ))}
        </Box>
        <TextField
          size="small"
          fullWidth
          placeholder={language === 'zh' ? '添加ST标签...' : 'Add ST tag...'}
          value={stTagDraft}
          onChange={(e) => setStTagDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addStTag() }}
        />
        <Button size="small" onClick={addStTag} sx={{ mt: 0.5 }}>+</Button>
      </Box>
    </Dialog>
  )

  return createPortal(content, document.body)
}