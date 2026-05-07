// @ts-nocheck
import type { StorytellerSeat } from '../types'
import type { StorytellerContext } from '../useStoryteller'
import React, { useState } from 'react'
import { Box, Button, Chip, IconButton, Paper, useTheme } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { ArenaSeatPlayerModal } from './ArenaSeatPlayerModal'
import { CharacterCircle } from './CharacterCircle'
import { getDisplayName, getIconForCharacter, nightOrder } from '../../../catalog'
import { getSeatPosition } from '../../../utils/seats'
import { VoteButtonGroup, RoundRobinIndicator, TagChip } from './ArenaSeatComponents'

export function ArenaSeat({ ctx, seat, index, isPortrait }: { ctx: StorytellerContext, seat: any, index: number, isPortrait: boolean }) {
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

  const isVisited = currentDay.nightVisitedSeats.includes(seat.seat)
  const isFirstNight = currentDay.day === 1
  const nightList = isFirstNight ? (nightOrder?.first_night ?? []) : (nightOrder?.other_nights ?? [])
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
        {/* Circle: absolutely centered above card top edge */}
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

          {tagDefs.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.375, justifyContent: 'center', mt: 0.5 }}>
              {tagDefs.map(({ label, chipSx }) => {
                const isChar = label.startsWith('💀')
                const charId = isChar ? [...label].slice(1).join('') : ''
                const icon = isChar ? getIconForCharacter(charId) : null
                const displayLabel = isChar ? getDisplayName(charId, language) : label
                return <TagChip key={`${seat.seat}-${label}`} label={displayLabel} icon={icon as string} chipSx={chipSx} />
              })}
            </Box>
          )}

          {isSelected && (
            <Button size="medium" variant={isPlayerModalOpen ? 'contained' : 'outlined'}
              onClick={(e) => { e.stopPropagation(); setPlayerModalSeat(isPlayerModalOpen ? null : seat.seat); setPlayerModalTab(0) }}
              sx={{ mt: 0.25, minWidth: 0, px: 0.75, py: 0.25, fontWeight: 600 }}>
              {language === 'zh' ? '操作' : 'Actions'}
            </Button>
          )}

          {isInNomination && <VoteButtonGroup seat={seat} cardVotedYes={cardVotedYes} cardVotedNo={cardVotedNo} handleVoteYesClick={handleVoteYesClick} handleVoteNoClick={handleVoteNoClick} handleRemoveVote={handleRemoveVote} />}

          {isNightPhase && nightShowWakeOrder && playerWakeOrder !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <IconButton size="medium" onClick={(e) => { e.stopPropagation(); toggleNightVisitedSeat(seat.seat) }}
                sx={{ p: 0.25, width: 44, height: 44, borderRadius: '50%', fontWeight: 700, border: '2px solid', borderColor: isVisited ? 'success.main' : 'divider', bgcolor: isVisited ? 'success.light' : 'transparent', flexShrink: 0 }}>
                {isVisited ? <CheckIcon fontSize="small" /> : null}
              </IconButton>
              <Box component="span" sx={{ fontWeight: 600 }}>#{playerWakeOrder}</Box>
            </Box>
          )}

          {isNightPhase && nightShowCharacter && (seat.stTags || []).length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.25, maxWidth: 90 }}>
              {(seat.stTags as string[]).map((tag: string) => {
                const body = tag.startsWith('📝') ? tag.slice(2) : tag
                const sep = body.indexOf('::'); const label = sep === -1 ? body : body.slice(0, sep)
                const srcId = sep === -1 ? null : body.slice(sep + 2) || null
                const srcIcon = srcId ? getIconForCharacter(srcId) : null
                return (
                  <TagChip key={tag} label={label} icon={srcIcon as string}
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
