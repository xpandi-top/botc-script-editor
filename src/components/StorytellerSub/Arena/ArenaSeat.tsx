// @ts-nocheck
import type { StorytellerSeat } from '../types'
import type { StorytellerContext } from '../useStoryteller'
import React, { useState } from 'react'
import { Box, Chip, IconButton, Paper, Popover, Tooltip, Typography, useTheme } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { ArenaSeatPlayerModal } from './ArenaSeatPlayerModal'
import { CharacterCircle } from './CharacterCircle'
import { getDisplayName, getIconForCharacter, getEffectiveNightOrderFromRegistry, getAbilityText, getNightReminder } from '../../../catalog'
import { getSeatPosition } from '../../../utils/seats'
import { VoteButtonGroup, RoundRobinIndicator, TagChip, StatusBadge, translateStTag } from './ArenaSeatComponents'

function WakeOrderBadge({ wakeOrder, isVisited, reminder, onToggle }: { wakeOrder: number; isVisited: boolean; reminder?: string; onToggle: (e: React.MouseEvent) => void }) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const handleNumberClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    if (!reminder) return
    setAnchorEl(open ? null : e.currentTarget)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggle(e) }}
        sx={{ p: 0, width: 20, height: 20, minWidth: 0, borderRadius: '50%', border: '1.5px solid', borderColor: isVisited ? 'success.main' : 'divider', bgcolor: isVisited ? 'success.light' : 'transparent', flexShrink: 0 }}>
        {isVisited ? <CheckIcon sx={{ fontSize: '0.65rem' }} /> : null}
      </IconButton>

      <Box component="span"
        onClick={handleNumberClick}
        sx={{
          fontWeight: 700, fontSize: '0.85rem', userSelect: 'none',
          cursor: reminder ? 'pointer' : 'default',
          color: reminder ? (open ? 'info.dark' : 'info.main') : 'text.secondary',
          textDecoration: reminder ? 'underline' : 'none',
          textDecorationStyle: 'dotted', textUnderlineOffset: '2px',
          px: 0.75, py: 0.375, borderRadius: '6px',
          bgcolor: open ? 'action.selected' : 'transparent',
          transition: 'background 0.1s',
          '&:hover': reminder ? { bgcolor: 'action.hover' } : {},
        }}>
        #{wakeOrder}
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={(e: any) => { if (e?.stopPropagation) e.stopPropagation(); setAnchorEl(null) }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        disableRestoreFocus
        slotProps={{ paper: { sx: { maxWidth: 240, p: 1.25, borderRadius: 1.5 } } }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'text.primary' }}>
          {reminder}
        </Typography>
      </Popover>
    </Box>
  )
}

function ArenaSeatInner({ ctx, seat, index, isPortrait }: { ctx: StorytellerContext, seat: any, index: number, isPortrait: boolean }) {
  const {
    language, pickerMode, currentDay, updateCurrentDay, currentVoterSeat,
    selectedSeat, text, handleSeatClick, handleVoteYes, handleVoteNo,
    nightShowCharacter, nightShowWakeOrder, skillOverlay,
    characterPopoutSeat, setCharacterPopoutSeat, toggleNightVisitedSeat,
    playerModalSeat, setPlayerModalSeat, setPlayerModalTab, days,
  } = ctx

  const { left, top } = getSeatPosition(index, currentDay.seats.length, isPortrait)

  // Tag definitions with semantic colors for readability
  type TagDef = { label: string; chipSx: object }
  const tagDefs: TagDef[] = [
    !seat.alive    ? { label: text.aliveTag,    chipSx: { bgcolor: '#3a3530', color: '#e8e4da', border: 'none' } } : null,
    seat.isExecuted ? { label: text.executedTag, chipSx: { bgcolor: '#7a1e1e', color: '#fde8e8', border: 'none' } } : null,
    seat.isTraveler ? { label: text.traveler,    chipSx: { bgcolor: '#1e4a7a', color: '#e0eaf8', border: 'none' } } : null,
    seat.hasNoVote  ? { label: text.noVoteTag,   chipSx: { bgcolor: '#5a4a20', color: '#fdf0d0', border: 'none' } } : null,
    ...seat.customTags.map((t: string) => ({ label: t, chipSx: {} })),
  ].filter(Boolean) as TagDef[]

  const isRoundRobinSpeaker = currentDay.phase === 'public' && currentDay.publicMode === 'roundRobin' && currentDay.currentSpeakerSeat === seat.seat
  const isSpoken = currentDay.roundRobinSpokenSeats.includes(seat.seat)
  const isVoteActor = currentDay.voteDraft.actor === seat.seat
  const isVoteTarget = currentDay.voteDraft.target === seat.seat
  const isSkillActor = skillOverlay?.draft.actor === seat.seat
  const isSkillTarget = skillOverlay?.draft.targets.includes(seat.seat) ?? false
  const isCurrentVoter = currentVoterSeat === seat.seat
  const hasVoted = currentDay.votingState?.votes[seat.seat] !== undefined
  const votedYes = currentDay.votingState?.votes[seat.seat] === true
  const isInNomination = currentDay.phase === 'nomination' && currentDay.nominationStep !== 'waitingForNomination'
  const isNightPhase = currentDay.phase === 'night'

  const cardVotedYes = currentDay.votingState
    ? currentDay.votingState.votes[seat.seat] === true
    : currentDay.voteDraft.voters.includes(seat.seat)
  const cardVotedNo = currentDay.votingState
    ? currentDay.votingState.votes[seat.seat] === false
    : currentDay.voteDraft.noVoters.includes(seat.seat)

  const muiTheme = useTheme()
  const isDark = muiTheme.palette.mode === 'dark'

  const isSelected = selectedSeat?.seat === seat.seat
  const isPlayerModalOpen = playerModalSeat === seat.seat
  const isCharacterPopoutOpen = characterPopoutSeat === seat.seat

  const actualCharId = seat.characterId
  const charIcon = actualCharId ? getIconForCharacter(actualCharId) : null
  const actualCharName = actualCharId ? getDisplayName(actualCharId, language) : ''
  const actualCharAbility = actualCharId ? getAbilityText(actualCharId, language) : ''

  // Drunk/poisoned derived from stTags — always visible to ST
  const stTagLabels: string[] = (seat.stTags || []).map((t: string) => {
    const body = t.startsWith('📝') ? t.slice(2) : t
    const sep = body.indexOf('::')
    return sep === -1 ? body : body.slice(0, sep)
  })
  const isDrunk = stTagLabels.includes('drunk')
  const isPoisoned = stTagLabels.includes('poisoned')

  const isVisited = currentDay.nightVisitedSeats.includes(seat.seat)
  const isFirstNight = currentDay.day === 1
  const nightList = isFirstNight ? (getEffectiveNightOrderFromRegistry().first_night ?? []) : (getEffectiveNightOrderFromRegistry().other_nights ?? [])
  const perceivedCharId = seat.userCharacterId || seat.characterId

  // Dense rank: 32,37,37,52 → 1,2,2,3 (relative within script's seats)
  const rawWakePos = perceivedCharId ? (() => { const idx = nightList.indexOf(perceivedCharId); return idx !== -1 ? idx + 1 : null })() : null
  const allRawPositions = currentDay.seats
    .map((s: any) => { const cId = s.userCharacterId || s.characterId; if (!cId) return null; const idx = nightList.indexOf(cId); return idx !== -1 ? idx + 1 : null })
    .filter((p: any): p is number => p !== null)
  const sortedUnique = [...new Set(allRawPositions)].sort((a, b) => a - b)
  const rankMap = new Map(sortedUnique.map((pos, i) => [pos, i + 1]))
  const playerWakeOrder = rawWakePos !== null ? (rankMap.get(rawWakePos) ?? null) : null

  const getBorderColor = () => {
    if (seat.isExecuted) return 'error.main'
    if (seat.isTraveler) return 'info.main'
    if (isVoteActor || isSkillActor) return 'warning.main'
    if (isVoteTarget) return 'secondary.main'
    if (isSkillTarget) return 'error.light'
    if (selectedSeat?.seat === seat.seat) return 'primary.main'
    return 'divider'
  }

  const handleVoteYesClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCurrentVoter) { handleVoteYes(seat.seat) }
    else if (currentDay.votingState) { updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: true } } : null })) }
    else { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: [...d.voteDraft.voters, seat.seat], noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } })) }
  }

  const handleVoteNoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCurrentVoter) { handleVoteNo(seat.seat) }
    else if (currentDay.votingState) { updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: false } } : null })) }
    else { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: [...d.voteDraft.noVoters, seat.seat], voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } })) }
  }

  const handleRemoveVote = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentDay.votingState) { updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: undefined as unknown as boolean } } : null })) }
    else if (cardVotedYes) { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } })) }
    else if (cardVotedNo) { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } })) }
  }
  const CIRCLE = 90  // circle diameter px — matches --seat-size default
  const OVERLAP = CIRCLE / 2  // how much circle pokes above card top

  return (
    <>
      {/* Wrapper positioned at seat coordinate; circle overlaps card top */}
      <Box
        sx={{
          position: 'absolute',
          left: `${left}%`,
          top: `${top}%`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
        }}
      >
        {/* Circle: absolutely centered above card top edge — tooltip shows ability */}
        <Tooltip
          title={actualCharAbility || ''}
          placement="top"
          arrow
          disableHoverListener={!actualCharAbility || !nightShowCharacter}
          enterDelay={600}
        >
          <Box sx={{ position: 'absolute', top: -OVERLAP, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
            filter: seat.alive ? 'none' : 'grayscale(85%) brightness(0.85)', opacity: seat.alive ? 1 : 0.75 }}>
            <CharacterCircle
              size={CIRCLE}
              charIcon={charIcon}
              charName={actualCharName}
              nightShowCharacter={nightShowCharacter || seat.isTraveler}
              isOpen={isPlayerModalOpen}
              disabled={false}
              onClick={(e) => { e.stopPropagation(); setPlayerModalSeat(isPlayerModalOpen ? null : seat.seat) }}
            />
          </Box>
        </Tooltip>
        <Paper
          elevation={selectedSeat?.seat === seat.seat ? 4 : 1}
          onClick={(e) => { e.stopPropagation(); handleSeatClick(seat.seat) }}
          data-seat
          sx={{
            width: 'calc(var(--seat-size, 90px) * 1.33)',
            minWidth: 'calc(var(--seat-size, 90px) * 1.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pt: `${OVERLAP + 4}px`,
            px: 0.5,
            pb: 0.5,
            borderRadius: 1,
            border: '1.5px solid',
            borderColor: getBorderColor(),
            // Dead: clearly darker grey-stone card — unmistakable at a glance
            bgcolor: isDark
              ? (seat.alive ? '#3D2E24' : '#111008')
              : (seat.alive ? 'background.paper' : '#c8c5bc'),
            opacity: 1,
            cursor: pickerMode !== 'none' ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            '&:hover': { boxShadow: 3 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ fontWeight: 700, color: seat.alive ? 'text.secondary' : (isDark ? '#4a453e' : '#7a7570'), whiteSpace: 'nowrap', fontSize: 'clamp(0.65rem, 1.4vw, 0.85rem)' }}>#{seat.seat}</Box>
            <Box component="span" sx={{ fontWeight: 700, whiteSpace: 'nowrap', color: seat.alive ? 'text.primary' : (isDark ? '#3a3530' : '#5a5550'), textDecoration: seat.alive ? 'none' : 'line-through', fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)' }}>{seat.name}</Box>
            {hasVoted && <Box component="span" sx={{ color: votedYes ? 'success.main' : 'error.main', fontWeight: 700 }}>{votedYes ? <CheckIcon fontSize="small" /> : <CloseIcon fontSize="small" />}</Box>}
          </Box>

          {/* Drunk / Poisoned — always visible to ST, prominent status */}
          {isNightPhase && nightShowCharacter && (isDrunk || isPoisoned) && (() => {
            const getTagSrcIcon = (key: string) => {
              const raw = (seat.stTags || []).find((t: string) => {
                const b = t.startsWith('📝') ? t.slice(2) : t; const s = b.indexOf('::'); return (s === -1 ? b : b.slice(0, s)) === key
              })
              if (!raw) return null
              const b = raw.startsWith('📝') ? raw.slice(2) : raw; const s = b.indexOf('::')
              const srcId = s === -1 ? null : b.slice(s + 2) || null
              return srcId ? getIconForCharacter(srcId) : null
            }
            return (
              <Box sx={{ display: 'flex', gap: 0.3, mt: 0.3, flexWrap: 'wrap', justifyContent: 'center' }}>
                {isDrunk && <StatusBadge type="drunk" label={translateStTag('drunk', language)} isDark={isDark} srcIcon={getTagSrcIcon('drunk') as string | null} />}
                {isPoisoned && <StatusBadge type="poisoned" label={translateStTag('poisoned', language)} isDark={isDark} srcIcon={getTagSrcIcon('poisoned') as string | null} />}
              </Box>
            )
          })()}

          {tagDefs.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.375, justifyContent: 'center', mt: 0.5 }}>
              {tagDefs.map(({ label, chipSx }) => {
                const isCharTag = label.startsWith('💀')
                const isLinked = !isCharTag && label.startsWith('📝')
                let icon = null, displayLabel = label
                if (isCharTag) {
                  const charId = [...label].slice(1).join('')
                  icon = getIconForCharacter(charId)
                  displayLabel = getDisplayName(charId, language)
                } else if (isLinked) {
                  const body = label.slice(2)
                  const sep = body.indexOf('::')
                  const rawLabel = sep === -1 ? body : body.slice(0, sep)
                  displayLabel = translateStTag(rawLabel, language)
                  const srcId = sep === -1 ? '' : body.slice(sep + 2)
                  icon = srcId ? getIconForCharacter(srcId) : null
                } else {
                  displayLabel = translateStTag(label, language)
                }
                return <TagChip key={`${seat.seat}-${label}`} label={displayLabel} icon={icon as string} chipSx={chipSx} />
              })}
            </Box>
          )}

          {isInNomination && <VoteButtonGroup seat={seat} cardVotedYes={cardVotedYes} cardVotedNo={cardVotedNo} handleVoteYesClick={handleVoteYesClick} handleVoteNoClick={handleVoteNoClick} handleRemoveVote={handleRemoveVote} />}

          {isNightPhase && nightShowWakeOrder && playerWakeOrder !== null && (
            <WakeOrderBadge
              wakeOrder={playerWakeOrder}
              isVisited={isVisited}
              reminder={actualCharId ? getNightReminder(actualCharId, language, isFirstNight ? 'first' : 'other') : undefined}
              onToggle={() => toggleNightVisitedSeat(seat.seat)}
            />
          )}

          {isNightPhase && nightShowCharacter && (seat.stTags || []).length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.25, maxWidth: 90 }}>
              {(seat.stTags as string[]).map((tag: string) => {
                const body = tag.startsWith('📝') ? tag.slice(2) : tag
                const sep = body.indexOf('::'); const rawLabel = sep === -1 ? body : body.slice(0, sep)
                if (rawLabel === 'drunk' || rawLabel === 'poisoned') return null
                const srcId = sep === -1 ? null : body.slice(sep + 2) || null
                const srcIcon = srcId ? getIconForCharacter(srcId) : null
                const displayLabel = translateStTag(rawLabel, language)
                return (
                  <TagChip key={tag} label={displayLabel} icon={srcIcon as string}
                    chipSx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }} />
                )
              })}
            </Box>
          )}

          <RoundRobinIndicator isRoundRobinSpeaker={isRoundRobinSpeaker} isSpoken={isSpoken} />
        </Paper>
      </Box>

      <ArenaSeatPlayerModal ctx={ctx} seat={seat} />
    </>
  )
}

// Memo comparator: only re-render when seat-relevant ctx fields change.
// Timer ticks update currentTimerSeconds (separate state) but NOT currentDay,
// so all 15 seats correctly bail out on every timer tick.
export const ArenaSeat = React.memo(ArenaSeatInner, (prev, next) =>
  prev.seat === next.seat &&
  prev.index === next.index &&
  prev.isPortrait === next.isPortrait &&
  prev.ctx.language === next.ctx.language &&
  prev.ctx.pickerMode === next.ctx.pickerMode &&
  prev.ctx.currentDay === next.ctx.currentDay &&
  prev.ctx.currentVoterSeat === next.ctx.currentVoterSeat &&
  prev.ctx.selectedSeat === next.ctx.selectedSeat &&
  prev.ctx.nightShowCharacter === next.ctx.nightShowCharacter &&
  prev.ctx.nightShowWakeOrder === next.ctx.nightShowWakeOrder &&
  prev.ctx.skillOverlay === next.ctx.skillOverlay &&
  prev.ctx.characterPopoutSeat === next.ctx.characterPopoutSeat &&
  prev.ctx.playerModalSeat === next.ctx.playerModalSeat,
)
