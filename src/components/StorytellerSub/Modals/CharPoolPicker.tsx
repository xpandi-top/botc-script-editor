import { useMemo } from 'react'
import { Box, Typography, Chip } from '@mui/material'
import type { ChipProps } from '@mui/material'
import { getCharacterById, getDisplayName, getIconForCharacter } from '../../../catalog'
import { makeT } from '../../../lib/t'
import type { Language } from '../../../types'

export const TEAM_ORDER = ['townsfolk', 'outsider', 'minion', 'demon'] as const
export type TeamKey = typeof TEAM_ORDER[number]
export const TEAM_COLORS: Record<TeamKey, ChipProps['color']> = { townsfolk: 'primary', outsider: 'info', minion: 'error', demon: 'error' }

/**
 * Restricts random character assignment to a chosen subset of the active
 * script's characters. Selecting nothing (empty pool) means "no restriction,
 * use the whole script" — the convention randomAssignCharacters relies on.
 */
export function CharPoolPicker({ scriptChars, selected, onChange, language }: {
  scriptChars: string[]
  selected: string[]
  onChange: (ids: string[]) => void
  language: Language
}) {
  const t = makeT(language)
  const byTeam = useMemo((): Record<TeamKey, string[]> => {
    const map: Record<TeamKey, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] }
    for (const id of scriptChars) {
      const ch = getCharacterById(id)
      if (ch && TEAM_ORDER.includes(ch.team as TeamKey)) map[ch.team as TeamKey].push(id)
    }
    return map
  }, [scriptChars])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }
  const toggleTeam = (team: TeamKey) => {
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
                label={t(team)}
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
                    avatar={icon ? <Box component="img" src={icon} alt="" sx={{ width: 16, height: 16, borderRadius: '50%' }} /> : undefined}
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
