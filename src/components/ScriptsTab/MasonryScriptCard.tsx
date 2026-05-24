import { useMemo, useState } from 'react'
import { Box, Chip, Typography } from '@mui/material'
import { getIconForCharacter } from '../../catalog'
import { SCRIPT_TAG_META } from '../tabs/ScriptsTab.constants'
import type { EditableScript, Language } from '../../types'

// ── Per-slug deterministic dark gradient ───────────────────────────────────────

const OFFICIAL_BG: Record<string, string> = {
  tb:  'linear-gradient(145deg, #1a2744 0%, #1e3060 50%, #243a80 100%)',
  bmr: 'linear-gradient(145deg, #260d40 0%, #3d1570 50%, #521a9a 100%)',
  snv: 'linear-gradient(145deg, #0c2218 0%, #143a25 50%, #1e5535 100%)',
}

const FALLBACK_GRADIENTS = [
  'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(145deg, #2d1b1b 0%, #4a2020 50%, #6b2828 100%)',
  'linear-gradient(145deg, #1a2d1a 0%, #1e3a1e 50%, #275c27 100%)',
  'linear-gradient(145deg, #2d1a2d 0%, #3d1f3d 50%, #522a52 100%)',
  'linear-gradient(145deg, #1a1f2d 0%, #1e2a3d 50%, #263a5c 100%)',
  'linear-gradient(145deg, #2d2a1a 0%, #3d381e 50%, #56502a 100%)',
  'linear-gradient(145deg, #1a2828 0%, #1e3535 50%, #265252 100%)',
]

function slugGradient(slug: string): string {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffffffff
  return FALLBACK_GRADIENTS[Math.abs(h) % FALLBACK_GRADIENTS.length]
}

// ── Dynamic title font size ───────────────────────────────────────────────────

function titleFontSize(s: string): string {
  const n = s.length
  if (n <= 6)  return '1.9rem'
  if (n <= 10) return '1.55rem'
  if (n <= 16) return '1.25rem'
  if (n <= 24) return '1.0rem'
  if (n <= 36) return '0.875rem'
  return '0.78rem'
}

// ── Character icon collage (background layer) ─────────────────────────────────

function CharCollage({ charIds, customIconMap }: {
  charIds: string[]
  customIconMap?: Map<string, string>
}) {
  const icons = charIds.slice(0, 14).map((id) => ({
    id,
    src: customIconMap?.get(id) ?? getIconForCharacter(id),
  })).filter(({ src }) => !!src)

  if (icons.length === 0) return null

  return (
    <Box sx={{
      position: 'absolute', inset: 0,
      display: 'flex', flexWrap: 'wrap',
      alignContent: 'flex-start', p: '8px', gap: '4px',
      overflow: 'hidden', pointerEvents: 'none',
    }}>
      {icons.map(({ id, src }) => (
        <Box
          key={id}
          component="img"
          src={src as string}
          alt=""
          sx={{
            width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
            flexShrink: 0, opacity: 0.28,
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
          }}
        />
      ))}
    </Box>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

type Props = {
  script: EditableScript
  isActive: boolean
  language: Language
  onSelect: () => void
}

export function MasonryScriptCard({ script, isActive, language, onSelect }: Props) {
  const zh = language === 'zh'
  const [imgErr, setImgErr] = useState(false)
  const title = (zh && script.titleZh) ? script.titleZh : script.title

  const customIconMap = useMemo(() => {
    if (!script.customCharacters.length) return undefined
    const map = new Map<string, string>()
    for (const c of script.customCharacters) {
      const img = Array.isArray(c.image) ? c.image[0] : c.image
      if (img) map.set(c.id, img)
    }
    return map.size > 0 ? map : undefined
  }, [script.customCharacters])

  const logo = script.meta?.logo
  const showLogo = !!logo && !imgErr

  const bgGradient = OFFICIAL_BG[script.slug] ?? slugGradient(script.slug)
  const tags = script.tags ?? []

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        cursor: 'pointer',
        userSelect: 'none',
        border: '2px solid',
        borderColor: isActive ? 'primary.main' : 'transparent',
        boxShadow: isActive
          ? '0 0 0 3px rgba(99,102,241,0.3), 0 4px 18px rgba(0,0,0,0.28)'
          : '0 2px 8px rgba(0,0,0,0.18)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: isActive
            ? '0 0 0 3px rgba(99,102,241,0.35), 0 10px 28px rgba(0,0,0,0.32)'
            : '0 8px 24px rgba(0,0,0,0.3)',
          borderColor: isActive ? 'primary.main' : 'primary.light',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 3,
        },
      }}
    >
      {/* ── Header: background image or styled gradient title ── */}
      <Box sx={{
        position: 'relative',
        height: 136,
        overflow: 'hidden',
        background: showLogo ? 'transparent' : bgGradient,
      }}>
        {showLogo ? (
          <>
            <Box
              component="img"
              src={logo}
              alt=""
              onError={() => setImgErr(true)}
              sx={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
              }}
            />
            {/* Gradient overlay for legibility */}
            <Box sx={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.72) 100%)',
            }} />
            {/* Title overlay */}
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1.5, pb: 1.25 }}>
              <Typography sx={{
                color: 'rgba(255,255,255,0.97)',
                fontSize: titleFontSize(title),
                fontWeight: 800,
                lineHeight: 1.2,
                textShadow: '0 1px 6px rgba(0,0,0,0.8)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {title}
              </Typography>
            </Box>
          </>
        ) : (
          <>
            {/* Faint character icon collage */}
            <CharCollage charIds={script.characters} customIconMap={customIconMap} />

            {/* Centered large title */}
            <Box sx={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              p: 2,
            }}>
              <Typography sx={{
                color: 'rgba(255,255,255,0.96)',
                fontSize: titleFontSize(title),
                fontWeight: 800,
                lineHeight: 1.2,
                textAlign: 'center',
                textShadow: '0 2px 10px rgba(0,0,0,0.6)',
                letterSpacing: title.length < 8 ? '0.03em' : 0,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {title}
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* ── Footer: author, count, tags ── */}
      <Box sx={{
        px: 1.5, pt: 0.85, pb: 1,
        bgcolor: 'background.paper',
        display: 'flex', flexDirection: 'column', gap: 0.45,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Typography sx={{
            flex: 1, fontSize: '0.72rem', color: 'text.secondary',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {script.author || ' '}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
            {script.version && (
              <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', fontFamily: 'monospace' }}>
                v{script.version}
              </Typography>
            )}
            {script.characters.length > 0 && (
              <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
                {zh ? `${script.characters.length}角` : `${script.characters.length}c`}
              </Typography>
            )}
          </Box>
        </Box>

        {tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
            {tags.slice(0, 3).map((tag) => {
              const meta = SCRIPT_TAG_META[tag]
              const color = meta?.color ?? '#9e9e9e'
              return (
                <Chip
                  key={tag}
                  label={meta ? (zh ? meta.zh : meta.en) : tag}
                  size="small"
                  sx={{
                    height: 16, fontSize: '0.58rem', fontWeight: 600,
                    bgcolor: color + '22', color,
                    border: `1px solid ${color}44`,
                    '& .MuiChip-label': { px: '5px' },
                  }}
                />
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )
}
