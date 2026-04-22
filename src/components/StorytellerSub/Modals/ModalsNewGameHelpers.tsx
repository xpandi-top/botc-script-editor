// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react'
import { Box, Button, TextField, FormControl, Select, MenuItem, Typography, Chip, IconButton, Paper, InputLabel } from '@mui/material'
import { getDisplayName, getIconForCharacter, characterById } from '../../../catalog'
import { CHARACTER_DISTRIBUTION } from '../constants'

export function TeamDot({ team }: { team: string | null | undefined }) {
  if (!team) return null
  const color = team === 'minion' || team === 'demon' ? 'error' : team === 'townsfolk' || team === 'outsider' ? 'primary' : 'default'
  return <Chip size="small" label={team} color={color as any} sx={{ height: 20, fontSize: '0.65rem' }} />
}

export function DistRow({ label, counts, calc }: {
  label: string
  counts: { townsfolk: number; outsider: number; minion: number; demon: number }
  calc?: typeof counts
}) {
  const match = (k: keyof typeof counts) => calc && counts[k] === calc[k]
  const keys = ['townsfolk', 'outsider', 'minion', 'demon'] as const
  const colors = ['primary', 'info', 'error', 'error'] as const
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="caption" sx={{ width: 40 }}>{label}</Typography>
      {keys.map((k, i) => (
        <Chip 
          key={k} 
          size="small" 
          label={counts[k]} 
          color={colors[i]} 
          variant={calc && !match(k) ? 'outlined' : 'filled'}
          sx={{ width: 28, height: 22, fontSize: '0.7rem' }}
        />
      ))}
    </Box>
  )
}

export function CharSelect({ value, options, language, onChange, placeholder }: {
  value: string
  options: string[]
  language: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const selectedIcon = value ? getIconForCharacter(value) : null
  const displayName = value ? getDisplayName(value, language) : (placeholder ?? '—')

  return (
    <Box ref={ref} sx={{ position: 'relative' }}>
      <Button 
        size="small" 
        variant="outlined"
        onClick={() => setOpen((v) => !v)}
        sx={{ display: 'flex', gap: 0.5, minWidth: 100, justifyContent: 'flex-start' }}
      >
        {selectedIcon ? (
          <Box component="img" src={selectedIcon} alt={value} sx={{ width: 18, height: 18 }} />
        ) : (
          <Box sx={{ width: 18, height: 18, border: '1px dashed', borderRadius: '50%', opacity: 0.3 }} />
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
        <span style={{ marginLeft: 'auto' }}>▾</span>
      </Button>

      {open && (
        <Paper 
          elevation={8} 
          sx={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            zIndex: 100, 
            maxHeight: 250, 
            overflow: 'auto',
            minWidth: 150,
            mt: 0.5,
          }}
        >
          <Box sx={{ p: 0.5 }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 0.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => { onChange(''); setOpen(false) }}
            >
              <Box sx={{ width: 18, height: 18, border: '1px dashed', borderRadius: '50%', opacity: 0.3 }} />
              <span>{placeholder ?? '—'}</span>
            </Box>
            {options.map((id) => {
              const icon = getIconForCharacter(id)
              const name = getDisplayName(id, language)
              const ch = characterById[id]
              return (
                <Box 
                  key={id}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5, 
                    p: 0.5, 
                    cursor: 'pointer', 
                    bgcolor: value === id ? 'primary.light' : 'transparent',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => { onChange(id); setOpen(false) }}
                >
                  {icon ? (
                    <Box component="img" src={icon} alt={id} sx={{ width: 18, height: 18 }} />
                  ) : (
                    <Box sx={{ width: 18, height: 18, border: '1px dashed', borderRadius: '50%', opacity: 0.3 }} />
                  )}
                  <span>{name}</span>
                  {ch?.team && <Chip size="small" label={ch.team} color={ch.team === 'townsfolk' || ch.team === 'outsider' ? 'primary' : 'error'} sx={{ height: 16, fontSize: '0.6rem', ml: 'auto' }} />}
                </Box>
              )
            })}
          </Box>
        </Paper>
      )}
    </Box>
  )
}