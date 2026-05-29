import type { StorytellerSeat } from '../types'
import type { StorytellerContext } from '../useStoryteller'
import type { MouseEvent } from 'react'
import { memo } from 'react'
import { Box, IconButton, Paper, Tooltip, useTheme } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { ArenaSeatPlayerModal } from './ArenaSeatPlayerModal'
import { CharacterCircle } from './CharacterCircle'
import { getDisplayName, getIconForCharacter, getEffectiveNightOrderFromRegistry, getAbilityTextForScript } from '../../../catalog'
import { VoteButtonGroup, TagChip, StatusBadge, translateStTag, resolveTagDisplay } from './ArenaSeatComponents'


const CIRCLE_SIZE = 72
const CIRCLE_OVERLAP = CIRCLE_SIZE / 2  // how much circle sticks into card

function MobileSeatCardInner({ ctx, seat, side = 'left' }: { ctx: StorytellerContext; seat: StorytellerSeat; side?: 'left' | 'right' }) {
  const {
    language, pickerMode, currentDay, updateCurrentDay, currentVoterSeat,
    selectedSeat, text, handleSeatClick, handleVoteYes, handleVoteNo,
    nightShowCharacter, nightShowWakeOrder,
    toggleNightVisitedSeat,
    playerModalSeat, setPlayerModalSeat,
    activeScriptSlug, scriptOptions,
  } = ctx

  const pinnedRevisions = scriptOptions?.find((s) => s.slug === activeScriptSlug)?.pinnedRevisions

  const muiTheme = useTheme()
  const isDark = muiTheme.palette.mode === 'dark'

  const isPlayerModalOpen = playerModalSeat === seat.seat
  const isSelected = selectedSeat?.seat === seat.seat
  const isNightPhase = currentDay.phase === 'night'
  const isInNomination = currentDay.phase === 'nomination' && currentDay.nominationStep !== 'waitingForNomination'

  const isVoteActor = currentDay.voteDraft.actor === seat.seat
  const isVoteTarget = currentDay.voteDraft.target === seat.seat
  const isCurrentVoter = currentVoterSeat === seat.seat
  const hasVoted = currentDay.votingState?.votes[seat.seat] !== undefined
  const votedYes = currentDay.votingState?.votes[seat.seat] === true
  const cardVotedYes = currentDay.votingState
    ? currentDay.votingState.votes[seat.seat] === true
    : currentDay.voteDraft.voters.includes(seat.seat)
  const cardVotedNo = currentDay.votingState
    ? currentDay.votingState.votes[seat.seat] === false
    : currentDay.voteDraft.noVoters.includes(seat.seat)

  const actualCharId = seat.characterId
  const perceivedCharId = seat.userCharacterId || seat.characterId
  const charIcon = actualCharId ? getIconForCharacter(actualCharId) : null
  const actualCharName = actualCharId ? getDisplayName(actualCharId, language) : ''
  const actualCharAbility = actualCharId ? getAbilityTextForScript(actualCharId, language, pinnedRevisions) : ''

  const stTagLabels: string[] = (seat.stTags || []).map((t: string) => {
    const body = t.startsWith('📝') ? t.slice(2) : t
    const sep = body.indexOf('::')
    return sep === -1 ? body : body.slice(0, sep)
  })
  const isDrunk = stTagLabels.includes('drunk')
  const isPoisoned = stTagLabels.includes('poisoned')
  const isVisited = currentDay.nightVisitedSeats?.includes(seat.seat)

  const isFirstNight = currentDay.day === 1
  const nightList = isFirstNight ? (getEffectiveNightOrderFromRegistry().first_night ?? []) : (getEffectiveNightOrderFromRegistry().other_nights ?? [])

  // Dense rank: 32,37,37,52 → 1,2,2,3 (relative within script's seats)
  const rawWakePos = perceivedCharId ? (() => { const idx = nightList.indexOf(perceivedCharId); return idx !== -1 ? idx + 1 : null })() : null
  const allRawPositions = currentDay.seats
    .map((s) => { const cId = s.userCharacterId || s.characterId; if (!cId) return null; const idx = nightList.indexOf(cId); return idx !== -1 ? idx + 1 : null })
    .filter((p): p is number => p !== null)
  const sortedUnique = [...new Set(allRawPositions)].sort((a, b) => a - b)
  const rankMap = new Map(sortedUnique.map((pos, i) => [pos, i + 1]))
  const playerWakeOrder = rawWakePos !== null ? (rankMap.get(rawWakePos) ?? null) : null

  const tagDefs = [
    !seat.alive    ? { label: text.aliveTag,    chipSx: { bgcolor: '#3a3530', color: '#e8e4da', border: 'none' } } : null,
    seat.isExecuted ? { label: text.executedTag, chipSx: { bgcolor: '#7a1e1e', color: '#fde8e8', border: 'none' } } : null,
    seat.isTraveler ? { label: text.traveler,    chipSx: { bgcolor: '#1e4a7a', color: '#e0eaf8', border: 'none' } } : null,
    seat.hasNoVote  ? { label: text.noVoteTag,   chipSx: { bgcolor: '#5a4a20', color: '#fdf0d0', border: 'none' } } : null,
    ...seat.customTags.map((t: string) => ({ label: t, chipSx: {} })),
  ].filter(Boolean) as { label: string; chipSx: SxProps<Theme> }[]

  const getBorderColor = () => {
    if (seat.isExecuted) return 'error.main'
    if (seat.isTraveler) return 'info.main'
    if (isVoteActor) return 'warning.main'
    if (isVoteTarget) return 'secondary.main'
    if (isSelected) return 'primary.main'
    return 'divider'
  }

  const handleVoteYesClick = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    if (isCurrentVoter) { handleVoteYes(seat.seat) }
    else if (currentDay.votingState) { updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: true } } : null })) }
    else { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: [...d.voteDraft.voters, seat.seat], noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } })) }
  }

  const handleVoteNoClick = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    if (isCurrentVoter) { handleVoteNo(seat.seat) }
    else if (currentDay.votingState) { updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: false } } : null })) }
    else { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: [...d.voteDraft.noVoters, seat.seat], voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } })) }
  }

  const handleRemoveVote = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    if (currentDay.votingState) {
      updateCurrentDay((d) => {
        if (!d.votingState) return d
        const { [seat.seat]: _removed, ...votes } = d.votingState.votes
        return { ...d, votingState: { ...d.votingState, votes } }
      })
    } else if (cardVotedYes) { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } })) }
    else if (cardVotedNo) { updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } })) }
  }

  const circleAlpha = seat.alive ? 1 : 0.75
  const circleFilter = seat.alive ? 'none' : 'grayscale(85%) brightness(0.85)'

  return (
    <>
      {/* Unified flex row: circle + card share the same layout container.
          Circle overlaps card edge via negative margin — no absolute positioning needed. */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        flexDirection: side === 'right' ? 'row-reverse' : 'row',
        touchAction: 'pan-y',
      }}>
        {/* Circle — pulled into card by negative margin on the card-facing side */}
        <Tooltip
          title={actualCharAbility || ''}
          placement={side === 'right' ? 'right' : 'left'}
          arrow
          disableHoverListener={!actualCharAbility || !nightShowCharacter}
          enterDelay={600}
        >
          <Box sx={{
            flexShrink: 0, zIndex: 3,
            mr: side === 'left'  ? `-${CIRCLE_OVERLAP}px` : 0,
            ml: side === 'right' ? `-${CIRCLE_OVERLAP}px` : 0,
            filter: circleFilter, opacity: circleAlpha,
          }}>
            <CharacterCircle
              size={CIRCLE_SIZE}
              charIcon={charIcon ?? null}
              charName={actualCharName}
              nightShowCharacter={nightShowCharacter}
              isOpen={isPlayerModalOpen}
              disabled={false}
              onClick={(e) => { e.stopPropagation(); setPlayerModalSeat(isPlayerModalOpen ? null : seat.seat) }}
            />
          </Box>
        </Tooltip>

        {/* Card — extra padding on circle side keeps content clear of the circle */}
        <Paper
          elevation={isSelected ? 4 : 1}
          onClick={(e) => { e.stopPropagation(); handleSeatClick(seat.seat) }}
          data-seat
          sx={{
            flex: 1, minWidth: 0,
            pt: 0.75, pb: 0.75,
            pr: side === 'right' ? `${CIRCLE_OVERLAP + 8}px` : 0.75,
            pl: side === 'left'  ? `${CIRCLE_OVERLAP + 8}px` : 0.75,
            borderRadius: 1.5,
            border: '1.5px solid',
            borderColor: getBorderColor(),
            bgcolor: isDark
              ? (seat.alive ? '#3D2E24' : '#111008')
              : (seat.alive ? 'background.paper' : '#c8c5bc'),
            opacity: seat.alive ? 1 : (isDark ? 0.65 : 0.75),
            minHeight: `${CIRCLE_SIZE}px`,
            cursor: pickerMode !== 'none' ? 'pointer' : 'default',
            transition: 'all 0.15s ease',
            position: 'relative', zIndex: 2,
            touchAction: 'pan-y',
            '&:hover': { boxShadow: 3 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Box component="span" sx={{ fontWeight: 700, fontSize: '1.05rem', color: seat.alive ? 'text.secondary' : (isDark ? '#4a453e' : '#7a7570'), whiteSpace: 'nowrap' }}>#{seat.seat}</Box>
            <Box component="span" sx={{ fontWeight: 600, fontSize: '1.05rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: seat.alive ? 'text.primary' : (isDark ? '#3a3530' : '#5a5550'), textDecoration: seat.alive ? 'none' : 'line-through' }}>{seat.name}</Box>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: seat.alive ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
            {hasVoted && <Box component="span" sx={{ fontWeight: 700, fontSize: '0.9rem', color: votedYes ? 'success.main' : 'error.main' }}>{votedYes ? <CheckIcon fontSize="small" /> : <CloseIcon fontSize="small" />}</Box>}
          </Box>

          {/* Drunk / Poisoned — always visible */}
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
              <Box sx={{ display: 'flex', gap: 0.3, mb: 0.25, flexWrap: 'wrap' }}>
                {isDrunk && <StatusBadge type="drunk" label={translateStTag('drunk', language)} isDark={isDark} srcIcon={getTagSrcIcon('drunk') as string | null} />}
                {isPoisoned && <StatusBadge type="poisoned" label={translateStTag('poisoned', language)} isDark={isDark} srcIcon={getTagSrcIcon('poisoned') as string | null} />}
              </Box>
            )
          })()}

          {isNightPhase && nightShowCharacter && (seat.stTags || []).length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mb: 0.25 }}>
              {(seat.stTags as string[]).map((tag: string) => {
                const body = tag.startsWith('📝') ? tag.slice(2) : tag
                const sep = body.indexOf('::'); const rawLabel = sep === -1 ? body : body.slice(0, sep)
                if (rawLabel === 'drunk' || rawLabel === 'poisoned') return null
                const srcId = sep === -1 ? null : body.slice(sep + 2) || null
                const srcIcon = srcId ? getIconForCharacter(srcId) : null
                const displayLabel = translateStTag(rawLabel, language)
                return (
                  <TagChip key={`st-${tag}`} label={displayLabel} icon={srcIcon as string}
                    chipSx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }} />
                )
              })}
            </Box>
          )}

          {tagDefs.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mb: 0.5 }}>
              {tagDefs.map(({ label, chipSx }) => {
                const { displayLabel, srcId, isCharTag } = resolveTagDisplay(label, language)
                const icon = isCharTag
                  ? getIconForCharacter(srcId!)
                  : srcId ? getIconForCharacter(srcId) : null
                const finalLabel = isCharTag ? getDisplayName(srcId!, language) : displayLabel
                return <TagChip key={`${seat.seat}-${label}`} label={finalLabel} icon={icon as string} chipSx={chipSx} />
              })}
            </Box>
          )}

          {isNightPhase && nightShowWakeOrder && playerWakeOrder !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleNightVisitedSeat(seat.seat) }}
                sx={{ p: 0.25, width: 44, height: 44, borderRadius: '50%', border: '2px solid', borderColor: isVisited ? 'success.main' : 'divider', bgcolor: isVisited ? 'success.light' : 'transparent', flexShrink: 0 }}>
                {isVisited ? <CheckIcon fontSize="small" /> : <RadioButtonUncheckedIcon fontSize="small" />}
              </IconButton>
              <Box component="span" sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'text.secondary' }}>#{playerWakeOrder}</Box>
            </Box>
          )}

          {isInNomination && <VoteButtonGroup seat={seat} cardVotedYes={cardVotedYes} cardVotedNo={cardVotedNo} handleVoteYesClick={handleVoteYesClick} handleVoteNoClick={handleVoteNoClick} handleRemoveVote={handleRemoveVote} />}
        </Paper>
      </Box>

      <ArenaSeatPlayerModal ctx={ctx} seat={seat} />
    </>
  )
}

export const MobileSeatCard = memo(MobileSeatCardInner, (prev, next) =>
  prev.seat === next.seat &&
  prev.side === next.side &&
  prev.ctx.language === next.ctx.language &&
  prev.ctx.pickerMode === next.ctx.pickerMode &&
  prev.ctx.currentDay === next.ctx.currentDay &&
  prev.ctx.currentVoterSeat === next.ctx.currentVoterSeat &&
  prev.ctx.selectedSeat === next.ctx.selectedSeat &&
  prev.ctx.nightShowCharacter === next.ctx.nightShowCharacter &&
  prev.ctx.nightShowWakeOrder === next.ctx.nightShowWakeOrder &&
  prev.ctx.skillOverlay === next.ctx.skillOverlay &&
  prev.ctx.characterPopoutSeat === next.ctx.characterPopoutSeat &&
  prev.ctx.playerModalSeat === next.ctx.playerModalSeat &&
  prev.ctx.activeScriptSlug === next.ctx.activeScriptSlug &&
  prev.ctx.scriptOptions === next.ctx.scriptOptions,
)
