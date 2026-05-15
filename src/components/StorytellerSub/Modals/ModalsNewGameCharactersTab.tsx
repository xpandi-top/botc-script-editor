// @ts-nocheck
import React, { useMemo, useState } from 'react'
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Typography, Paper, Divider, Grid, Chip, Collapse, IconButton, Tooltip } from '@mui/material'
import CasinoIcon from '@mui/icons-material/Casino'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import ReplayIcon from '@mui/icons-material/Replay'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ClearAllIcon from '@mui/icons-material/ClearAll'
import { characterById, getCharacterById, allCharacters, getDisplayName, getIconForCharacter } from '../../../catalog'
import { makeT, makeTpl } from '../../../lib/t'
import { CHARACTER_DISTRIBUTION } from '../constants'
import { CharSelect, TeamDot, DistRow } from './ModalsNewGameHelpers'

const TEAM_ORDER = ['townsfolk', 'outsider', 'minion', 'demon'] as const
const TEAM_COLORS: Record<string, any> = { townsfolk: 'primary', outsider: 'info', minion: 'error', demon: 'error' }

type Props = {
  newGamePanel: any
  scriptOptions: any[]
  language: string
  updateConfig: (patch: any) => void
  randomAssignCharacters: (config: any) => Record<number, string>
}

// ── Character pool multi-picker ───────────────────────────────────────────────
function CharPoolPicker({ scriptChars, selected, onChange, language }: {
  scriptChars: string[]
  selected: string[]
  onChange: (ids: string[]) => void
  language: string
}) {
  const zh = language === 'zh'
  const t = makeT(language)
  const byTeam = useMemo(() => {
    const map: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] }
    for (const id of scriptChars) {
      const ch = getCharacterById(id)
      if (ch && map[ch.team]) map[ch.team].push(id)
    }
    return map
  }, [scriptChars])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }
  const toggleTeam = (team: string) => {
    const ids = byTeam[team] ?? []
    const allOn = ids.every((id) => selected.includes(id))
    if (allOn) onChange(selected.filter((x) => !ids.includes(x)))
    else onChange([...new Set([...selected, ...ids])])
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {TEAM_ORDER.map((team) => {
        const ids = byTeam[team]
        if (!ids?.length) return null
        const teamAllOn = ids.every((id) => selected.includes(id))
        return (
          <Box key={team}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Chip
                size="small"
                label={t(team as any)}
                color={TEAM_COLORS[team]}
                variant={teamAllOn ? 'filled' : 'outlined'}
                onClick={() => toggleTeam(team)}
                sx={{ cursor: 'pointer', fontSize: '0.65rem', height: 20 }}
              />
              <Typography variant="caption" color="text.disabled">{ids.length}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {ids.map((id) => {
                const icon = getIconForCharacter(id)
                const name = getDisplayName(id, language)
                const on = selected.includes(id)
                return (
                  <Chip
                    key={id}
                    size="small"
                    onClick={() => toggle(id)}
                    avatar={icon ? <Box component="img" src={icon} sx={{ width: 16, height: 16, borderRadius: '50%' }} /> : undefined}
                    label={name}
                    color={TEAM_COLORS[team]}
                    variant={on ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer', fontSize: '0.72rem', opacity: on ? 1 : 0.55 }}
                  />
                )
              })}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

// ── All traveler characters ────────────────────────────────────────────────────
const TRAVELER_CHARS = allCharacters.filter((c) => c.team === 'traveler').map((c) => c.id)

// ── Main tab ──────────────────────────────────────────────────────────────────
export function CharactersTab({ newGamePanel, scriptOptions = [], language, updateConfig, randomAssignCharacters }: Props) {
  const zh = language === 'zh'
  const t = makeT(language)
  const tpl = makeTpl(language)
  const [poolOpen, setPoolOpen] = useState(false)

  const script = scriptOptions?.find((s: any) => s.slug === newGamePanel?.scriptSlug)
  const scriptChars: string[] = script?.characters ?? []

  const calcDist = CHARACTER_DISTRIBUTION[newGamePanel?.playerCount] ?? { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
  const charPool: string[] = newGamePanel?.charPool ?? []

  const actCounts = useMemo(() => {
    const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    Object.values(newGamePanel?.assignments ?? {}).forEach((cid: any) => {
      const ch = getCharacterById(cid); if (ch && c[ch.team as keyof typeof c] !== undefined) c[ch.team as keyof typeof c]++
    })
    return c
  }, [newGamePanel?.assignments])

  const userCounts = useMemo(() => {
    const c = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 }
    Object.values(newGamePanel?.userAssignments ?? {}).forEach((cid: any) => {
      if (!cid) return; const ch = getCharacterById(cid); if (ch && c[ch.team as keyof typeof c] !== undefined) c[ch.team as keyof typeof c]++
    })
    return c
  }, [newGamePanel?.userAssignments])

  // Characters eligible as demon bluffs: not currently assigned to any seat.
  // Prefer script characters; fall back to ALL townsfolk/outsider from catalog
  // so tight custom scripts never show an empty bluff picker.
  const availableBluffs = useMemo(() => {
    const assigned = new Set<string>(Object.values(newGamePanel?.assignments ?? {}))
    const scriptAvail = scriptChars.filter((id: string) => !assigned.has(id))
    if (scriptAvail.length >= 3) return scriptAvail
    // Supplement with all catalog townsfolk/outsider not in play
    const catalogFallback = allCharacters
      .filter((c) => (c.team === 'townsfolk' || c.team === 'outsider') && !assigned.has(c.id))
      .map((c) => c.id)
    return [...new Set([...scriptAvail, ...catalogFallback])]
  }, [scriptChars, newGamePanel?.assignments])

  // Per-slot options: exclude characters already picked in the other two slots.
  // Always include the slot's own current value so it stays visible after close/reopen.
  const bluffSlotOptions = useMemo(() => {
    const currentBluffs: string[] = newGamePanel?.demonBluffs ?? []
    return [0, 1, 2].map((idx) => {
      const others = new Set(currentBluffs.filter((id, i) => i !== idx && !!id))
      const filtered = availableBluffs.filter((id) => !others.has(id))
      const currentVal = currentBluffs[idx]
      if (currentVal && !filtered.includes(currentVal)) {
        return [currentVal, ...filtered]
      }
      return filtered
    })
  }, [availableBluffs, newGamePanel?.demonBluffs])

  const handleScriptChange = (slug: string) => {
    updateConfig({ scriptSlug: slug })
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

  const quickFillBluffs = () => {
    // Pick 3 unique townsfolk/outsider from availableBluffs at random
    const pool = availableBluffs.filter((id) => {
      const ch = getCharacterById(id)
      return ch && (ch.team === 'townsfolk' || ch.team === 'outsider')
    })
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, 3)
    // Pad to 3 with empty strings if fewer available
    while (picked.length < 3) picked.push('')
    updateConfig({ demonBluffs: picked })
  }

  const setTravelerAssignment = (sNum: number, cid: string) => {
    updateConfig({ travelerAssignments: { ...(newGamePanel.travelerAssignments ?? {}), [sNum]: cid } })
  }

  const travelerSeats = Array.from(
    { length: newGamePanel?.travelerCount ?? 0 },
    (_, i) => (newGamePanel?.playerCount ?? 0) + i + 1
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl size="small" fullWidth>
        <InputLabel>{t('script')}</InputLabel>
        <Select value={newGamePanel.scriptSlug || ''} onChange={(e) => handleScriptChange(e.target.value)} label={t('script')}>
          {scriptOptions.map((s: any) => (
            <MenuItem key={s.slug} value={s.slug}>
              {s.title}
              {s.version && (
                <Typography component="span" variant="caption" sx={{ ml: 0.75, color: 'text.secondary', fontFamily: 'monospace' }}>
                  v{s.version}
                </Typography>
              )}
            </MenuItem>
          ))}
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
        <DistRow label={t('calculated')} counts={calcDist} />
        <DistRow label={t('actual_short')} counts={actCounts} calc={calcDist} />
        <DistRow label={t('perceived_character')} counts={userCounts} calc={calcDist} />
      </Paper>

      {/* ── Character pool section ── */}
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" fontWeight={600}>
              {t('random_pool')}
            </Typography>
            {charPool.length > 0 && (
              <Chip size="small" label={charPool.length} color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {charPool.length > 0 && (
              <Tooltip title={t('clear_pool')}>
                <IconButton size="small" onClick={() => updateConfig({ charPool: [] })}>
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={() => setPoolOpen((v) => !v)}>
              {poolOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>
        <Collapse in={poolOpen}>
          <Box sx={{ mt: 1 }}>
            {scriptChars.length === 0 ? (
              <Typography variant="caption" color="text.disabled">{t('select_script_first')}</Typography>
            ) : (
              <CharPoolPicker
                scriptChars={scriptChars}
                selected={charPool}
                onChange={(ids) => updateConfig({ charPool: ids })}
                language={language}
              />
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* ── Action buttons ── */}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => updateConfig({ assignments: randomAssignCharacters(newGamePanel) })}
          startIcon={<CasinoIcon fontSize="small" />}
        >
          {charPool.length > 0
            ? tpl('random_pool_n', charPool.length)
            : t('random_pool')}
        </Button>
        <Button size="small" variant="outlined" onClick={() => updateConfig({ assignments: {}, userAssignments: {}, demonBluffs: [] })} startIcon={<ReplayIcon fontSize="small" />}>
          {t('reset')}
        </Button>
      </Box>

      <Divider />

      {/* ── Player seat assignments ── */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: newGamePanel?.playerCount ?? 0 }, (_, i) => i + 1).map((sNum) => {
          const cid = newGamePanel?.assignments?.[sNum] ?? ''
          const ch = getCharacterById(cid)
          const userCid = newGamePanel?.userAssignments?.[sNum]
          const hasUserOverride = userCid !== undefined && userCid !== null

          return (
            <Box key={sNum} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Seat number only — no player name text */}
              <Typography variant="body2" sx={{ width: 32, flexShrink: 0, fontWeight: 700, color: 'text.secondary' }}>
                #{sNum}
              </Typography>
              <CharSelect value={cid} options={scriptChars} language={language} onChange={(id) => setActual(sNum, id)} />
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
                  <CharSelect value={userCid ?? ''} options={scriptChars} language={language} placeholder={t('perceived_character')} onChange={(id) => setUserPerceived(sNum, id || null)} />
                  <TeamDot team={getCharacterById(userCid ?? '')?.team} />
                </>
              )}
              <TextField
                size="small"
                placeholder={t('note_placeholder')}
                value={newGamePanel?.seatNotes?.[sNum] ?? ''}
                onChange={(e) => updateConfig({ seatNotes: { ...newGamePanel?.seatNotes, [sNum]: e.target.value } })}
                sx={{ flex: 1 }}
              />
            </Box>
          )
        })}
      </Box>

      {/* ── Demon bluffs ── */}
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2">{t('demon_bluffs')}</Typography>
          <Tooltip title={t('random_fill_hint')}>
            <IconButton size="small" onClick={quickFillBluffs}>
              <ShuffleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[0, 1, 2].map((idx) => (
            <CharSelect key={idx} value={newGamePanel.demonBluffs?.[idx] ?? ''} options={bluffSlotOptions[idx]} language={language} placeholder={t('select_pick')} onChange={(id) => setBluff(idx, id)} />
          ))}
        </Box>
      </Paper>

      {/* ── Traveler assignments ── */}
      {travelerSeats.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Divider />
          <Typography variant="subtitle2">{t('traveler_assignments')}</Typography>
          {travelerSeats.map((sNum) => {
            const tcid = newGamePanel.travelerAssignments?.[sNum] ?? ''
            const tch = getCharacterById(tcid)
            return (
              <Box key={sNum} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ width: 40, flexShrink: 0, fontWeight: 700, color: 'text.secondary' }}>
                  ✈#{sNum}
                </Typography>
                <CharSelect
                  value={tcid}
                  options={TRAVELER_CHARS}
                  language={language}
                  placeholder={t('select_traveler')}
                  onChange={(id) => setTravelerAssignment(sNum, id)}
                />
                <TeamDot team={tch?.team} />
                <TextField
                  size="small"
                  fullWidth
                  placeholder={t('traveler_note')}
                  value={newGamePanel.seatNotes[sNum] ?? ''}
                  onChange={(e) => updateConfig({ seatNotes: { ...newGamePanel.seatNotes, [sNum]: e.target.value } })}
                />
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
