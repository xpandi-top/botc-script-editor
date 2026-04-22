// @ts-nocheck
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, Button, TextField, Chip, Paper, IconButton, Divider } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { getDisplayName, getIconForCharacter } from '../../../catalog'

export function ArenaSeatTagPopout({ ctx, seat }: { ctx: any, seat: any }) {
  const { 
    language, text, seatTagDrafts, setSeatTagDrafts, customTagPool, currentScriptCharacters,
    tagPopoutSeat, setTagPopoutSeat, updateSeatWithLog, addCustomTag,
  } = ctx

  const isTagPopoutOpen = tagPopoutSeat === seat?.seat
  const [showCharacters, setShowCharacters] = useState(false)

  if (!isTagPopoutOpen || !seat) return null

  const characterTag = (c: string) => `💀${c}`
  const isCharacterTag = (tag: string) => tag.startsWith('💀')

  const handleAddTag = () => {
    addCustomTag(seat.seat)
    setSeatTagDrafts((c: any) => ({ ...c, [seat.seat]: '' }))
  }

  const handleToggleTag = (tag: string) => {
    updateSeatWithLog(seat.seat, (s: any) => ({ 
      ...s, 
      customTags: s.customTags.includes(tag) 
        ? s.customTags.filter((v: any) => v !== tag) 
        : [...s.customTags, tag] 
    }))
  }

  const content = (
    <Paper 
      elevation={8}
      data-tag-popup
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2000,
        width: 320,
        maxHeight: '80vh',
        overflow: 'auto',
        p: 2,
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ fontSize: '1rem', fontWeight: 600 }}>#{seat.seat} {seat.name}</Box>
        <IconButton size="small" onClick={() => setTagPopoutSeat(null)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <Button 
            size="small" 
            variant={!seat.alive ? 'contained' : 'outlined'} 
            onClick={() => updateSeatWithLog(seat.seat, (s: any) => ({ ...s, alive: !s.alive }))}
            color={!seat.alive ? 'error' : 'primary'}
          >
            {text.aliveTag}
          </Button>
          <Button 
            size="small" 
            variant={seat.isExecuted ? 'contained' : 'outlined'} 
            onClick={() => updateSeatWithLog(seat.seat, (s: any) => ({ ...s, isExecuted: !s.isExecuted }))}
            color={seat.isExecuted ? 'error' : 'primary'}
          >
            {text.executedTag}
          </Button>
          <Button 
            size="small" 
            variant={seat.isTraveler ? 'contained' : 'outlined'} 
            onClick={() => updateSeatWithLog(seat.seat, (s: any) => ({ ...s, isTraveler: !s.isTraveler }))}
            color={seat.isTraveler ? 'info' : 'primary'}
          >
            {text.traveler}
          </Button>
          <Button 
            size="small" 
            variant={seat.hasNoVote ? 'contained' : 'outlined'} 
            onClick={() => updateSeatWithLog(seat.seat, (s: any) => ({ ...s, hasNoVote: !s.hasNoVote }))}
            color={seat.hasNoVote ? 'warning' : 'primary'}
          >
            {text.noVoteTag}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <TextField
            size="small"
            fullWidth
            placeholder={text.addTag || 'Add tag'}
            value={seatTagDrafts[seat.seat] ?? ''}
            onChange={(e) => setSeatTagDrafts((c: any) => ({ ...c, [seat.seat]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
          />
          <Button variant="contained" onClick={handleAddTag} sx={{ minWidth: 40, px: 1 }}>+</Button>
        </Box>

        {customTagPool.filter((tag: string) => !isCharacterTag(tag)).length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {customTagPool.filter((tag: string) => !isCharacterTag(tag)).map((tag: string) => (
              <Chip
                key={`pool-${tag}`}
                label={tag}
                size="small"
                clickable
                color={seat.customTags.includes(tag) ? 'primary' : 'default'}
                variant={seat.customTags.includes(tag) ? 'filled' : 'outlined'}
                onClick={() => handleToggleTag(tag)}
              />
            ))}
          </Box>
        )}

        {currentScriptCharacters && currentScriptCharacters.length > 0 && (
          <>
            <Divider sx={{ my: 0.5 }}>
              <Button size="small" onClick={() => setShowCharacters((v) => !v)} sx={{ textTransform: 'none' }}>
                {showCharacters ? '▼' : '▶'} {text.characters || 'Characters'}
              </Button>
            </Divider>
            {showCharacters && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 200, overflow: 'auto' }}>
                {currentScriptCharacters.map((c: string) => {
                  const tag = characterTag(c)
                  const icon = getIconForCharacter(c)
                  const name = getDisplayName(c, language)
                  return (
                    <Chip
                      key={`char-${c}`}
                      size="small"
                      clickable
                      color={seat.customTags.includes(tag) ? 'primary' : 'default'}
                      variant={seat.customTags.includes(tag) ? 'filled' : 'outlined'}
                      onClick={() => handleToggleTag(tag)}
                      icon={icon ? <Box component="img" src={icon as string} sx={{ width: 18, height: 18, ml: 0.5 }} /> : undefined}
                      label={name}
                    />
                  )
                })}
              </Box>
            )}
          </>
        )}
      </Box>
    </Paper>
  )

  return createPortal(content, document.body)
}