// @ts-nocheck
import React, { useState } from 'react'
import { Box, Button, Chip, IconButton, Paper } from '@mui/material'
import { ArenaSeatPlayerModal } from './ArenaSeatPlayerModal'
import { CharacterCircle } from './CharacterCircle'
import { getDisplayName, getIconForCharacter, nightOrder } from '../../../catalog'
import { getSeatPosition } from '../../../utils/seats'
import { VoteButtonGroup, RoundRobinIndicator } from './ArenaSeatComponents'

export function ArenaSeat({ ctx, seat, index, isPortrait }: { ctx: any, seat: any, index: number, isPortrait: boolean }) {
  const {
    language, pickerMode, currentDay, updateCurrentDay, currentVoterSeat,
    selectedSeat, text, handleSeatClick, handleVoteYes, handleVoteNo,
    nightShowCharacter, nightShowWakeOrder, skillOverlay,
    characterPopoutSeat, setCharacterPopoutSeat, toggleNightVisitedSeat,
    playerModalSeat, setPlayerModalSeat, setPlayerModalTab, days,
  } = ctx

  const { left, top } = getSeatPosition(index, currentDay.seats.length, isPortrait)

  const tags = [
    !seat.alive ? text.aliveTag : '',
    seat.isExecuted ? text.executedTag : '',
    seat.isTraveler ? text.traveler : '',
    seat.hasNoVote ? text.noVoteTag : '',
    ...seat.customTags,
  ].filter(Boolean)

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
  const playerWakeOrder = perceivedCharId ? (() => { const idx = nightList.indexOf(perceivedCharId); return idx !== -1 ? idx + 1 : null })() : null

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

  const CIRCLE = 80  // circle diameter px
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
        <Box sx={{ position: 'absolute', top: -OVERLAP, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}>
          <CharacterCircle
            size={CIRCLE}
            charIcon={charIcon}
            charName={actualCharName}
            nightShowCharacter={nightShowCharacter}
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
            width: 120,
            minWidth: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pt: `${OVERLAP + 4}px`,
            px: 0.5,
            pb: 0.5,
            borderRadius: 1,
            border: '1.5px solid',
            borderColor: getBorderColor(),
            bgcolor: seat.alive ? 'background.paper' : 'action.hover',
            opacity: seat.alive ? 1 : 0.7,
            cursor: pickerMode !== 'none' ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            '&:hover': { boxShadow: 3 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component="span" sx={{ fontWeight: seat.alive ? 700 : 500, color: seat.alive ? 'text.primary' : 'text.disabled', whiteSpace: 'nowrap' }}>#{seat.seat}</Box>
            <Box component="span" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{seat.name}</Box>
            {hasVoted && <Box component="span" sx={{ color: votedYes ? 'success.main' : 'error.main', fontWeight: 700 }}>{votedYes ? '✓' : '✗'}</Box>}
          </Box>

          {tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, justifyContent: 'center', mt: 0.25 }}>
              {tags.map((tag) => {
                const isChar = tag.startsWith('💀')
                const charId = isChar ? [...tag].slice(1).join('') : ''
                const icon = isChar ? getIconForCharacter(charId) : null
                const label = isChar ? getDisplayName(charId, language) : tag
                return <Chip key={`${seat.seat}-${tag}`} label={label} size="small" icon={icon ? <img src={icon as string} style={{ width: 18, height: 18 }} /> : undefined} />
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

          {isNightPhase && nightShowCharacter && nightShowWakeOrder && playerWakeOrder !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <IconButton size="medium" onClick={(e) => { e.stopPropagation(); toggleNightVisitedSeat(seat.seat) }}
                sx={{ p: 0, width: 28, height: 28, borderRadius: '50%', fontWeight: 700, border: '2px solid', borderColor: isVisited ? 'success.main' : 'divider', bgcolor: isVisited ? 'success.light' : 'transparent', flexShrink: 0 }}>
                {isVisited ? '✓' : ''}
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
                  <Chip key={tag} label={label} size="small"
                    icon={srcIcon ? <img src={srcIcon as string} style={{ width: 12, height: 12, borderRadius: '50%' }} /> : undefined}
                    sx={{ fontSize: '0.72rem', height: 20, bgcolor: 'warning.light', color: 'warning.contrastText', '& .MuiChip-label': { px: 0.5 } }} />
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
