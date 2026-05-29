import type { StorytellerContext } from '../useStoryteller'
import type { ConsoleSection } from '../types'
import { Box, Button, Typography, Paper, Chip, TextField } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { getDisplayName } from '../../../catalog'
import { FAKE_NAMES, FAKE_NAMES_ZH } from '../constants'

export function RightConsolePlayer({
  ctx,
  toggleConsoleSection,
}: {
  ctx: StorytellerContext
  toggleConsoleSection: (section: ConsoleSection) => void
}) {
  const {
    language, text, activeConsoleSections,
    currentDay, updateSeat, updateSeatWithLog, addCustomTag,
    playerNamePool, setPlayerNamePool,
    resetSeatNames, clearUnusedCustomTags,
    selectedSeat, selectedSeatTags, seatTagDrafts, setSeatTagDrafts,
    setShowEditPlayersModal, customTagPool,
  } = ctx
  const isOpen = activeConsoleSections?.has('player')

  const isCharacterTag = (tag: string) => tag.charAt(0) === '💀'
  const getCharacterName = (tag: string) => getDisplayName([...tag].slice(1).join(''), language)
  const displayTag = (tag: string) => isCharacterTag(tag) ? getCharacterName(tag) : tag

  const travelerCount = currentDay?.seats?.filter((seat) => seat.isTraveler).length ?? 0
  const aliveCount = currentDay?.seats?.filter((seat) => seat.alive).length ?? 0
  const totalCount = currentDay?.seats?.length ?? 0

  const tagsNotChar = customTagPool?.filter((tag) => !isCharacterTag(tag)) ?? []

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <Button fullWidth onClick={() => toggleConsoleSection('player')} sx={{ justifyContent: 'space-between', textTransform: 'none' }}>
        <Typography variant="body2">{text.playerSection}</Typography>
        {isOpen ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
      </Button>
      {isOpen && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body2">
                <strong>{aliveCount}/{totalCount}</strong>
                {travelerCount > 0 && <span> +{travelerCount}{text.travelersCount}</span>}
              </Typography>
            </Box>
            <Button size="small" onClick={() => setShowEditPlayersModal(true)}>{text.editPlayers}</Button>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">{text.playerPool}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(playerNamePool ?? []).map((name, i) => {
                const isUsed = currentDay?.seats?.some((seat) => seat.name === name)
                return (
                  <Chip
                    key={`${name}-${i}`}
                    label={name}
                    size="small"
                    variant={isUsed ? 'filled' : 'outlined'}
                    onClick={() => {
                      const seat = currentDay?.seats?.find((candidateSeat) => candidateSeat.name.startsWith('Player '))
                      if (seat) updateSeat(seat.seat, (currentSeat) => ({ ...currentSeat, name }))
                    }}
                  />
                )
              })}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              <Button size="small" onClick={() => setPlayerNamePool(language === 'zh' ? [...FAKE_NAMES_ZH] : [...FAKE_NAMES])}>
                {text.loadFakeNames}
              </Button>
              <Button size="small" onClick={resetSeatNames}>{text.resetNames}</Button>
              <Button size="small" onClick={() => setPlayerNamePool([])}>{text.clear}</Button>
            </Box>
          </Box>

          {selectedSeat && (
            <Box>
              <Typography variant="subtitle2">
                {text.selectedPlayer} #{selectedSeat.seat} {selectedSeat.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                <Button size="small" variant={!selectedSeat.alive ? 'contained' : 'outlined'} onClick={() => updateSeatWithLog(selectedSeat.seat, (seat) => ({ ...seat, alive: !seat.alive }))}>
                  {text.aliveTag}
                </Button>
                <Button size="small" variant={selectedSeat.isExecuted ? 'contained' : 'outlined'} color="error" onClick={() => updateSeatWithLog(selectedSeat.seat, (seat) => ({ ...seat, isExecuted: !seat.isExecuted }))}>
                  {text.executedTag}
                </Button>
                <Button size="small" variant={selectedSeat.isTraveler ? 'contained' : 'outlined'} color="info" onClick={() => updateSeatWithLog(selectedSeat.seat, (seat) => ({ ...seat, isTraveler: !seat.isTraveler }))}>
                  {text.traveler}
                </Button>
                <Button size="small" variant={selectedSeat.hasNoVote ? 'contained' : 'outlined'} color="warning" onClick={() => updateSeatWithLog(selectedSeat.seat, (seat) => ({ ...seat, hasNoVote: !seat.hasNoVote }))}>
                  {text.noVoteTag}
                </Button>
              </Box>

              {(selectedSeatTags ?? []).length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25, mt: 0.5 }}>
                  {(selectedSeatTags ?? []).map((tag) => (
                    <Chip key={`${selectedSeat.seat}-${tag}`} label={displayTag(tag)} size="small" />
                  ))}
                </Box>
              )}

              <Box sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  label={text.addTag}
                  value={seatTagDrafts?.[selectedSeat.seat] ?? ''}
                  onChange={(e) => setSeatTagDrafts((current) => ({ ...current, [selectedSeat.seat]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(selectedSeat.seat); (document.activeElement as HTMLInputElement)?.blur() } }}
                />
                <Button size="small" onClick={() => addCustomTag(selectedSeat.seat)} sx={{ mt: 0.5 }}>+</Button>
              </Box>

              {tagsNotChar.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">{text.tagPool}</Typography>
                    <Button size="small" onClick={clearUnusedCustomTags}>{text.clearUnusedTags}</Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                    {tagsNotChar.map((tag) => (
                      <Chip
                        key={`pool-${tag}`}
                        label={tag}
                        size="small"
                        variant={selectedSeat?.customTags?.includes(tag) ? 'filled' : 'outlined'}
                        onClick={() => updateSeatWithLog(selectedSeat.seat, (seat) => ({
                          ...seat,
                          customTags: seat.customTags.includes(tag)
                            ? seat.customTags.filter((value) => value !== tag)
                            : [...seat.customTags, tag]
                        }))}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  )
}
