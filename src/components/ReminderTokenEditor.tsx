import { useState } from 'react'
import { Box, Button, Chip, TextField, Typography } from '@mui/material'

interface Props {
  label: string
  hint?: string
  tokens: string[]
  onChange: (tokens: string[]) => void
}

export function ReminderTokenEditor({ label, hint, tokens, onChange }: Props) {
  const [input, setInput] = useState('')

  const addToken = () => {
    const t = input.trim()
    if (!t || tokens.includes(t)) { setInput(''); return }
    onChange([...tokens, t])
    setInput('')
  }

  const removeToken = (t: string) => onChange(tokens.filter((x) => x !== t))

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {label}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.75, fontStyle: 'italic' }}>
          {hint}
        </Typography>
      )}
      {tokens.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {tokens.map((t) => (
            <Chip key={t} label={t} size="small" variant="outlined" onDelete={() => removeToken(t)} />
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addToken() } }}
          placeholder={tokens.length === 0 ? 'e.g. Poisoned' : 'Add another…'}
          sx={{ flex: 1 }}
        />
        <Button size="small" variant="outlined" onClick={addToken} disabled={!input.trim()}>
          Add
        </Button>
      </Box>
    </Box>
  )
}
