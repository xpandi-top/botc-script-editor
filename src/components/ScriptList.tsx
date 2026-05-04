import { Button, Typography } from '@mui/material'

type ScriptListProps = {
  title: string
  isActive: boolean
  onSelect: () => void
}

export function ScriptList({ title, isActive, onSelect }: ScriptListProps) {
  return (
    <Button
      onClick={onSelect}
      fullWidth
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        p: 1,
        border: isActive ? '1px solid' : '1px solid',
        borderColor: isActive ? 'primary.main' : 'rgba(23, 32, 42, 0.1)',
        borderRadius: 2,
        background: isActive ? 'linear-gradient(180deg, #fff6eb 0%, #fffdf8 100%)' : '#fffdf8',
        textTransform: 'none',
        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: 'rgba(133, 63, 34, 0.38)',
          boxShadow: '0 8px 24px rgba(57, 43, 24, 0.08)',
        },
      }}
    >
      <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
    </Button>
  )
}