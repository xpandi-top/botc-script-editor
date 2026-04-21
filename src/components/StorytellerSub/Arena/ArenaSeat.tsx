// @ts-nocheck
import React from 'react'
import { Box, Button, IconButton, Chip, Tooltip, Paper } from '@mui/material'
import { ArenaSeatTagPopout } from './ArenaSeatTagPopout'
import { ArenaSeatSkillPopout } from './ArenaSeatSkillPopout'
import { ArenaSeatCharacterPopout } from './ArenaSeatCharacterPopout'
import { getDisplayName, getIconForCharacter, nightOrder } from '../../../catalog'
import { getSeatPosition } from '../../../utils/seats'

export function ArenaSeat({ ctx, seat, index, isPortrait }: { ctx: any, seat: any, index: number, isPortrait: boolean }) {
  const { 
    language, pickerMode, skillOverlay, currentDay, updateCurrentDay, currentVoterSeat, 
    tagPopoutSeat, setTagPopoutSeat, skillPopoutSeat, setSkillPopoutSeat, 
    selectedSeat, text, handleSeatClick, handleVoteYes, handleVoteNo, removeSeatTag, 
    openSeatSkill, closeSkillOverlay, currentScriptCharacters, nightShowCharacter, 
    nightShowWakeOrder, characterPopoutSeat, setCharacterPopoutSeat, toggleNightVisitedSeat 
  } = ctx

  const { left, top } = getSeatPosition(index, currentDay.seats.length, isPortrait)
  
  const isCharacterTag = (tag: string) => tag.startsWith('💀')
  const getCharacterName = (tag: string) => {
    const charId = tag.slice(1)
    return getDisplayName(charId, language)
  }
  const displayTag = (tag: string) => isCharacterTag(tag) ? getCharacterName(tag) : tag
  
  const tags = [
    !seat.alive ? text.aliveTag : '', 
    seat.isExecuted ? text.executedTag : '', 
    seat.isTraveler ? text.traveler : '', 
    seat.hasNoVote ? text.noVoteTag : '', 
    ...seat.customTags
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
  
  const cardVotedYes = currentDay.votingState
    ? currentDay.votingState.votes[seat.seat] === true
    : currentDay.voteDraft.voters.includes(seat.seat)
  const cardVotedNo = currentDay.votingState
    ? currentDay.votingState.votes[seat.seat] === false
    : currentDay.voteDraft.noVoters.includes(seat.seat)
  
  const isTagPopoutOpen = tagPopoutSeat === seat.seat
  const isSkillPopoutOpen = skillPopoutSeat === seat.seat
  const isCharacterPopoutOpen = characterPopoutSeat === seat.seat
  const isNightPhase = currentDay.phase === 'night'

  const actualCharId = seat.characterId
  const perceivedCharId = seat.userCharacterId || seat.characterId
  const showDifferentPerception = seat.userCharacterId && seat.userCharacterId !== seat.characterId
  const charIcon = actualCharId ? getIconForCharacter(actualCharId) : null
  const actualCharName = actualCharId ? getDisplayName(actualCharId, language) : ''
  const perceivedCharName = perceivedCharId && perceivedCharId !== actualCharId ? getDisplayName(perceivedCharId, language) : ''
  const perceivedIcon = perceivedCharId && perceivedCharId !== actualCharId ? getIconForCharacter(perceivedCharId) : null
  const isVisited = currentDay.nightVisitedSeats.includes(seat.seat)

  const isFirstNight = currentDay.day === 1
  const nightList = isFirstNight
    ? (nightOrder?.first_night ?? [])
    : (nightOrder?.other_nights ?? [])

  const getNightOrderPosition = (charId: string | null) => {
    if (!charId) return null
    const idx = nightList.indexOf(charId)
    if (idx !== -1) return idx + 1
    return null
  }

  const playerWakeOrder = actualCharId ? getNightOrderPosition(actualCharId) : null

  const seatSx = {
    position: 'absolute',
    left: `${left}%`,
    top: `${top}%`,
    transform: 'translate(-50%, -50%)',
    width: 120,
    minWidth: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    p: 0.5,
    borderRadius: 1,
    border: '1px solid',
    borderColor: selectedSeat?.seat === seat.seat ? 'primary.main' : 'divider',
    bgcolor: 'background.paper',
    opacity: seat.alive ? 1 : 0.7,
    transition: 'all 0.2s ease',
    pointerEvents: 'auto',
    '&:hover': { boxShadow: 3 },
  }

  const getStateSx = () => {
    let sx: any = { ...seatSx }
    if (!seat.alive) sx.bgcolor = 'action.hover'
    if (seat.isExecuted) sx.borderColor = 'error.main'
    if (seat.isTraveler) sx.borderColor = 'info.main'
    if (isVoteActor || isSkillActor) sx.borderColor = 'warning.main'
    if (isVoteTarget) sx.borderColor = 'secondary.main'
    if (isSkillTarget) sx.borderColor = 'error.light'
    if (isCurrentVoter) sx.boxShadow = `0 0 0 2px ${'primary.main'}`
    if (pickerMode !== 'none') sx.cursor = 'pointer'
    return sx
  }

  const handleVoteYesClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCurrentVoter) {
      handleVoteYes(seat.seat)
    } else if (currentDay.votingState) {
      updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: true } } : null }))
    } else {
      updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: [...d.voteDraft.voters, seat.seat], noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } }))
    }
  }

  const handleVoteNoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCurrentVoter) {
      handleVoteNo(seat.seat)
    } else if (currentDay.votingState) {
      updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: false } } : null }))
    } else {
      updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: [...d.voteDraft.noVoters, seat.seat], voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } }))
    }
  }

  const handleRemoveVote = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentDay.votingState) {
      updateCurrentDay((d) => ({ ...d, votingState: d.votingState ? { ...d.votingState, votes: { ...d.votingState.votes, [seat.seat]: undefined as unknown as boolean } } : null }))
    } else {
      if (cardVotedYes) {
        updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, voters: d.voteDraft.voters.filter((v) => v !== seat.seat) } }))
      } else if (cardVotedNo) {
        updateCurrentDay((d) => ({ ...d, voteDraft: { ...d.voteDraft, noVoters: d.voteDraft.noVoters.filter((v) => v !== seat.seat) } }))
      }
    }
  }

  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTagPopoutSeat(isTagPopoutOpen ? null : seat.seat)
    setSkillPopoutSeat(null)
    if (skillOverlay && !isTagPopoutOpen) closeSkillOverlay(false)
  }

  const handleSkillClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSkillPopoutOpen) {
      closeSkillOverlay(false)
    } else {
      openSeatSkill(seat.seat)
    }
  }

  const handleCharacterClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCharacterPopoutSeat(isCharacterPopoutOpen ? null : seat.seat)
  }

  const handleWakeCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleNightVisitedSeat(seat.seat)
  }

  const handleTagPillRightClick = (e: React.MouseEvent, tag: string) => {
    if (!seat.customTags.includes(tag)) return
    e.preventDefault()
    removeSeatTag(seat.seat, tag)
  }

  const handlePaperClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleSeatClick(seat.seat)
  }

  return (
    <>
      <Paper elevation={selectedSeat?.seat === seat.seat ? 4 : 1} sx={getStateSx()} onClick={handlePaperClick}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>
              <Box component="span" sx={{ fontWeight: fontWeight => seat.alive ? 700 : 500, color: seat.alive ? 'text.primary' : 'text.disabled', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                #{seat.seat}
              </Box>
              <Box component="span" sx={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {seat.name}
              </Box>
            </Box>
            {hasVoted && (
              <Box component="span" sx={{ fontSize: '0.8rem', color: votedYes ? 'success.main' : 'error.main', fontWeight: 700 }}>
                {votedYes ? '✓' : '✗'}
              </Box>
            )}
          </Box>
        </Box>

        {tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, justifyContent: 'center', mt: 0.25 }}>
            {tags.map((tag) => {
              const isCharTag = isCharacterTag(tag)
              const charId = isCharTag ? tag.slice(1) : ''
              const charImg = isCharTag ? getIconForCharacter(charId) : null
              const charName = isCharTag ? getCharacterName(tag) : ''
              return (
                <Chip
                  key={`${seat.seat}-${tag}`}
                  label={isCharTag ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      {charImg && <Box component="img" src={charImg as string} sx={{ width: 16, height: 16 }} />}
                      <span>{charName}</span>
                    </Box>
                  ) : displayTag(tag)}
                  size="small"
                  onContextMenu={(e) => handleTagPillRightClick(e, tag)}
                  sx={{ height: 28, fontSize: '0.8rem', fontWeight: 500, bgcolor: isCharTag ? 'primary.light' : 'action.selected' }}
                />
              )
            })}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 0.25, mt: 0.25, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button 
            size="small" 
            variant={isSkillPopoutOpen ? 'contained' : 'outlined'}
            onClick={handleSkillClick}
            color={isSkillPopoutOpen ? 'primary' : 'inherit'}
            sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.75rem', fontWeight: 600 }}
          >
            {language === 'zh' ? '技能' : 'Skill'}
          </Button>
          <Button size="small" variant="outlined" onClick={handleTagClick} color={isTagPopoutOpen ? 'secondary' : 'inherit'} sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.75rem', fontWeight: 600 }}>
            +Tag
          </Button>
        </Box>

        {isInNomination && (
          <Box sx={{ display: 'flex', gap: 0.25, mt: 0.25, justifyContent: 'center' }}>
            {cardVotedYes || cardVotedNo ? (
              <Button 
                size="small" 
                variant="contained" 
                color={cardVotedYes ? 'success' : 'error'}
                onClick={handleRemoveVote}
                sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.8rem', fontWeight: 700 }}
              >
                {cardVotedYes ? '✓' : '✗'}
              </Button>
            ) : (
              <>
                <IconButton size="small" color="success" onClick={handleVoteYesClick} sx={{ border: '1px solid', borderColor: 'divider', p: 0.5, fontSize: '0.85rem' }}>
                  ✓
                </IconButton>
                <IconButton size="small" color="error" onClick={handleVoteNoClick} sx={{ border: '1px solid', borderColor: 'divider', p: 0.5, fontSize: '0.85rem' }}>
                  ✗
                </IconButton>
              </>
            )}
          </Box>
        )}

        {isNightPhase && nightShowCharacter && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 0.25, gap: 0.25 }}>
            {actualCharId ? (
              <>
                <Button 
                  size="small" 
                  variant={isCharacterPopoutOpen ? 'contained' : 'outlined'}
                  onClick={handleCharacterClick}
                  sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: 0.25 }}
                >
                  {charIcon && <Box component="img" src={charIcon as string} sx={{ width: 16, height: 16 }} />}
                  {actualCharName}
                </Button>
                {showDifferentPerception && perceivedIcon && (
                  <Tooltip title={perceivedCharName}>
                    <Box component="img" src={perceivedIcon as string} sx={{ width: 16, height: 16, opacity: 0.7 }} />
                  </Tooltip>
                )}
              </>
            ) : (
              <Button size="small" variant="outlined" onClick={handleCharacterClick} sx={{ minWidth: 0, px: 0.5, fontSize: '0.65rem' }}>
                {language === 'zh' ? '+角色' : '+Assign'}
              </Button>
            )}
          </Box>
        )}

        {isNightPhase && nightShowWakeOrder && playerWakeOrder !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mt: 0.25 }}>
            <IconButton 
              size="small" 
              onClick={handleWakeCheckboxClick}
              sx={{ 
                p: 0.5, 
                fontSize: '0.7rem',
                border: '1px solid',
                borderColor: isVisited ? 'success.main' : 'divider',
                bgcolor: isVisited ? 'success.light' : 'transparent',
              }}
            >
              {isVisited ? '✓' : ''}
            </IconButton>
            <Box component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              #{playerWakeOrder}
            </Box>
          </Box>
        )}

        {(isRoundRobinSpeaker || isSpoken) && (
          <Box sx={{ 
            mt: 0.25, 
            px: 0.5, 
            py: 0.125, 
            borderRadius: 0.5, 
            bgcolor: isRoundRobinSpeaker ? 'warning.light' : 'action.selected',
            fontSize: '0.6rem',
            fontWeight: 700,
          }}>
            {isRoundRobinSpeaker ? 'SPK' : '✓'}
          </Box>
        )}
      </Paper>

      <ArenaSeatTagPopout ctx={ctx} seat={seat} />
      <ArenaSeatSkillPopout ctx={ctx} seat={seat} />
      <ArenaSeatCharacterPopout ctx={ctx} seat={seat} />
    </>
  )
}