import { Box, Typography } from '@mui/material'
import { SCRIPT_TAG_META } from './tabs/ScriptsTab.constants'

type ScriptListProps = {
  title: string
  author?: string
  version?: string
  isActive: boolean
  onSelect: () => void
  tags?: string[]
}

export function ScriptList({ title, author, version, isActive, onSelect, tags }: ScriptListProps) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        py: '5px',
        minHeight: 34,
        borderRadius: 1.5,
        cursor: 'pointer',
        userSelect: 'none',
        bgcolor: isActive ? 'action.selected' : 'transparent',
        borderLeft: '3px solid',
        borderLeftColor: isActive ? 'primary.main' : 'transparent',
        '&:hover': { bgcolor: 'action.hover' },
        transition: 'background-color 0.1s',
      }}
    >
      {/* Tag color dots */}
      {tags && tags.length > 0 && (
        <Box sx={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
          {tags.slice(0, 3).map((tag) => {
            const color = SCRIPT_TAG_META[tag]?.color ?? '#9e9e9e'
            return (
              <Box key={tag} title={tag} sx={{
                width: 6, height: 6, borderRadius: '50%',
                bgcolor: color, flexShrink: 0,
              }} />
            )
          })}
        </Box>
      )}

      {/* Title + version */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.875rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'text.primary',
              lineHeight: 1.35,
            }}
          >
            {title}
          </Typography>
          {version && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem', flexShrink: 0 }}>
              v{version}
            </Typography>
          )}
        </Box>
        {author && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
            {author}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
