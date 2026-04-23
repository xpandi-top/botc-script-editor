import { Box, Button, Select, MenuItem, IconButton, Typography, Slider, Chip } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import AddIcon from '@mui/icons-material/Add'
import UndoIcon from '@mui/icons-material/Undo'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import { CHARACTER_DISTRIBUTION } from './constants'

export function CompactToolbar({ ctx }: { ctx: any }) {
  const {
    activeScriptTitle, language, currentDay, aliveCount, totalCount,
    audioPlaying, setAudioPlaying, audioTracks, selectedAudioSrc, setSelectedAudioSrc,
    handleLocalFileChange, openNewGamePanel, openEndGamePanel,
    setShowRightPanel, setShowEditPlayersModal, showScriptPanel, setShowScriptPanel,
    audioRef, text, undo, canUndo, bgmVolume, setBgmVolume,
  } = ctx

  const nonTravelerCount = currentDay.seats.filter((s: any) => !s.isTraveler).length
  const dist = CHARACTER_DISTRIBUTION[nonTravelerCount]
  const travelerCount = currentDay.seats.filter((s: any) => s.isTraveler).length
  const currentTrack = audioTracks.find((t: any) => t.src === selectedAudioSrc)

  const distColors: Record<string, string> = { townsfolk: '#2e6ec4', outsider: '#7c4dbf', minion: '#c45c2e', demon: '#b91c1c' }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, pb: 1.5, borderBottom: '1px solid rgba(23,32,42,0.08)', mb: 1, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{fontSize: '1rem'}} >{aliveCount}/{totalCount}</Typography>
          {travelerCount > 0 && <Typography variant="caption" color="text.secondary">+{travelerCount}{text.travelersCount}</Typography>}
          {dist && (
            <Box >
              <Typography variant="caption" sx={{ fontSize: '1rem',fontWeight: 600, color: distColors.townsfolk }}>{dist.townsfolk}T</Typography>
              <Typography variant="caption" sx={{ fontSize: '1rem', fontWeight: 600, color: distColors.outsider }}>{dist.outsider}O</Typography>
              <Typography variant="caption" sx={{ fontSize: '1rem',fontWeight: 600, color: distColors.minion }}>{dist.minion}M</Typography>
              <Typography variant="caption" sx={{ fontSize: '1rem',fontWeight: 600, color: distColors.demon }}>1D</Typography>
            </Box>
          )}
        </Box>

        {activeScriptTitle && (
          <Chip
            label={activeScriptTitle}
            onClick={() => setShowScriptPanel((p: boolean) => !p)}
            color={showScriptPanel ? 'primary' : 'default'}
            variant={showScriptPanel ? 'filled' : 'outlined'}
            size="medium"
          />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid rgba(23,32,42,0.12)', borderRadius: 999, px: 1, py: 0.25, bgcolor: 'rgba(255,255,255,0.7)' }}>
          <IconButton size="small" onClick={() => setAudioPlaying((c: boolean) => !c)} sx={{ p: 0.5 }}>
            {audioPlaying ? <PauseIcon sx={{ fontSize: '0.9rem' }} /> : <PlayArrowIcon sx={{ fontSize: '0.9rem' }} />}
          </IconButton>
          <Select
            value={selectedAudioSrc}
            onChange={(e) => setSelectedAudioSrc(e.target.value)}
            size="small"
            title={currentTrack?.name}
          >
            {audioTracks.map((t: any) => <MenuItem key={t.src} value={t.src} sx={{ fontSize: '0.75rem' }}>{t.name}</MenuItem>)}
          </Select>
          <Slider
            value={bgmVolume}
            onChange={(_, v) => setBgmVolume(v as number)}
            min={0}
            max={1}
            step={0.05}
            size="small"
            sx={{ width: 60, '& .MuiSlider-thumb': { width: 12, height: 12 } }}
          />
          <label>
            <IconButton size="medium" component="span" sx={{ p: 0.25, border: '1px dashed rgba(133,63,34,0.4)', borderRadius: 999 }}>
              <AddIcon />
            </IconButton>
            <input type="file" accept=".mp3" onChange={handleLocalFileChange} style={{ display: 'none' }} />
          </label>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {[
          { label: text.newGame, onClick: openNewGamePanel },
          { label: text.editPlayers, onClick: () => setShowEditPlayersModal(true) },
          { label: text.endGame, onClick: openEndGamePanel },
        ].map(({ label, onClick }) => (
          <Button key={label} size="medium" variant="outlined" onClick={onClick} >{label}</Button>
        ))}
        <IconButton size="medium" onClick={undo} disabled={!canUndo} title={language === 'zh' ? '撤销' : 'Undo'}>
          <UndoIcon />
        </IconButton>
        <IconButton
          size="medium"
          onClick={() => setShowRightPanel((c: boolean) => !c)}
        >
          <MenuOpenIcon/>
        </IconButton>
      </Box>
    </Box>
  )
}