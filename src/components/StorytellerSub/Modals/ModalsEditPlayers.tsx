// @ts-nocheck
import type { StorytellerSeat } from '../types'
import type { StorytellerContext } from '../useStoryteller'
import React, { useState } from 'react'
import { Box, Button, TextField, IconButton, Typography, Paper, List, ListItem, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { uniqueStrings } from '../constants'
import { useT } from '../../../context/I18nContext'

export function ModalsEditPlayers({ ctx }: { ctx: StorytellerContext }) {
  const {
    language, text, currentDay, updateCurrentDay, updateSeat,
    playerNamePool, setPlayerNamePool, editPlayersPreset, setEditPlayersPreset,
    removeLastPlayerSeat, addPlayerSeat, removeLastTraveler, addTravelerSeat,
    resetSeatNames, setShowEditPlayersModal,
    gameRecords, setGameRecords,
  } = ctx

  // Pending rename confirmation: { seatNum, oldName, newName }
  const { t, tpl } = useT()
  const [pendingRename, setPendingRename] = useState<{ seatNum: number; oldName: string; newName: string } | null>(null)

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

  const handleNameBlur = (seatNum: number, newValue: string) => {
    const newName = newValue.trim()
    if (!newName) return
    // Add to pool
    if (!newName.match(/^Player \d+$/) && !playerNamePool.includes(newName)) {
      setPlayerNamePool((cur: string[]) => [...cur, newName])
    }
    // Find old name from current state
    const seat = currentDay.seats.find((s: any) => s.seat === seatNum)
    const oldName = seat?.name ?? ''
    if (oldName && oldName !== newName && gameRecords?.length > 0) {
      // Check if any saved records contain the old name
      const affected = gameRecords.filter((r: any) =>
        r.playerSummaries?.some((ps: any) => ps.name === oldName)
      )
      if (affected.length > 0) {
        setPendingRename({ seatNum, oldName, newName })
      }
    }
  }

  const applyRenameToRecords = () => {
    if (!pendingRename) return
    const { oldName, newName } = pendingRename
    setGameRecords((records: any[]) =>
      records.map((r: any) => ({
        ...r,
        playerSummaries: r.playerSummaries?.map((ps: any) =>
          ps.name === oldName ? { ...ps, name: newName } : ps
        ),
        // Also update mvp seat name reference isn't needed (mvp stored as seat number)
      }))
    )
    // Update pool: replace old name with new
    setPlayerNamePool((cur: string[]) => {
      const filtered = cur.filter((n: string) => n !== oldName)
      return uniqueStrings([...filtered, newName])
    })
    setPendingRename(null)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('batch_load')}</Typography>
        <TextField
          size="small"
          fullWidth
          multiline
          rows={2}
          placeholder={t('alice_bob_charlie')}
          value={editPlayersPreset}
          onChange={(e) => setEditPlayersPreset(e.target.value)}
        />
        <Button size="small" onClick={handleLoadPreset} sx={{ mt: 1 }}>{text.loadPreset}</Button>
      </Paper>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2">
          {t('players')}: {regularSeats.length}
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
          <ListItem key={seat.seat} disablePadding>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Chip label={`#${seat.seat}`} size="small" sx={{ minWidth: 52, flexShrink: 0 }} />
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
          {t('traveler')}: {travelerSeats.length}
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
                <Chip label={`✈ #${seat.seat}`} size="small" color="info" sx={{ minWidth: 64, flexShrink: 0 }} />
                <TextField
                  size="small"
                  fullWidth
                  list="name-pool-list"
                  placeholder={`Traveler ${seat.seat}`}
                  value={seat.name}
                  onChange={(e) => updateSeat(seat.seat, (s: any) => ({ ...s, name: e.target.value }))}
                  onBlur={(e) => handleNameBlur(seat.seat, e.target.value)}
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
          {t('done')}
        </Button>
      </Box>

      {/* Rename propagation dialog */}
      <Dialog open={!!pendingRename} onClose={() => setPendingRename(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('update_saved_records')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {tpl(
              'rename_player_in_n_records',
              pendingRename?.oldName ?? '',
              pendingRename?.newName ?? '',
              gameRecords?.filter((r: any) => r.playerSummaries?.some((ps: any) => ps.name === pendingRename?.oldName)).length ?? 0
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingRename(null)}>
            {t('this_game_only')}
          </Button>
          <Button variant="contained" onClick={applyRenameToRecords}>
            {t('update_all')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
