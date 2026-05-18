import { useState } from 'react'
import { Box, Chip, Typography } from '@mui/material'
import { getIconForCharacter } from '../../catalog'
import { SCRIPT_TAG_META } from '../tabs/ScriptsTab.constants'
import type { EditableScript, Language } from '../../types'

// Edition badge
const EDITION_LABELS: Record<string, { en: string; zh: string; color: string }> = {
  tb:     { en: 'TB',  zh: 'TB',  color: '#1565c0' },
  bmr:    { en: 'BMR', zh: 'BMR', color: '#6a1b9a' },
  snv:    { en: 'S&V', zh: 'S&V', color: '#2e7d32' },
  custom: { en: 'DIY', zh: '自制', color: '#c45c2e' },
}

// ── Character collage ─────────────────────────────────────────────────────────

function CharCollage({ charIds }: { charIds: string[] }) {
  const icons = charIds.slice(0, 9).map((id) => ({
    id,
    src: getIconForCharacter(id),
  }))

  if (icons.length === 0) return (
    <Box sx={{
      width: '100%', aspectRatio: '16/7',
      bgcolor: 'action.disabledBackground',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>—</Typography>
    </Box>
  )

  return (
    <Box sx={{
      width: '100%', aspectRatio: '16/7',
      display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start',
      overflow: 'hidden', bgcolor: 'background.default',
      p: '6px', gap: '4px',
    }}>
      {icons.map(({ id, src }) =>
        src ? (
          <Box key={id} component="img" src={src} alt="" sx={{
            width: 34, height: 34, borderRadius: '50%', objectFit: 'cover',
            flexShrink: 0,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
          }} />
        ) : (
          <Box key={id} sx={{
            width: 34, height: 34, borderRadius: '50%',
            bgcolor: 'action.disabledBackground', flexShrink: 0,
          }} />
        )
      )}
    </Box>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

type Props = {
  script: EditableScript
  isActive: boolean
  isBuiltIn: boolean
  language: Language
  onSelect: () => void
}

export function MasonryScriptCard({ script, isActive, isBuiltIn, language, onSelect }: Props) {
  const zh = language === 'zh'
  const [imgErr, setImgErr] = useState(false)
  const title = zh && script.titleZh ? script.titleZh : script.title

  const logo = script.meta?.logo
  const showLogo = !!logo && !imgErr

  const editionKey = script.edition?.toLowerCase() ?? ''
  const editionMeta = EDITION_LABELS[editionKey] ?? (!isBuiltIn ? EDITION_LABELS['custom'] : undefined)

  const tags = script.tags ?? []

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        border: '2px solid',
        borderColor: isActive ? 'primary.main' : 'divider',
        bgcolor: 'background.paper',
        boxShadow: isActive
          ? '0 0 0 3px rgba(99,102,241,0.25)'
          : '0 1px 4px rgba(0,0,0,0.18)',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
        '&:hover': {
          borderColor: isActive ? 'primary.main' : 'primary.light',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      {/* ── Header image / collage ── */}
      {showLogo ? (
        <Box
          component="img"
          src={logo}
          alt=""
          onError={() => setImgErr(true)}
          sx={{
            width: '100%',
            aspectRatio: '16/7',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <CharCollage charIds={script.characters} />
      )}

      {/* ── Info bar ── */}
      <Box sx={{ px: 1.25, py: 1, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        {/* Title row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, minWidth: 0 }}>
          <Typography sx={{
            flex: 1, fontSize: '0.9rem', fontWeight: isActive ? 700 : 600,
            lineHeight: 1.3, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            color: 'text.primary',
          }}>
            {title}
          </Typography>
          {editionMeta && (
            <Chip label={zh ? editionMeta.zh : editionMeta.en} size="small" sx={{
              height: 16, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, mt: '2px',
              bgcolor: editionMeta.color + '22', color: editionMeta.color,
              border: `1px solid ${editionMeta.color}44`,
              '& .MuiChip-label': { px: '5px' },
            }} />
          )}
        </Box>

        {/* Author + meta row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          {script.author && (
            <Typography sx={{
              fontSize: '0.72rem', color: 'text.secondary', flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {script.author}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
            {script.version && (
              <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', fontFamily: 'monospace' }}>
                v{script.version}
              </Typography>
            )}
            {script.characters.length > 0 && (
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
                {script.characters.length}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Tags */}
        {tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', mt: 0.25 }}>
            {tags.slice(0, 4).map((tag) => {
              const meta = SCRIPT_TAG_META[tag]
              const color = meta?.color ?? '#9e9e9e'
              return (
                <Chip key={tag}
                  label={meta ? (zh ? meta.zh : meta.en) : tag}
                  size="small"
                  sx={{
                    height: 16, fontSize: '0.58rem', fontWeight: 600,
                    bgcolor: color + '22', color, border: `1px solid ${color}44`,
                    '& .MuiChip-label': { px: '5px' },
                  }} />
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )
}
