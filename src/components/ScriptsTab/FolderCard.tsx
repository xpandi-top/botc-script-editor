import { Box, Chip, Typography } from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import type { EditableScript, Language, ScriptFolder } from '../../types'

type Props = {
  folder: ScriptFolder
  scripts: EditableScript[]
  language: Language
  onOpen: () => void
}

export function FolderCard({ folder, scripts, language, onOpen }: Props) {
  const zh = language === 'zh'
  const preview = scripts.slice(0, 5)

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen() }}
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        border: '2px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      {/* ── Header ── */}
      <Box sx={{
        px: 1.5, pt: 1.25, pb: 0.75,
        display: 'flex', alignItems: 'center', gap: 0.75,
        borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <FolderOpenIcon sx={{ color: 'warning.main', fontSize: 20, flexShrink: 0 }} />
        <Typography sx={{
          fontWeight: 700, fontSize: '0.9rem', flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {folder.name}
        </Typography>
        <Chip
          size="small"
          label={scripts.length}
          sx={{
            height: 18, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
            '& .MuiChip-label': { px: '6px' },
          }}
        />
      </Box>

      {/* ── Script preview list ── */}
      <Box sx={{ px: 1.5, py: 1, flex: 1 }}>
        {scripts.length === 0 ? (
          <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', fontStyle: 'italic' }}>
            {zh ? '（空文件夹）' : '(empty folder)'}
          </Typography>
        ) : (
          <>
            {preview.map((s) => (
              <Box key={s.slug} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: '1px' }}>
                <Box sx={{
                  width: 4, height: 4, borderRadius: '50%',
                  bgcolor: 'text.disabled', flexShrink: 0,
                }} />
                <Typography sx={{
                  fontSize: '0.7rem', color: 'text.secondary',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: 1.55,
                }}>
                  {(zh && s.titleZh) ? s.titleZh : s.title}
                </Typography>
              </Box>
            ))}
            {scripts.length > 5 && (
              <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', mt: 0.5, fontStyle: 'italic' }}>
                +{scripts.length - 5} {zh ? '更多…' : 'more…'}
              </Typography>
            )}
          </>
        )}
      </Box>
    </Box>
  )
}
