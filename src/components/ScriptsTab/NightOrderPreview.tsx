import { useMemo } from 'react'
import { Box, Collapse, Typography } from '@mui/material'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  getDisplayName,
  getEffectiveNightOrderFromRegistry,
  getIconForCharacter,
} from '../../catalog'
import type { EditableScript, Language } from '../../types'

// Placeholder token labels
const PLACEHOLDER_LABELS: Record<string, { en: string; zh: string }> = {
  MINION_INFO: { en: 'Minion Info', zh: '爪牙信息' },
  DEMON_INFO:  { en: 'Demon Info',  zh: '恶魔信息' },
}

// Fixed colors that work on both light/dark themes
const FIRST_NIGHT_COLOR  = '#5c85d6'   // steel blue — moon/night feel
const OTHER_NIGHT_COLOR  = '#d4882b'   // amber — recurring nights

function normalizeToken(id: string) {
  if (id === 'minioninfo') return 'MINION_INFO'
  if (id === 'demoninfo')  return 'DEMON_INFO'
  return id
}

type NightRowProps = {
  pos: number
  id: string
  language: Language
}

function NightRow({ pos, id, language }: NightRowProps) {
  const isPlaceholder = id.startsWith('MINION_') || id.startsWith('DEMON_')
  const ph = PLACEHOLDER_LABELS[id]
  const name = isPlaceholder
    ? (language === 'zh' ? (ph?.zh ?? id) : (ph?.en ?? id))
    : getDisplayName(id, language)
  const icon = isPlaceholder ? undefined : getIconForCharacter(id)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '4px' }}>
      <Typography sx={{
        color: 'text.disabled', fontFamily: 'monospace',
        fontSize: '0.8rem', minWidth: 20, textAlign: 'right', flexShrink: 0,
      }}>
        {pos}
      </Typography>
      {icon ? (
        <Box component="img" src={icon} alt="" sx={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, objectFit: 'cover',
        }} />
      ) : (
        <Box sx={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          bgcolor: 'action.disabledBackground',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: 'text.disabled' }}>
            {name.slice(0, 2).toUpperCase()}
          </Typography>
        </Box>
      )}
      <Typography sx={{
        fontSize: '0.9rem', lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: isPlaceholder ? 'text.disabled' : 'text.primary',
        fontStyle: isPlaceholder ? 'italic' : 'normal',
      }}>
        {name}
      </Typography>
    </Box>
  )
}

type Props = {
  script: EditableScript
  language: Language
  /** Controlled from outside — toolbar night toggle */
  open: boolean
  onToggle: () => void
}

export function NightOrderPreview({ script, language, open, onToggle }: Props) {
  const zh = language === 'zh'

  const { firstNight, otherNights } = useMemo(() => {
    const scriptCharIds = new Set(script.characters)
    const positions = script.scriptNightPositions

    // ── Path A: script has inline night positions ─────────────────────────────
    // Use those to build a sorted order; fall back to catalog order for the
    // remaining chars that have no explicit position.
    if (positions && Object.keys(positions).length > 0) {
      // Chars with explicit firstNight position (sorted ascending, exclude 0)
      const withFirst = Object.entries(positions)
        .filter(([id, p]) => p.firstNight != null && scriptCharIds.has(id))
        .sort(([, a], [, b]) => (a.firstNight ?? 0) - (b.firstNight ?? 0))
        .map(([id]) => id)

      const withOther = Object.entries(positions)
        .filter(([id, p]) => p.otherNight != null && scriptCharIds.has(id))
        .sort(([, a], [, b]) => (a.otherNight ?? 0) - (b.otherNight ?? 0))
        .map(([id]) => id)

      // Catalog-ordered chars that have no explicit position in the script
      const catalogOrder = getEffectiveNightOrderFromRegistry()
      const explicitFirst = new Set(withFirst)
      const explicitOther = new Set(withOther)

      const PLACEHOLDERS = new Set(['MINION_INFO', 'DEMON_INFO'])

      const catalogFirst = (catalogOrder.first_night ?? [])
        .map(normalizeToken)
        .filter((id) => id !== 'dusk' && id !== 'dawn')
        .filter((id) => (scriptCharIds.has(id) || PLACEHOLDERS.has(id)) && !explicitFirst.has(id))

      const catalogOther = (catalogOrder.other_nights ?? [])
        .map(normalizeToken)
        .filter((id) => id !== 'dusk' && id !== 'dawn')
        .filter((id) => (scriptCharIds.has(id) || PLACEHOLDERS.has(id)) && !explicitOther.has(id))

      return {
        firstNight: [...withFirst, ...catalogFirst],
        otherNights: [...withOther, ...catalogOther],
      }
    }

    // ── Path B: no inline positions — existing catalog / meta.firstNight logic ─
    const order = getEffectiveNightOrderFromRegistry()

    const firstRaw = (script.meta?.firstNight?.length
      ? script.meta.firstNight
      : order.first_night ?? []
    ).map(normalizeToken).filter((id) => id !== 'dusk' && id !== 'dawn')

    const otherRaw = (script.meta?.otherNight?.length
      ? script.meta.otherNight
      : order.other_nights ?? []
    ).map(normalizeToken).filter((id) => id !== 'dusk' && id !== 'dawn')

    return {
      firstNight: firstRaw.filter((id) =>
        scriptCharIds.has(id) || id === 'MINION_INFO' || id === 'DEMON_INFO'
      ),
      otherNights: otherRaw.filter((id) =>
        scriptCharIds.has(id) || id === 'MINION_INFO' || id === 'DEMON_INFO'
      ),
    }
  }, [script])

  if (firstNight.length === 0 && otherNights.length === 0) return null

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      {/* ── Collapsible header ── */}
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 0.75, cursor: 'pointer', userSelect: 'none',
          borderRadius: open ? '8px 8px 0 0' : 2,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <NightsStayIcon sx={{ fontSize: 15, color: FIRST_NIGHT_COLOR }} />
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, flex: 1, color: 'text.primary' }}>
          {zh ? '夜间顺序' : 'Night Order'}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
          {zh
            ? `第一夜 ${firstNight.length} · 其他 ${otherNights.length}`
            : `First ${firstNight.length} · Other ${otherNights.length}`
          }
        </Typography>
        {open
          ? <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          : <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
      </Box>

      {/* ── Two-column body ── */}
      <Collapse in={open}>
        <Box sx={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
          borderTop: '1px solid', borderColor: 'divider',
        }}>
          {/* First Night */}
          <Box sx={{ p: 1.5, borderRight: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <NightsStayIcon sx={{ fontSize: 14, color: FIRST_NIGHT_COLOR }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: FIRST_NIGHT_COLOR }}>
                {zh ? '第一夜' : 'First Night'}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', ml: 'auto' }}>
                {firstNight.length}
              </Typography>
            </Box>
            {firstNight.map((id, i) => (
              <NightRow key={id} pos={i + 1} id={id} language={language} />
            ))}
          </Box>

          {/* Other Nights */}
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <WbSunnyIcon sx={{ fontSize: 14, color: OTHER_NIGHT_COLOR }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: OTHER_NIGHT_COLOR }}>
                {zh ? '其他夜晚' : 'Other Nights'}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', ml: 'auto' }}>
                {otherNights.length}
              </Typography>
            </Box>
            {otherNights.map((id, i) => (
              <NightRow key={id} pos={i + 1} id={id} language={language} />
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}
