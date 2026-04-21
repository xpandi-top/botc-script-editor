// @ts-nocheck
import React, { useMemo } from 'react'
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography, Paper, Divider, Grid, Chip } from '@mui/material'
import { characterById } from '../../../catalog'
import { CHARACTER_DISTRIBUTION } from '../constants'
import { CharSelect, TeamDot, DistRow } from './ModalsNewGameHelpers'

type Props = {
  newGamePanel: any
  scriptOptions: any[]
  language: string
  updateConfig: (patch: any) => void
  randomAssignCharacters: (config: any) => Record<number, string>
}

export function CharactersTab({ newGamePanel, scriptOptions = [], language, updateConfig, randomAssignCharacters }: Props) {
  const script = scriptOptions?.find((s: any) => s.slug === newGamePanel?.scriptSlug)
  const calcDist = CHARACTER_DISTRIBUTION[newGamePanel?.playerCount] ?? { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }

  const actCounts = useMemo(() => {
    const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    Object.values(newGamePanel?.assignments ?? {}).forEach((cid: any) => {
      const ch = characterById[cid]; if (ch && c[ch.team as keyof typeof c] !== undefined) c[ch.team as keyof typeof c]++
    })
    return c
  }, [newGamePanel?.assignments])

  const userCounts = useMemo(() => {
    const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    Object.values(newGamePanel?.userAssignments ?? {}).forEach((cid: any) => {
      if (!cid) return; const ch = characterById[cid]; if (ch && c[ch.team as keyof typeof c] !== undefined) c[ch.team as keyof typeof c]++
    })
    return c
  }, [newGamePanel?.userAssignments])

  const availableBluffs = useMemo(() =>
    (script?.characters ?? []).filter((id: string) => !Object.values(newGamePanel?.assignments ?? {}).includes(id)),
    [script, newGamePanel?.assignments])

  const handleScriptChange = (slug: string) => {
    updateConfig({ scriptSlug: slug, assignments: {}, userAssignments: {}, demonBluffs: [] })
  }

  const setActual = (sNum: number, cid: string) => {
    const newUser = { ...newGamePanel.userAssignments }
    if (newUser[sNum] === newGamePanel.assignments[sNum] || newUser[sNum] === undefined) delete newUser[sNum]
    updateConfig({ assignments: { ...newGamePanel.assignments, [sNum]: cid }, userAssignments: newUser })
  }

  const setUserPerceived = (sNum: number, cid: string | null) => {
    updateConfig({ userAssignments: { ...newGamePanel.userAssignments, [sNum]: cid } })
  }

  const setBluff = (idx: number, cid: string) => {
    const bluffs = [...(newGamePanel.demonBluffs ?? []), '', '', ''].slice(0, 3)
    bluffs[idx] = cid
    updateConfig({ demonBluffs: bluffs })
  }

  const travelerSeats = Array.from({ length: newGamePanel?.travelerCount ?? 0 }, (_, i) => (newGamePanel?.playerCount ?? 0) + i + 1)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl size="small" fullWidth>
        <InputLabel>{language === 'zh' ? '剧本' : 'Script'}</InputLabel>
        <Select value={newGamePanel.scriptSlug || ''} onChange={(e) => handleScriptChange(e.target.value)} label={language === 'zh' ? '剧本' : 'Script'}>
          {scriptOptions.map((s: any) => <MenuItem key={s.slug} value={s.slug}>{s.title}</MenuItem>)}
        </Select>
      </FormControl>

      <Paper variant="outlined" sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ width: 40 }}></Typography>
          <Chip size="small" label="T" color="primary" sx={{ width: 28, height: 22 }} />
          <Chip size="small" label="O" color="info" sx={{ width: 28, height: 22 }} />
          <Chip size="small" label="M" color="error" sx={{ width: 28, height: 22 }} />
          <Chip size="small" label="D" color="error" sx={{ width: 28, height: 22 }} />
        </Box>
        <DistRow label={language === 'zh' ? '应有' : 'Calc'} counts={calcDist} />
        <DistRow label={language === 'zh' ? '实际' : 'Act'} counts={actCounts} calc={calcDist} />
        <DistRow label={language === 'zh' ? '感知' : 'User'} counts={userCounts} calc={calcDist} />
      </Paper>

      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Button size="small" variant="outlined" onClick={() => updateConfig({ assignments: randomAssignCharacters(newGamePanel) })}>
          🎲 {language === 'zh' ? '随机' : 'Random'}
        </Button>
        <Button size="small" variant="outlined" onClick={() => updateConfig({ assignments: {}, userAssignments: {}, demonBluffs: [] })}>
          ↺ {language === 'zh' ? '重置' : 'Reset'}
        </Button>
      </Box>

      <Divider />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: newGamePanel?.playerCount ?? 0 }, (_, i) => i + 1).map((sNum) => {
          const cid = newGamePanel?.assignments?.[sNum] ?? ''
          const ch = characterById[cid]
          const userCid = newGamePanel?.userAssignments?.[sNum]
          const hasUserOverride = userCid !== undefined && userCid !== null
          const userCh = hasUserOverride ? characterById[userCid ?? ''] : null
          const seatName = newGamePanel?.seatNames?.[sNum] || `#${sNum}`
          const chars = script?.characters ?? []

          return (
            <Box key={sNum} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ width: 50 }}>{seatName}</Typography>
              <CharSelect value={cid} options={chars} language={language} onChange={(id) => setActual(sNum, id)} />
              <TeamDot team={ch?.team} />
              <Button 
                size="small" 
                variant={hasUserOverride ? 'contained' : 'text'}
                onClick={() => hasUserOverride ? setUserPerceived(sNum, null) : setUserPerceived(sNum, cid || null)}
                sx={{ minWidth: 28, p: 0.5 }}
              >
                {hasUserOverride ? '👁' : '='}
              </Button>
              {hasUserOverride && (
                <>
                  <CharSelect value={userCid ?? ''} options={chars} language={language} placeholder={language === 'zh' ? '感知角色…' : 'User char…'} onChange={(id) => setUserPerceived(sNum, id || null)} />
                  <TeamDot team={userCh?.team} />
                </>
              )}
              <TextField
                size="small"
                placeholder={language === 'zh' ? '备注…' : 'Note…'}
                value={newGamePanel?.seatNotes?.[sNum] ?? ''}
                onChange={(e) => updateConfig({ seatNotes: { ...newGamePanel?.seatNotes, [sNum]: e.target.value } })}
                sx={{ flex: 1 }}
              />
            </Box>
          )
        })}
      </Box>

      <Paper variant="outlined" sx={{ p: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{language === 'zh' ? '恶魔虚张' : 'Demon Bluffs'}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[0, 1, 2].map((idx) => (
            <CharSelect key={idx} value={newGamePanel.demonBluffs?.[idx] ?? ''} options={availableBluffs} language={language} placeholder={language === 'zh' ? '选择…' : 'Pick…'} onChange={(id) => setBluff(idx, id)} />
          ))}
        </Box>
      </Paper>

      {travelerSeats.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Divider />
          <Typography variant="subtitle2">{language === 'zh' ? '旅人备注' : 'Traveler notes'}</Typography>
          {travelerSeats.map((sNum) => (
            <Box key={sNum} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ width: 60 }}>✈ {newGamePanel.seatNames[sNum] || `#${sNum}`}</Typography>
              <TextField
                size="small"
                fullWidth
                placeholder={language === 'zh' ? '旅人备注…' : 'Traveler note…'}
                value={newGamePanel.seatNotes[sNum] ?? ''}
                onChange={(e) => updateConfig({ seatNotes: { ...newGamePanel.seatNotes, [sNum]: e.target.value } })}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}