import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import {
  getDisplayName,
  getEffectiveNightOrderFromRegistry,
  getIconForCharacter,
} from '../../catalog'
import type { EditableScript, Language } from '../../types'

// Placeholder token labels (ST info tokens, not real characters)
const PLACEHOLDER_LABELS: Record<string, string> = {
  MINION_INFO: 'Minion Info',
  DEMON_INFO: 'Demon Info',
}

function normalizeToken(id: string) {
  if (id === 'minioninfo') return 'MINION_INFO'
  if (id === 'demoninfo') return 'DEMON_INFO'
  return id
}

type NightRowProps = {
  pos: number
  id: string
  language: Language
}

function NightRow({ pos, id, language }: NightRowProps) {
  const isPlaceholder = id.startsWith('MINION_') || id.startsWith('DEMON_')
  const name = isPlaceholder
    ? PLACEHOLDER_LABELS[id] ?? id
    : getDisplayName(id, language)
  const icon = isPlaceholder ? undefined : getIconForCharacter(id)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: '3px' }}>
      <Typography variant="caption" sx={{
        color: 'text.disabled', fontFamily: 'monospace',
        fontSize: '0.65rem', minWidth: 18, textAlign: 'right', flexShrink: 0,
      }}>
        {pos}
      </Typography>
      {icon ? (
        <Box component="img" src={icon} alt="" sx={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0, objectFit: 'cover',
        }} />
      ) : (
        <Box sx={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          bgcolor: 'action.disabledBackground', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>
            {name.slice(0, 2).toUpperCase()}
          </Typography>
        </Box>
      )}
      <Typography variant="caption" sx={{
        fontSize: '0.75rem', lineHeight: 1.3,
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
}

export function NightOrderPreview({ script, language }: Props) {
  const zh = language === 'zh'

  const { firstNight, otherNights } = useMemo(() => {
    const scriptCharIds = new Set(script.characters)
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
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
      {/* First Night */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <NightsStayIcon sx={{ fontSize: 13, color: 'primary.main' }} />
          <Typography variant="overline" sx={{ fontSize: '0.6rem', lineHeight: 1, color: 'primary.main', fontWeight: 700 }}>
            {zh ? '第一夜' : 'First Night'}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', ml: 'auto' }}>
            {firstNight.length}
          </Typography>
        </Box>
        {firstNight.map((id, i) => (
          <NightRow key={id} pos={i + 1} id={id} language={language} />
        ))}
      </Box>

      {/* Other Nights */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <WbSunnyIcon sx={{ fontSize: 13, color: 'warning.main' }} />
          <Typography variant="overline" sx={{ fontSize: '0.6rem', lineHeight: 1, color: 'warning.main', fontWeight: 700 }}>
            {zh ? '其他夜晚' : 'Other Nights'}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', ml: 'auto' }}>
            {otherNights.length}
          </Typography>
        </Box>
        {otherNights.map((id, i) => (
          <NightRow key={id} pos={i + 1} id={id} language={language} />
        ))}
      </Box>
    </Box>
  )
}
