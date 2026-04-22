// @ts-nocheck
import React from 'react'
import { Box, Button, TextField, IconButton, Typography, Paper, Grid, List, ListItem, ListItemText, ListItemButton, Chip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { uniqueStrings } from '../constants'

export function ModalsEditPlayers({ ctx }: { ctx: any }) {
  const { 
    language, text, currentDay, updateCurrentDay, updateSeat,
    playerNamePool, setPlayerNamePool, editPlayersPreset, setEditPlayersPreset,
    removeLastPlayerSeat, addPlayerSeat, removeLastTraveler, addTravelerSeat,
    resetSeatNames, setShowEditPlayersModal,
  } = ctx

  const regularSeats = currentDay.seats.filter((s: any) => !s.isTraveler)
  const travelerSeats = currentDay.seats.filter((s: any) => s.isTraveler)

  const handleLoadPreset = () => {
    const names = editPlayersPreset.split(',').map((n: string) => n.trim()).filter(Boolean)
    updateCurrentDay((d: any) => {
      const newSeats = d.seats.map((s: any, i: number) => names[i] ? { ...s, name: names[i] } : s)
      return { ...d, seats: newSeats }
    })
    setPlayerNamePool((cur: string[]) => uniqueStrings([...cur, ...names.filter((n: string) => !n.match(/^Player \d+$/) && !n.match(/^Traveler \d+$/))]))
    setEditPlayersPreset('')
  }

  const handleNameBlur = (seatSeat: number, value: string) => {
    const val = value.trim()
    if (val && !val.match(/^Player \d+$/) && !playerNamePool.includes(val)) {
      setPlayerNamePool((cur: string[]) => [...cur, val])
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{language === 'zh' ? '批量加载' : 'Batch Load'}</Typography>
        <TextField
          size="small"
          fullWidth
          multiline
          rows={2}
          placeholder={language === 'zh' ? '张三, 李四, 王五...' : 'Alice, Bob, Charlie...'}
          value={editPlayersPreset}
          onChange={(e) => setEditPlayersPreset(e.target.value)}
        />
        <Button size="small" onClick={handleLoadPreset} sx={{ mt: 1 }}>{text.loadPreset}</Button>
      </Paper>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2">
          {language === 'zh' ? '玩家人数' : 'Players'}: {regularSeats.length}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={removeLastPlayerSeat} disabled={regularSeats.length <= 5}>
            <RemoveIcon />
          </IconButton>
          <IconButton size="small" onClick={addPlayerSeat} disabled={regularSeats.length >= 15}>
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
        {regularSeats.map((seat: any) => (
          <ListItem key={seat.seat}disablePadding>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Chip label={`#${seat.seat}`} size="small" sx={{ minWidth: 36 }} />
              <TextField
                size="small"
                fullWidth
                list="name-pool-list"
                placeholder={`Player ${seat.seat}`}
                value={seat.name}
                onChange={(e) => updateSeat(seat.seat, (s: any) => ({ ...s, name: e.target.value }))}
                onBlur={(e) => handleNameBlur(seat.seat, e.target.value)}
              />
            </Box>
          </ListItem>
        ))}
      </List>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="subtitle2">
          {language === 'zh' ? '旅人' : 'Travelers'}: {travelerSeats.length}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={removeLastTraveler} disabled={travelerSeats.length === 0}>
            <RemoveIcon />
          </IconButton>
          <IconButton size="small" onClick={addTravelerSeat}>
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      {travelerSeats.length > 0 && (
        <List dense sx={{ maxHeight: 120, overflow: 'auto' }}>
          {travelerSeats.map((seat: any) => (
            <ListItem key={seat.seat} disablePadding>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Chip label={`✈ #${seat.seat}`} size="small" color="info" sx={{ minWidth: 48 }} />
                <TextField
                  size="small"
                  fullWidth
                  list="name-pool-list"
                  placeholder={`Traveler ${seat.seat}`}
                  value={seat.name}
                  onChange={(e) => updateSeat(seat.seat, (s: any) => ({ ...s, name: e.target.value }))}
                />
              </Box>
            </ListItem>
          ))}
        </List>
      )}

      <datalist id="name-pool-list">
        {playerNamePool.map((name: string) => <option key={name} value={name} />)}
      </datalist>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 1 }}>
        <Button variant="outlined" onClick={resetSeatNames}>{text.resetNames}</Button>
        <Button variant="contained" onClick={() => setShowEditPlayersModal(false)}>
          {language === 'zh' ? '完成' : 'Done'}
        </Button>
      </Box>
    </Box>
  )
}