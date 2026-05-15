import { Box, Button, Chip, Typography } from '@mui/material'

type ScriptListProps = {
  title: string
  version?: string
  isActive: boolean
  onSelect: () => void
  tags?: string[]
}

export function ScriptList({ title, version, isActive, onSelect, tags }: ScriptListProps) {
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
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, width: '100%' }}>
        <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
        {version && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', flexShrink: 0 }}>
            v{version}
          </Typography>
        )}
      </Box>
      {tags && tags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.25 }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{ fontSize: '0.6rem', height: 16, '& .MuiChip-label': { px: 0.75 } }}
            />
          ))}
        </Box>
      )}
    </Button>
  )
}
