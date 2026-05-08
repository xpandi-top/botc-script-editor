import type { StorytellerContext } from './useStoryteller'
import { Box, FormControl, InputLabel, Select, MenuItem, IconButton, Typography, Slider, Chip, Tooltip, TextField, InputAdornment } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import AddIcon from '@mui/icons-material/Add'
import LinkIcon from '@mui/icons-material/Link'
import UndoIcon from '@mui/icons-material/Undo'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import SaveIcon from '@mui/icons-material/Save'
import CheckIcon from '@mui/icons-material/Check'
import { useState } from 'react'
import { CHARACTER_DISTRIBUTION } from './constants'

export function CompactToolbar({ ctx }: { ctx: StorytellerContext }) {
  const {
    activeScriptTitle, language, onLanguageChange, currentDay, aliveCount, totalCount,
    audioPlaying, setAudioPlaying, audioTracks, selectedAudioSrc, setSelectedAudioSrc,
    handleLocalFileChange, handleUrlTrackAdd, openNewGamePanel, openEndGamePanel,
    setShowRightPanel, setShowEditPlayersModal, showScriptPanel, setShowScriptPanel,
    text, undo, canUndo, bgmVolume, setBgmVolume,
  } = ctx

  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')

  function submitUrl() {
    if (urlInputValue.trim()) {
      handleUrlTrackAdd(urlInputValue.trim())
      setUrlInputValue('')
      setShowUrlInput(false)
    }
  }

  const nonTravelerCount = currentDay.seats.filter((s: any) => !s.isTraveler).length
  const dist = CHARACTER_DISTRIBUTION[nonTravelerCount]
  const travelerCount = currentDay.seats.filter((s: any) => s.isTraveler).length
  const currentTrack = audioTracks.find((t: any) => t.src === selectedAudioSrc)

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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 999, px: 1, py: 0.25, bgcolor: 'background.paper' }}>
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
            <Tooltip title={language === 'zh' ? '添加本地文件' : 'Add local file'}>
              <IconButton size="medium" component="span" sx={{ p: 0.25, border: '1px dashed', borderColor: 'primary.light', borderRadius: 999 }}>
                <AddIcon />
              </IconButton>
            </Tooltip>
            <input type="file" accept=".mp3,.ogg,.wav,.flac,.m4a,.aac" onChange={handleLocalFileChange} style={{ display: 'none' }} />
          </label>
          <Tooltip title={language === 'zh' ? '添加URL链接' : 'Add URL (e.g. YouTube)'}>
            <IconButton size="small" onClick={() => setShowUrlInput((v) => !v)} sx={{ p: 0.25, border: '1px dashed', borderColor: showUrlInput ? 'secondary.main' : 'primary.light', borderRadius: 999 }}>
              <LinkIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
        {showUrlInput && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', mt: 0.5 }}>
            <TextField
              size="small"
              placeholder={language === 'zh' ? '粘贴YouTube或音频URL…' : 'Paste YouTube or audio URL…'}
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitUrl() }}
              autoFocus
              fullWidth
              sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', py: '4px' } }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={submitUrl} disabled={!urlInputValue.trim()} edge="end">
                        <CheckIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title={text.newGame}>
          <IconButton size="medium" onClick={openNewGamePanel}>
            <AddCircleIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={text.editPlayers}>
          <IconButton size="medium" onClick={() => setShowEditPlayersModal(true)}>
            <ManageAccountsIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={text.endGame}>
          <IconButton size="medium" onClick={openEndGamePanel}>
            <SaveIcon />
          </IconButton>
        </Tooltip>
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