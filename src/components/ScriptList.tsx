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
        border: '1px solid',
        borderColor: isActive ? 'primary.main' : 'divider',
        borderRadius: 2,
        bgcolor: isActive ? 'action.selected' : 'background.paper',
        textTransform: 'none',
        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: 'primary.light',
          boxShadow: 2,
        },
      }}
    >
      <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
    </Button>
  )
}