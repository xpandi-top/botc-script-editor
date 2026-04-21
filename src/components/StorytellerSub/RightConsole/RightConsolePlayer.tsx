// @ts-nocheck
import React from 'react'
import { Box, Button, Typography, Paper, Chip, TextField, Grid, IconButton } from '@mui/material'
import { getDisplayName } from '../../../catalog'
import { FAKE_NAMES, FAKE_NAMES_ZH } from '../constants'

export function RightConsolePlayer({ ctx, toggleConsoleSection }: { ctx: any, toggleConsoleSection: any }) {
  const { 
    language, text, activeConsoleSections, 
    currentDay, updateSeatWithLog, addCustomTag,
    playerNamePool, setPlayerNamePool, 
    resetSeatNames, clearUnusedCustomTags,
    selectedSeat, selectedSeatTags, seatTagDrafts, setSeatTagDrafts,
    setShowEditPlayersModal, customTagPool,
  } = ctx
  const isOpen = activeConsoleSections?.has('player')

  const isCharacterTag = (tag: string) => tag.startsWith('💀')
  const getCharacterName = (tag: string) => getDisplayName(tag.slice(1), language)
  const displayTag = (tag: string) => isCharacterTag(tag) ? getCharacterName(tag) : tag

  const travelerCount = currentDay?.seats?.filter((s: any) => s.isTraveler).length ?? 0
  const aliveCount = currentDay?.seats?.filter((s: any) => s.alive).length ?? 0
  const totalCount = currentDay?.seats?.length ?? 0

  const tagsNotChar = customTagPool?.filter((t: string) => !isCharacterTag(t)) ?? []

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Button fullWidth onClick={() => toggleConsoleSection('player')} sx={{ justifyContent: 'space-between', textTransform: 'none' }}>
        <Typography variant="body2">{text.playerSection}</Typography>
        <span>{isOpen ? '▼' : '▶'}</span>
      </Button>
      {isOpen && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2">
                <strong>{aliveCount}/{totalCount}</strong>
                {travelerCount > 0 && <span> +{travelerCount}{text.travelersCount}</span>}
              </Typography>
            </Box>
            <Button size="small" onClick={() => setShowEditPlayersModal(true)}>{text.editPlayers}</Button>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">{text.playerPool}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(playerNamePool ?? []).map((name: string, i: number) => {
                const isUsed = currentDay?.seats?.some((s: any) => s.name === name)
                return (
                  <Chip
                    key={`${name}-${i}`}
                    label={name}
                    size="small"
                    variant={isUsed ? 'filled' : 'outlined'}
                    onClick={() => {
                      const seat = currentDay?.seats?.find((s: any) => s.name.startsWith('Player '))
                      if (seat) updateSeat(seat.seat, (s: any) => ({ ...s, name }))
                    }}
                  />
                )
              })}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              <Button size="small" onClick={() => setPlayerNamePool(language === 'zh' ? [...FAKE_NAMES_ZH] : [...FAKE_NAMES])}>
                {text.loadFakeNames}
              </Button>
              <Button size="small" onClick={resetSeatNames}>{text.resetNames}</Button>
              <Button size="small" onClick={() => setPlayerNamePool([])}>{text.clear}</Button>
            </Box>
          </Box>

          {selectedSeat && (
            <Box>
              <Typography variant="subtitle2">
                {text.selectedPlayer} #{selectedSeat.seat} {selectedSeat.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                <Button size="small" variant={!selectedSeat.alive ? 'contained' : 'outlined'} onClick={() => updateSeatWithLog(selectedSeat.seat, (s: any) => ({ ...s, alive: !s.alive }))}>
                  {text.aliveTag}
                </Button>
                <Button size="small" variant={selectedSeat.isExecuted ? 'contained' : 'outlined'} color="error" onClick={() => updateSeatWithLog(selectedSeat.seat, (s: any) => ({ ...s, isExecuted: !s.isExecuted }))}>
                  {text.executedTag}
                </Button>
                <Button size="small" variant={selectedSeat.isTraveler ? 'contained' : 'outlined'} color="info" onClick={() => updateSeatWithLog(selectedSeat.seat, (s: any) => ({ ...s, isTraveler: !s.isTraveler }))}>
                  {text.traveler}
                </Button>
                <Button size="small" variant={selectedSeat.hasNoVote ? 'contained' : 'outlined'} color="warning" onClick={() => updateSeatWithLog(selectedSeat.seat, (s: any) => ({ ...s, hasNoVote: !s.hasNoVote }))}>
                  {text.noVoteTag}
                </Button>
              </Box>

              {(selectedSeatTags ?? []).length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.5 }}>
                  {(selectedSeatTags ?? []).map((tag: string) => (
                    <Chip key={`${selectedSeat.seat}-${tag}`} label={displayTag(tag)} size="small" />
                  ))}
                </Box>
              )}

              <Box sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  label={text.addTag}
                  value={seatTagDrafts?.[selectedSeat.seat] ?? ''}
                  onChange={(e) => setSeatTagDrafts((c: any) => ({ ...c, [selectedSeat.seat]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(selectedSeat.seat); (document.activeElement as HTMLInputElement)?.blur() } }}
                />
                <Button size="small" onClick={() => addCustomTag(selectedSeat.seat)} sx={{ mt: 0.5 }}>+</Button>
              </Box>

              {tagsNotChar.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">{text.tagPool}</Typography>
                    <Button size="small" onClick={clearUnusedCustomTags}>{text.clearUnusedTags}</Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                    {tagsNotChar.map((tag: string) => (
                      <Chip
                        key={`pool-${tag}`}
                        label={tag}
                        size="small"
                        variant={selectedSeat?.customTags?.includes(tag) ? 'filled' : 'outlined'}
                        onClick={() => updateSeatWithLog(selectedSeat.seat, (s: any) => ({ 
                          ...s, 
                          customTags: s.customTags.includes(tag) 
                            ? s.customTags.filter((v: string) => v !== tag) 
                            : [...s.customTags, tag] 
                        }))}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  )
}