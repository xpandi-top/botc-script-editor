// @ts-nocheck
import type { StorytellerSeat } from '../types'
import React, { useState } from 'react'
import { Box, IconButton, Button, Chip, Popover, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import LocalBarIcon from '@mui/icons-material/LocalBar'
import ScienceIcon from '@mui/icons-material/Science'
import type { UiKey } from '../../../lib/t'
import { makeT } from '../../../lib/t'
import { translateReminderZh } from '../../../lib/reminderTranslations'

// ── ST tag label → locale key map ──────────────────────────────────────────
export const ST_TAG_KEY_MAP: Partial<Record<string, UiKey>> = {
  'drunk':       'drunk_tag',
  'poisoned':    'poisoned_tag',
  'protected':   'protected_tag',
  'used':        'used_tag',
  'red herring': 'red_herring',
}

/** Translate a stored ST tag label for display. Falls back to raw label. */
export function translateStTag(label: string, language: string): string {
  const key = ST_TAG_KEY_MAP[label.toLowerCase()]
  if (key) return makeT(language)(key)
  if (language === 'zh') return translateReminderZh(label)
  return label
}

// ── TagChip: readable chip with click-to-popover ──
export function TagChip({ label, icon, chipSx, language }: { label: string; icon?: string | null; chipSx?: any; language?: string }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const displayLabel = language ? translateStTag(label, language) : label
  return (
    <>
      <Chip
        label={displayLabel}
        size="small"
        icon={icon ? <img src={icon} style={{ width: 14, height: 14, borderRadius: '50%' }} /> : undefined}
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
        sx={{
          fontSize: 'clamp(0.62rem, 1.4vw, 0.78rem)',
          fontWeight: 600,
          height: 22,
          cursor: 'pointer',
          '& .MuiChip-label': { px: '6px', lineHeight: 1 },
          '& .MuiChip-icon': { ml: '5px', mr: '-2px' },
          ...chipSx,
        }}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={(e: any) => { e?.stopPropagation?.(); setAnchor(null) }}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderRadius: 2, boxShadow: 4 } } }}
      >
        {icon && <Box component="img" src={icon} sx={{ width: 40, height: 40, borderRadius: '50%' }} />}
        <Typography variant="h6" fontWeight={700}>{displayLabel}</Typography>
      </Popover>
    </>
  )
}

// ── StatusBadge: drunk/poisoned status chip with MUI icon + popover ─────────
const STATUS_META: Record<string, { icon: React.ElementType; bgDark: string; bgLight: string; colorDark: string; colorLight: string; borderDark: string; borderLight: string }> = {
  drunk: {
    icon: LocalBarIcon,
    bgDark: '#6b4400', bgLight: '#fff3cd',
    colorDark: '#ffcc60', colorLight: '#7a4500',
    borderDark: '#ffcc60', borderLight: '#f5a623',
  },
  poisoned: {
    icon: ScienceIcon,
    bgDark: '#2d0045', bgLight: '#f5e8ff',
    colorDark: '#cc88ff', colorLight: '#6a008a',
    borderDark: '#cc88ff', borderLight: '#a855f7',
  },
}

export function StatusBadge({ type, label, isDark, srcIcon }: { type: 'drunk' | 'poisoned'; label: string; isDark: boolean; srcIcon?: string | null }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const meta = STATUS_META[type]
  const IconComp = meta.icon
  const bg = isDark ? meta.bgDark : meta.bgLight
  const color = isDark ? meta.colorDark : meta.colorLight
  const border = isDark ? meta.borderDark : meta.borderLight
  return (
    <>
      <Chip
        size="small"
        icon={
          srcIcon
            ? <img src={srcIcon} style={{ width: 14, height: 14, borderRadius: '50%' }} />
            : <IconComp sx={{ fontSize: '0.85rem !important', color: `${color} !important` }} />
        }
        label={label}
        onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget) }}
        sx={{
          fontSize: '0.72rem',
          fontWeight: 700,
          height: 22,
          cursor: 'pointer',
          bgcolor: bg,
          color,
          border: '1px solid',
          borderColor: border,
          borderRadius: '6px',
          '& .MuiChip-label': { px: '5px', lineHeight: 1 },
          '& .MuiChip-icon': { ml: '5px', mr: '-2px', color: `${color} !important` },
          '&:hover': { filter: 'brightness(1.15)' },
        }}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={(e: any) => { e?.stopPropagation?.(); setAnchor(null) }}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 2, boxShadow: 4, bgcolor: bg, border: '1.5px solid', borderColor: border } } }}
      >
        {srcIcon
          ? <Box component="img" src={srcIcon} sx={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid', borderColor: border }} />
          : <IconComp sx={{ fontSize: '2rem', color }} />
        }
        <Typography variant="h6" fontWeight={700} sx={{ color }}>{label}</Typography>
      </Popover>
    </>
  )
}

interface VoteButtonGroupProps {
  seat: any
  cardVotedYes: boolean
  cardVotedNo: boolean
  handleVoteYesClick: (e: React.MouseEvent) => void
  handleVoteNoClick: (e: React.MouseEvent) => void
  handleRemoveVote: (e: React.MouseEvent) => void
}

export function VoteButtonGroup({
  seat,
  cardVotedYes,
  cardVotedNo,
  handleVoteYesClick,
  handleVoteNoClick,
  handleRemoveVote,
}: VoteButtonGroupProps) {
  return (
    <Box sx={{ display: 'flex', gap: 0.25, mt: 0.25, justifyContent: 'center' }}>
      {cardVotedYes || cardVotedNo ? (
        <Button
          size="medium"
          variant="contained"
          color={cardVotedYes ? 'success' : 'error'}
          onClick={handleRemoveVote}
          sx={{ minWidth: 0, px: 0.75, py: 0.25, fontWeight: 700 }}
        >
          {cardVotedYes ? <CheckIcon fontSize="small" /> : <CloseIcon fontSize="small" />}
        </Button>
      ) : (
        <>
          <IconButton size="medium" color="success" onClick={handleVoteYesClick} sx={{ border: '1px solid', borderColor: 'divider', p: 0.5 }}>
            <CheckIcon fontSize="small" />
          </IconButton>
          <IconButton size="medium" color="error" onClick={handleVoteNoClick} sx={{ border: '1px solid', borderColor: 'divider', p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </>
      )}
    </Box>
  )
}

interface NightActionGroupProps {
  language: string
  seat: any
  actualCharId: string | null
  isCharacterPopoutOpen: boolean
  charIcon: string | null
  actualCharName: string
  perceivedCharId: string | null
  showDifferentPerception: boolean
  perceivedIcon: string | null
  perceivedCharName: string
  handleCharacterClick: (e: React.MouseEvent) => void
  toggleNightVisitedSeat: (seatNum: number) => void
  nightShowWakeOrder: boolean
  playerWakeOrder: number | null
  isVisited: boolean
  stTags?: string[]
  nightShowCharacter?: boolean
}

export function NightActionGroup({
  language,
  seat,
  actualCharId,
  isCharacterPopoutOpen,
  charIcon,
  actualCharName,
  handleCharacterClick,
  showDifferentPerception,
  perceivedIcon,
  perceivedCharName,
  toggleNightVisitedSeat,
  nightShowWakeOrder,
  playerWakeOrder,
  isVisited,
  stTags = [],
  nightShowCharacter = false,
}: NightActionGroupProps) {
  return (
    <>
      {actualCharId ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 0.25, gap: 0.25 }}>
          <Button
            size="medium"
            variant={isCharacterPopoutOpen ? 'contained' : 'outlined'}
            onClick={handleCharacterClick}
            sx={{ minWidth: 0, px: 0.75, py: 0.25, fontWeight: 600, display: 'flex', gap: 0.25 }}
          >
            {charIcon && <Box component="img" src={charIcon as string} sx={{ width: 16, height: 16 }} />}
            {actualCharName}
          </Button>
          {showDifferentPerception && perceivedIcon && (
            <Box component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary' }} title={perceivedCharName}>
              ({perceivedCharName})
            </Box>
          )}
        </Box>
      ) : (
        <Button size="medium" variant="outlined" onClick={handleCharacterClick} sx={{ minWidth: 0, px: 0.5 }}>
          {language === 'zh' ? '+角色' : '+Assign'}
        </Button>
      )}

      {nightShowWakeOrder && playerWakeOrder !== null && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          <IconButton
            size="medium"
            onClick={() => toggleNightVisitedSeat(seat.seat)}
            sx={{
              p: 0.5,
              fontWeight: 700,
              border: '2px solid',
              borderColor: isVisited ? 'success.main' : 'divider',
              bgcolor: isVisited ? 'success.light' : 'transparent',
            }}
          >
            {isVisited ? <CheckIcon fontSize="small" /> : null}
          </IconButton>
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            #{playerWakeOrder}
          </Box>
        </Box>
      )}

      {nightShowCharacter && stTags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.25, maxWidth: 90 }}>
          {stTags.map((tag: string) => {
            const body = tag.startsWith('📝') ? tag.slice(2) : tag
            const sep = body.indexOf('::')
            const rawLabel = sep === -1 ? body : body.slice(0, sep)
            if (rawLabel === 'drunk' || rawLabel === 'poisoned') return null
            const displayLabel = translateStTag(rawLabel, language)
            return (
              <TagChip key={tag} label={displayLabel} chipSx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }} />
            )
          })}
        </Box>
      )}
    </>
  )
}

interface RoundRobinIndicatorProps {
  isRoundRobinSpeaker: boolean
  isSpoken: boolean
}

export function RoundRobinIndicator({ isRoundRobinSpeaker, isSpoken }: RoundRobinIndicatorProps) {
  if (!isRoundRobinSpeaker && !isSpoken) return null
  return (
    <Box sx={{
      mt: 0.25,
      px: 0.5,
      py: 0.125,
      borderRadius: 0.5,
      bgcolor: isRoundRobinSpeaker ? 'warning.light' : 'action.selected',
      fontWeight: 700,
    }}>
      {isRoundRobinSpeaker ? 'SPK' : <CheckIcon fontSize="small" />}
    </Box>
  )
}
