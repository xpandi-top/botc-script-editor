import { Box, Chip, Typography } from '@mui/material'
import { SCRIPT_TAG_META } from '../tabs/ScriptsTab.constants'
import type { EditableScript, Language } from '../../types'

// Edition badge labels
const EDITION_LABELS: Record<string, { en: string; zh: string; color: string }> = {
  tb:     { en: 'TB',  zh: 'TB',  color: '#1565c0' },
  bmr:    { en: 'BMR', zh: 'BMR', color: '#6a1b9a' },
  snv:    { en: 'S&V', zh: 'S&V', color: '#2e7d32' },
  custom: { en: 'DIY', zh: '自制', color: '#c45c2e' },
}

type Props = {
  script: EditableScript
  isActive: boolean
  isBuiltIn: boolean
  language: Language
  onSelect: () => void
}

export function ScriptCard({ script, isActive, isBuiltIn, language,
  onSelect,
}: Props) {
  const zh = language === 'zh'
  const title = language === 'zh' && script.titleZh ? script.titleZh : script.title

  // Determine edition badge:
  // - Known edition (tb/bmr/snv) → show that badge
  // - DIY script (!isBuiltIn) with no recognized edition → show "DIY"/"自制"
  // - Built-in community scripts with unrecognized edition → no badge
  const editionKey = script.edition?.toLowerCase() ?? ''
  const editionMeta = EDITION_LABELS[editionKey] ?? (!isBuiltIn ? EDITION_LABELS['custom'] : undefined)

  // Tag dots (first 3)
  const tags = script.tags ?? []

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        px: 1,
        py: '6px',
        minHeight: 42,
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
      {/* Row 1: tag dots + title + version + edition badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        {/* Tag color dots */}
        {tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
            {tags.slice(0, 3).map((tag) => {
              const color = SCRIPT_TAG_META[tag]?.color ?? '#9e9e9e'
              return (
                <Box key={tag} title={tag} sx={{
                  width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0,
                }} />
              )
            })}
          </Box>
        )}

        {/* Title */}
        <Typography variant="body2" sx={{
          fontWeight: isActive ? 700 : 500,
          fontSize: '0.85rem',
          flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: 'text.primary', lineHeight: 1.35,
        }}>
          {title}
        </Typography>

        {/* Version chip */}
        {script.version && (
          <Typography variant="caption" sx={{
            color: 'text.disabled', fontFamily: 'monospace', fontSize: '0.65rem', flexShrink: 0,
          }}>
            v{script.version}
          </Typography>
        )}

        {/* Edition badge */}
        {editionMeta && (
          <Chip
            label={zh ? editionMeta.zh : editionMeta.en}
            size="small"
            sx={{
              height: 14, fontSize: '0.58rem', fontWeight: 700, flexShrink: 0,
              bgcolor: editionMeta.color + '22',
              color: editionMeta.color,
              border: `1px solid ${editionMeta.color}44`,
              '& .MuiChip-label': { px: '4px' },
            }}
          />
        )}
      </Box>

      {/* Row 2: author + char count */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        {script.author && (
          <Typography variant="caption" sx={{
            color: 'text.secondary', fontSize: '0.68rem', flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
          }}>
            {script.author}
          </Typography>
        )}

        {/* Total char count */}
        {script.characters.length > 0 && (
          <Typography variant="caption" sx={{
            color: 'text.disabled', fontSize: '0.65rem', flexShrink: 0, lineHeight: 1,
          }}>
            {script.characters.length}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
