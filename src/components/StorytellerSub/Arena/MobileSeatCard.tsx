// @ts-nocheck
import React from 'react'
import { Box, Button, IconButton, Chip, Paper } from '@mui/material'
import { ArenaSeatTagPopout } from './ArenaSeatTagPopout'
import { ArenaSeatSkillPopout } from './ArenaSeatSkillPopout'
import { ArenaSeatCharacterPopout } from './ArenaSeatCharacterPopout'
import { getDisplayName, getIconForCharacter } from '../../../catalog'

export function MobileSeatCard({ ctx, seat }: { ctx: any; seat: any }) {
  const {
    language, pickerMode, skillOverlay, currentDay, updateCurrentDay, currentVoterSeat,
    tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat,
    selectedSeat, text, handleSeatClick, handleVoteYes, handleVoteNo, removeSeatTag,
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
  const perceivedCharId = seat.userCharacterId || seat.characterId
  const charIcon = actualCharId ? getIconForCharacter(actualCharId) : null
  const actualCharName = actualCharId ? getDisplayName(actualCharId, language) : ''
  const isVisited = currentDay.nightVisitedSeats?.includes(seat.seat)

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
        {/* Header row: seat# name alive-dot */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          {charIcon && (
            <Box component="img" src={charIcon as string} sx={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0 }} />
          )}
          <Box component="span" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
            #{seat.seat}
          </Box>
          <Box component="span" sx={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {seat.name}
          </Box>
          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: seat.alive ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
          {hasVoted && (
            <Box component="span" sx={{ fontWeight: 700, fontSize: '0.8rem', color: votedYes ? 'success.main' : 'error.main' }}>
              {votedYes ? '✓' : '✗'}
            </Box>
          )}
        </Box>

        {/* Character name (night mode) */}
        {isNightPhase && nightShowCharacter && actualCharName && (
          <Box sx={{ fontSize: '0.7rem', color: 'primary.main', fontWeight: 600, mb: 0.25 }}>
            {actualCharName}
          </Box>
        )}

        {/* Tags */}
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
                  onContextMenu={(e) => {
                    if (seat.customTags.includes(tag)) {
                      e.preventDefault()
                      removeSeatTag(seat.seat, tag)
                    }
                  }}
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              )
            })}
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant={isSkillPopoutOpen ? 'contained' : 'outlined'}
            onClick={(e) => { e.stopPropagation(); isSkillPopoutOpen ? closeSkillOverlay(false) : openSeatSkill(seat.seat) }}
            sx={{ minWidth: 0, px: 0.75, py: 0.125, fontSize: '0.7rem', fontWeight: 600 }}
          >
            {language === 'zh' ? '技能' : 'Ability'}
          </Button>
          <Button
            size="small"
            variant={isTagPopoutOpen ? 'contained' : 'outlined'}
            color={isTagPopoutOpen ? 'secondary' : 'inherit'}
            onClick={(e) => { e.stopPropagation(); setTagPopoutSeat(isTagPopoutOpen ? null : seat.seat); setSkillPopoutSeat(null) }}
            sx={{ minWidth: 0, px: 0.75, py: 0.125, fontSize: '0.7rem', fontWeight: 600 }}
          >
            {language === 'zh' ? '状态' : 'Status'}
          </Button>

          {/* Night: character assign */}
          {isNightPhase && nightShowCharacter && !actualCharId && (
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => { e.stopPropagation(); setCharacterPopoutSeat(isCharacterPopoutOpen ? null : seat.seat) }}
              sx={{ minWidth: 0, px: 0.75, py: 0.125, fontSize: '0.7rem' }}
            >
              {language === 'zh' ? '+角色' : '+Assign'}
            </Button>
          )}

          {/* Night: wake order checkbox */}
          {isNightPhase && nightShowWakeOrder && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); toggleNightVisitedSeat(seat.seat) }}
              sx={{
                p: 0.25,
                border: '2px solid',
                borderColor: isVisited ? 'success.main' : 'divider',
                bgcolor: isVisited ? 'success.light' : 'transparent',
                borderRadius: 0.5,
                fontSize: '0.7rem',
              }}
            >
              {isVisited ? '✓' : '○'}
            </IconButton>
          )}
        </Box>

        {/* Vote buttons (nomination phase) */}
        {isInNomination && (
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
            {cardVotedYes || cardVotedNo ? (
              <Button
                size="small"
                variant="contained"
                color={cardVotedYes ? 'success' : 'error'}
                onClick={handleRemoveVote}
                sx={{ minWidth: 0, px: 0.75, py: 0.125, fontWeight: 700, fontSize: '0.75rem' }}
              >
                {cardVotedYes ? '✓' : '✗'}
              </Button>
            ) : (
              <>
                <IconButton size="small" color="success" onClick={handleVoteYesClick} sx={{ border: '1px solid', borderColor: 'divider', p: 0.375, borderRadius: 1 }}>
                  <Box sx={{ fontSize: '0.8rem', lineHeight: 1 }}>✓</Box>
                </IconButton>
                <IconButton size="small" color="error" onClick={handleVoteNoClick} sx={{ border: '1px solid', borderColor: 'divider', p: 0.375, borderRadius: 1 }}>
                  <Box sx={{ fontSize: '0.8rem', lineHeight: 1 }}>✗</Box>
                </IconButton>
              </>
            )}
          </Box>
        )}
      </Paper>

      <ArenaSeatTagPopout ctx={ctx} seat={seat} />
      <ArenaSeatSkillPopout ctx={ctx} seat={seat} />
      <ArenaSeatCharacterPopout ctx={ctx} seat={seat} />
    </>
  )
}
