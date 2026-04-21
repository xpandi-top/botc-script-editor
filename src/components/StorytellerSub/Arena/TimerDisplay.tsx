import { Box, TextField, Button } from '@mui/material'
import { useState } from 'react'

interface TimerDisplayProps {
  seconds: number
  onChange: (newSeconds: number) => void
  label?: string
  color?: 'warning' | 'info' | 'default'
}

export function TimerDisplay({ seconds, onChange, label, color = 'default' }: TimerDisplayProps) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleEdit = () => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    setInput(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    setEditing(true)
  }

  const handleSave = () => {
    const parts = input.split(':')
    const m = parseInt(parts[0], 10) || 0
    const s = parseInt(parts[1], 10) || 0
    onChange(m * 60 + s)
    setEditing(false)
  }

  const handleCancel = () => {
    setEditing(false)
  }

  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <TextField
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          autoFocus
          placeholder="MM:SS"
          slotProps={{ input: { style: { fontSize: '1rem', fontWeight: 700, textAlign: 'center' } } }}
          sx={{ width: 75 }}
        />
        <Button size="small" variant="contained" onClick={handleSave} sx={{ minWidth: 28, px: 0.5, fontSize: '0.75rem' }}>
          ✓
        </Button>
        <Button size="small" variant="outlined" color="error" onClick={handleCancel} sx={{ minWidth: 28, px: 0.5, fontSize: '0.75rem' }}>
          ✕
        </Button>
      </Box>
    )
  }

  return (
    <Box 
      onClick={handleEdit}
      sx={{ 
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: '1.2rem',
        px: 1,
        py: 0.25,
        bgcolor: color === 'warning' ? 'warning.light' : color === 'info' ? 'info.light' : 'background.paper',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        letterSpacing: '0.05em',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        '&:hover': { bgcolor: 'action.hover' }
      }}
    >
      {label && <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{label}:</Box>}
      {formatTime(seconds)}
    </Box>
  )
}
