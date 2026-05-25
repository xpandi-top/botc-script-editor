import { useMemo, useState } from 'react'
import { Box, Collapse, IconButton, Popover, Tooltip, Typography } from '@mui/material'
import NightsStayIcon from '@mui/icons-material/NightsStay'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import {
  getDisplayName,
  getEffectiveNightOrderFromRegistry,
  getIconForCharacter,
  getNightReminder,
} from '../../catalog'
import type { EditableScript, Language } from '../../types'
import { useT } from '../../context/I18nContext'

// Placeholder token labels
const PLACEHOLDER_LABELS: Record<string, { en: string; zh: string }> = {
  MINION_INFO: { en: 'Minion Info', zh: '爪牙信息' },
  DEMON_INFO:  { en: 'Demon Info',  zh: '恶魔信息' },
}

// Placeholder reminders (en = empty until translated; zh from wiki)
const PLACEHOLDER_REMINDERS: Record<string, { en: string; zh: string }> = {
  MINION_INFO: {
    en: '',
    zh: '如果有七名或更多玩家，唤醒所有爪牙：展示"他是恶魔"信息标记。指向恶魔。如果下方的其他对爪牙暴露的角色在场，不要让爪牙入睡，而是一并给出相关信息后再让爪牙入睡。',
  },
  DEMON_INFO: {
    en: '',
    zh: '如果有七名或更多玩家，唤醒恶魔：展示"他们是你的爪牙"信息标记。指向所有爪牙。展示"这些角色不在场"信息标记。展示三个不在场的善良角色。如果其他对恶魔暴露的角色在场，不要让恶魔入睡，而是一并给出相关信息后再让恶魔入睡。',
  },
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
  /** Override from script's own customCharacters (for non-catalog IDs) */
  nameOverride?: string
  iconOverride?: string
  reminder?: string
  showReminder?: boolean
}

function NightRow({ pos, id, language, nameOverride, iconOverride, reminder, showReminder }: NightRowProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const isPlaceholder = id.startsWith('MINION_') || id.startsWith('DEMON_')
  const ph = PLACEHOLDER_LABELS[id]
  const phReminder = PLACEHOLDER_REMINDERS[id]

  // Name: placeholder label → nameOverride (script data) → catalog lookup
  const name = isPlaceholder
    ? (language === 'zh' ? (ph?.zh ?? id) : (ph?.en ?? id))
    : (nameOverride ?? getDisplayName(id, language))

  // Icon: placeholder has none → iconOverride (URL from script) → catalog asset
  const icon = isPlaceholder ? undefined : (iconOverride ?? getIconForCharacter(id))

  // Effective reminder: placeholder map → passed reminder prop
  const effectiveReminder = isPlaceholder
    ? (language === 'zh' ? phReminder?.zh : phReminder?.en) || undefined
    : reminder

  const hasReminder = Boolean(effectiveReminder)
  const popoverOpen = Boolean(anchorEl)

  return (
    <Box
      onClick={(e) => { if (hasReminder) setAnchorEl(popoverOpen ? null : e.currentTarget) }}
      sx={{
        py: '3px', px: 0.5, borderRadius: 1,
        cursor: hasReminder ? 'pointer' : 'default',
        bgcolor: popoverOpen ? 'action.selected' : 'transparent',
        '&:hover': hasReminder ? { bgcolor: 'action.hover' } : {},
        transition: 'background 0.1s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
        {hasReminder && (
          <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', ml: 'auto', flexShrink: 0 }}>
            ···
          </Typography>
        )}
      </Box>

      {/* Inline reminder (book toggle) */}
      {showReminder && effectiveReminder && (
        <Box sx={{ pl: '36px', pt: 0.25 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.3 }}>
            {effectiveReminder}
          </Typography>
        </Box>
      )}

      {/* Click popover */}
      {hasReminder && (
        <Popover
          open={popoverOpen}
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          disableRestoreFocus
          slotProps={{ paper: { sx: { maxWidth: 280, p: 1.5, borderRadius: 1.5 } } }}
          onClick={(e) => e.stopPropagation()}
        >
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
            {name}
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.6, color: 'text.primary' }}>
            {effectiveReminder}
          </Typography>
        </Popover>
      )}
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
  const { t } = useT()
  const [showReminders, setShowReminders] = useState(false)

  // Build lookup: id → {name, nameEn, icon} from the script's own character objects.
  // Used for scripts that carry their own character data (non-catalog IDs or Chinese
  // community scripts where name/image live in the script JSON, not the catalog).
  const customCharMap = useMemo(() => {
    const map = new Map<string, { name: string; nameEn?: string; icon?: string }>()
    for (const c of script.customCharacters) {
      const icon = Array.isArray(c.image) ? c.image[0] : (c.image as string | undefined)
      const nameEn = (c as Record<string, unknown>).name_eng as string | undefined
      if (c.name || icon) map.set(c.id, { name: c.name ?? c.id, nameEn, icon })
    }
    return map
  }, [script.customCharacters])

  const resolveChar = (id: string) => customCharMap.get(id)

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
          {t('night_order')}
        </Typography>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>
          {zh
            ? `第一夜 ${firstNight.length} · 其他 ${otherNights.length}`
            : `First ${firstNight.length} · Other ${otherNights.length}`
          }
        </Typography>
        {open && (
          <Tooltip title={showReminders ? (t('hide_reminders')) : (t('show_reminders'))} placement="top">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setShowReminders(v => !v) }}
              sx={{ p: 0.25, color: showReminders ? 'primary.main' : 'text.disabled' }}>
              <MenuBookIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
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
                {t('first_night')}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', ml: 'auto' }}>
                {firstNight.length}
              </Typography>
            </Box>
            {firstNight.map((id, i) => {
              const c = resolveChar(id)
              const name = c ? (language === 'zh' ? c.name : (c.nameEn ?? c.name)) : undefined
              const reminder = getNightReminder(id, language, 'first')
              return <NightRow key={id} pos={i + 1} id={id} language={language}
                nameOverride={name} iconOverride={c?.icon} reminder={reminder} showReminder={showReminders} />
            })}
          </Box>

          {/* Other Nights */}
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
              <WbSunnyIcon sx={{ fontSize: 14, color: OTHER_NIGHT_COLOR }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: OTHER_NIGHT_COLOR }}>
                {t('other_nights')}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', ml: 'auto' }}>
                {otherNights.length}
              </Typography>
            </Box>
            {otherNights.map((id, i) => {
              const c = resolveChar(id)
              const name = c ? (language === 'zh' ? c.name : (c.nameEn ?? c.name)) : undefined
              const reminder = getNightReminder(id, language, 'other')
              return <NightRow key={id} pos={i + 1} id={id} language={language}
                nameOverride={name} iconOverride={c?.icon} reminder={reminder} showReminder={showReminders} />
            })}
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}
