// @ts-nocheck
import React from 'react'
import { Box, IconButton, Button, Chip } from '@mui/material'

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
          {cardVotedYes ? '✓' : '✗'}
        </Button>
      ) : (
        <>
          <IconButton size="medium" color="success" onClick={handleVoteYesClick} sx={{ border: '1px solid', borderColor: 'divider', p: 0.5 }}>
            ✓
          </IconButton>
          <IconButton size="medium" color="error" onClick={handleVoteNoClick} sx={{ border: '1px solid', borderColor: 'divider', p: 0.5 }}>
            ✗
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
            {isVisited ? '✓' : ''}
          </IconButton>
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            #{playerWakeOrder}
          </Box>
        </Box>
      )}

      {nightShowCharacter && stTags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.25, maxWidth: 90 }}>
          {stTags.map((tag: string) => (
            <Chip
              key={tag}
              label={tag.replace('📝', '')}
              size="small"
              sx={{ fontSize: '0.6rem', height: 16, bgcolor: 'warning.light', color: 'warning.contrastText', '& .MuiChip-label': { px: 0.5 } }}
            />
          ))}
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
      {isRoundRobinSpeaker ? 'SPK' : '✓'}
    </Box>
  )
}