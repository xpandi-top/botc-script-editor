import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material'

interface StarRatingProps {
  label: string
  value: number | null
  onChange: (n: number) => void
}

export function StarRating({ label, value, onChange }: StarRatingProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
      <ToggleButtonGroup
        value={value ?? ''}
        exclusive
        onChange={(_, v) => v && onChange(v)}
        size="small"
      >
        {[1, 2, 3, 4, 5].map((num) => (
          <ToggleButton key={num} value={num} sx={{ borderRadius: 999, px: 2 }}>
            {num}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}