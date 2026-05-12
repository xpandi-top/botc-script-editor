import type { StorytellerContext } from './useStoryteller'
import { Box, FormControl, InputLabel, Select, MenuItem, IconButton, Typography, Chip } from '@mui/material'
import UndoIcon from '@mui/icons-material/Undo'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import { CHARACTER_DISTRIBUTION } from './constants'
import { GameActionsBar } from './GameActionsBar'
import { BgmBar } from './BgmBar'

export function CompactToolbar({ ctx }: { ctx: StorytellerContext }) {
  const {
    activeScriptTitle, language, onLanguageChange, currentDay, aliveCount, totalCount,
    audioPlaying, setAudioPlaying, audioTracks, selectedAudioSrc, setSelectedAudioSrc,
    handleLocalFileChange, handleUrlTrackAdd, deleteTrack, renameTrack, openNewGamePanel, openEndGamePanel,
    setShowRightPanel, openCharacterEditor, showScriptPanel, setShowScriptPanel,
    text, undo, canUndo, bgmVolume, setBgmVolume,
  } = ctx

  const nonTravelerCount = currentDay.seats.filter((s: any) => !s.isTraveler).length
  const dist = CHARACTER_DISTRIBUTION[nonTravelerCount]
  const travelerCount = currentDay.seats.filter((s: any) => s.isTraveler).length
  const distColors: Record<string, string> = { townsfolk: '#2e6ec4', outsider: '#7c4dbf', minion: '#c45c2e', demon: '#b91c1c' }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, pb: 1.5, borderBottom: '1px solid', borderBottomColor: 'divider', mb: 1, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>{aliveCount}/{totalCount}</Typography>
          {travelerCount > 0 && <Typography variant="caption" color="text.secondary" sx={{ fontSize: 'clamp(0.65rem, 1.3vw, 0.75rem)' }}>+{travelerCount}{text.travelersCount}</Typography>}
          {dist && (
            <Box>
              <Typography variant="caption" sx={{ fontSize: 'clamp(0.72rem, 1.6vw, 1rem)', fontWeight: 600, color: distColors.townsfolk }}>{dist.townsfolk}T</Typography>
              <Typography variant="caption" sx={{ fontSize: 'clamp(0.72rem, 1.6vw, 1rem)', fontWeight: 600, color: distColors.outsider }}>{dist.outsider}O</Typography>
              <Typography variant="caption" sx={{ fontSize: 'clamp(0.72rem, 1.6vw, 1rem)', fontWeight: 600, color: distColors.minion }}>{dist.minion}M</Typography>
              <Typography variant="caption" sx={{ fontSize: 'clamp(0.72rem, 1.6vw, 1rem)', fontWeight: 600, color: distColors.demon }}>1D</Typography>
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

        <BgmBar
          audioPlaying={audioPlaying}
          onTogglePlay={() => setAudioPlaying((c: boolean) => !c)}
          audioTracks={audioTracks}
          selectedAudioSrc={selectedAudioSrc}
          setSelectedAudioSrc={setSelectedAudioSrc}
          bgmVolume={bgmVolume}
          setBgmVolume={setBgmVolume}
          handleLocalFileChange={handleLocalFileChange}
          handleUrlTrackAdd={handleUrlTrackAdd}
          deleteTrack={deleteTrack}
          renameTrack={renameTrack}
          language={language}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <GameActionsBar
          openNewGamePanel={openNewGamePanel}
          openCharacterEditor={openCharacterEditor}
          openEndGamePanel={openEndGamePanel}
          text={text}
          language={language}
          variant="toolbar"
        />
        <IconButton size="medium" onClick={undo} disabled={!canUndo} title={language === 'zh' ? '撤销' : 'Undo'}>
          <UndoIcon />
        </IconButton>
        {onLanguageChange && (
          <FormControl size="small" sx={{ minWidth: 72, '& .MuiInputBase-input': { py: '4px', fontSize: '0.8rem' }, '& .MuiInputLabel-root': { fontSize: '0.8rem' } }}>
            <InputLabel>{language === 'zh' ? '语言' : 'Lang'}</InputLabel>
            <Select value={language} label={language === 'zh' ? '语言' : 'Lang'} onChange={(e) => onLanguageChange(e.target.value)}>
              <MenuItem value="en">EN</MenuItem>
              <MenuItem value="zh">中文</MenuItem>
            </Select>
          </FormControl>
        )}
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