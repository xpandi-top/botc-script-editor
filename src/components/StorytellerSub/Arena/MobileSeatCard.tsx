// @ts-nocheck
import React from 'react'
import { Box, Button, IconButton, Chip, Paper } from '@mui/material'
import { ArenaSeatTagPopout } from './ArenaSeatTagPopout'
import { ArenaSeatSkillPopout } from './ArenaSeatSkillPopout'
import { ArenaSeatCharacterPopout } from './ArenaSeatCharacterPopout'
import { getDisplayName, getIconForCharacter, nightOrder } from '../../../catalog'
import { VoteButtonGroup } from './ArenaSeatComponents'

export function MobileSeatCard({ ctx, seat }: { ctx: any; seat: any }) {
  const {
    language, pickerMode, currentDay, updateCurrentDay, currentVoterSeat,
    tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat,
    selectedSeat, text, handleSeatClick, handleVoteYes, handleVoteNo,
    openSeatSkill, closeSkillOverlay, nightShowCharacter, nightShowWakeOrder,
    characterPopoutSeat, setCharacterPopoutSeat, toggleNightVisitedSeat,
  } = ctx

  const isTagPopoutOpen = tagPopoutSeat === seat.seat
  const isSkillPopoutOpen = skillPopoutSeat === seat.seat
  const isCharacterPopoutOpen = characterPopoutSeat === seat.seat
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
  const charIcon = actualCharId ? getIconForCharacter(actualCharId) : null
  const actualCharName = actualCharId ? getDisplayName(actualCharId, language) : ''
  const isVisited = currentDay.nightVisitedSeats?.includes(seat.seat)

  const isFirstNight = currentDay.day === 1
  const nightList = isFirstNight ? (nightOrder?.first_night ?? []) : (nightOrder?.other_nights ?? [])
  const playerWakeOrder = actualCharId ? (() => { const idx = nightList.indexOf(actualCharId); return idx !== -1 ? idx + 1 : null })() : null

  const tags = [
    !seat.alive ? text.aliveTag : '',
    seat.isExecuted ? text.executedTag : '',
    seat.isTraveler ? text.traveler : '',
    seat.hasNoVote ? text.noVoteTag : '',
    ...seat.customTags,
  ].filter(Boolean)

  const getBorderColor = () => {
    if (seat.isExecuted) return 'error.main'
    if (seat.isTraveler) return 'info.main'
    if (isVoteActor) return 'warning.main'
    if (isVoteTarget) return 'secondary.main'
    if (isSelected) return 'primary.main'
    return 'divider'
  }

  const handleVoteYesClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCurrentVoter) {
      handleVoteYes(seat.seat)
    } else if (currentDay.votingState) {
      updateCurrentDay((d: any) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: true } } : null }))
    } else {
      updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, voters: [...d.voteDraft.voters, seat.seat], noVoters: d.voteDraft.noVoters.filter((v: number) => v !== seat.seat) } }))
    }
  }

  const handleVoteNoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCurrentVoter) {
      handleVoteNo(seat.seat)
    } else if (currentDay.votingState) {
      updateCurrentDay((d: any) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: false } } : null }))
    } else {
      updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: [...d.voteDraft.noVoters, seat.seat], voters: d.voteDraft.voters.filter((v: number) => v !== seat.seat) } }))
    }
  }

  const handleRemoveVote = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cardVotedYes) {
      updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, voters: d.voteDraft.voters.filter((v: number) => v !== seat.seat) } }))
    } else if (cardVotedNo) {
      updateCurrentDay((d: any) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: d.voteDraft.noVoters.filter((v: number) => v !== seat.seat) } }))
    }
  }

  return (
    <>
      <Paper
        elevation={isSelected ? 4 : 1}
        onClick={(e) => { e.stopPropagation(); handleSeatClick(seat.seat) }}
        data-seat
        sx={{
          p: 0.75,
          borderRadius: 1.5,
          border: '1.5px solid',
          borderColor: getBorderColor(),
          bgcolor: seat.alive ? 'background.paper' : 'action.hover',
          opacity: seat.alive ? 1 : 0.75,
          cursor: pickerMode !== 'none' ? 'pointer' : 'default',
          transition: 'all 0.15s ease',
          '&:hover': { boxShadow: 3 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          {isNightPhase && nightShowCharacter && charIcon && (
            <Box component="img" src={charIcon as string} sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0 }} />
          )}
          <Box component="span" sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
            #{seat.seat}
          </Box>
          <Box component="span" sx={{ fontWeight: 600, fontSize: '0.95rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {seat.name}
          </Box>
          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: seat.alive ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
          {hasVoted && (
            <Box component="span" sx={{ fontWeight: 700, fontSize: '0.9rem', color: votedYes ? 'success.main' : 'error.main' }}>
              {votedYes ? '✓' : '✗'}
            </Box>
          )}
        </Box>

        {isNightPhase && nightShowCharacter && actualCharName && (
          <Box sx={{ fontSize: '0.8rem', color: 'primary.main', fontWeight: 600, mb: 0.25 }}>
            {actualCharName}
          </Box>
        )}

        {tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mb: 0.5 }}>
            {tags.map((tag: string) => {
              const isChar = tag.startsWith('💀')
              const charId = isChar ? [...tag].slice(1).join('') : ''
              const icon = isChar ? getIconForCharacter(charId) : null
              const label = isChar ? getDisplayName(charId, language) : tag
              return (
                <Chip
                  key={`${seat.seat}-${tag}`}
                  label={label}
                  size="small"
                  icon={icon ? <img src={icon as string} style={{ width: 14, height: 14 }} /> : undefined}
                  sx={{ fontSize: '0.75rem', height: 22 }}
                />
              )
            })}
          </Box>
        )}

        {isNightPhase && nightShowWakeOrder && playerWakeOrder !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); toggleNightVisitedSeat(seat.seat) }}
              sx={{
                p: 0.5,
                border: '2px solid',
                borderColor: isVisited ? 'success.main' : 'divider',
                bgcolor: isVisited ? 'success.light' : 'transparent',
                borderRadius: 0.75,
                fontSize: '1rem',
                width: 32,
                height: 32,
              }}
            >
              {isVisited ? '✓' : '○'}
            </IconButton>
            <Box component="span" sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'text.secondary' }}>
              #{playerWakeOrder}
            </Box>
          </Box>
        )}

        {isSelected && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            <Button
              size="small"
              variant={isSkillPopoutOpen ? 'contained' : 'outlined'}
              onClick={(e) => { e.stopPropagation(); isSkillPopoutOpen ? closeSkillOverlay(false) : openSeatSkill(seat.seat) }}
              sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.8rem', fontWeight: 600 }}
            >
              {language === 'zh' ? '技能' : 'Ability'}
            </Button>
            <Button
              size="small"
              variant={isTagPopoutOpen ? 'contained' : 'outlined'}
              color={isTagPopoutOpen ? 'secondary' : 'inherit'}
              onClick={(e) => { e.stopPropagation(); setTagPopoutSeat(isTagPopoutOpen ? null : seat.seat); setSkillPopoutSeat(null) }}
              sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.8rem', fontWeight: 600 }}
            >
              {language === 'zh' ? '状态' : 'Status'}
            </Button>
            {isNightPhase && nightShowCharacter && (
              <Button
                size="small"
                variant={isCharacterPopoutOpen ? 'contained' : 'outlined'}
                onClick={(e) => { e.stopPropagation(); setCharacterPopoutSeat(isCharacterPopoutOpen ? null : seat.seat) }}
                sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.25 }}
              >
                {charIcon && <Box component="img" src={charIcon as string} sx={{ width: 16, height: 16 }} />}
                {actualCharName || (language === 'zh' ? '+角色' : '+Assign')}
              </Button>
            )}
          </Box>
        )}

        {isInNomination && (
          <VoteButtonGroup
            seat={seat}
            cardVotedYes={cardVotedYes}
            cardVotedNo={cardVotedNo}
            handleVoteYesClick={handleVoteYesClick}
            handleVoteNoClick={handleVoteNoClick}
            handleRemoveVote={handleRemoveVote}
          />
        )}
      </Paper>

      <ArenaSeatTagPopout ctx={ctx} seat={seat} />
      <ArenaSeatSkillPopout ctx={ctx} seat={seat} />
      <ArenaSeatCharacterPopout ctx={ctx} seat={seat} />
    </>
  )
}