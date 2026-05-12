// @ts-nocheck
import React, { useState } from 'react'
import { Box, IconButton, Select, MenuItem, Slider, Tooltip, TextField, InputAdornment } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import AddIcon from '@mui/icons-material/Add'
import LinkIcon from '@mui/icons-material/Link'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { INITIAL_AUDIO_TRACKS } from './constants'

const INITIAL_SRCS = new Set(INITIAL_AUDIO_TRACKS.map((t) => t.src))

interface BgmBarProps {
  audioPlaying: boolean
  /** Called when user clicks play/pause toggle */
  onTogglePlay: () => void
  /** Optional stop button handler — rendered only when provided */
  onStop?: () => void
  audioTracks: Array<{ src: string; name: string }>
  selectedAudioSrc: string
  setSelectedAudioSrc: (src: string) => void
  bgmVolume: number
  setBgmVolume: (v: number) => void
  /** File upload handler — omit to hide the file button */
  handleLocalFileChange?: React.ChangeEventHandler<HTMLInputElement>
  /** URL add handler — omit to hide the URL button */
  handleUrlTrackAdd?: (url: string) => void
  /** Track delete handler — omit to hide delete icons in dropdown */
  deleteTrack?: (src: string) => void
  language: string
  /** Extra sx applied to the outer container Box */
  sx?: object
  /** sx applied to each IconButton (for themed coloring inside PhaseControlPanel) */
  buttonSx?: object
  /** sx applied to the Select */
  selectSx?: object
  /** sx applied to the Slider */
  sliderSx?: object
}

export function BgmBar({
  audioPlaying, onTogglePlay, onStop,
  audioTracks, selectedAudioSrc, setSelectedAudioSrc,
  bgmVolume, setBgmVolume,
  handleLocalFileChange, handleUrlTrackAdd, deleteTrack,
  language,
  sx, buttonSx, selectSx, sliderSx,
}: BgmBarProps) {
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')

  function submitUrl() {
    if (urlInputValue.trim()) {
      handleUrlTrackAdd?.(urlInputValue.trim())
      setUrlInputValue('')
      setShowUrlInput(false)
    }
  }

  const zh = language === 'zh'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        border: '1px solid', borderColor: 'divider', borderRadius: 999,
        px: 1, py: 0.25, bgcolor: 'background.paper',
        ...sx,
      }}>
        {/* Play / Pause */}
        <Tooltip title={audioPlaying ? (zh ? '暂停BGM' : 'Pause BGM') : (zh ? '播放BGM' : 'Play BGM')}>
          <IconButton size="small" onClick={onTogglePlay} sx={{ p: 0.5, ...buttonSx }}>
            {audioPlaying
              ? <PauseIcon sx={{ fontSize: '0.9rem' }} />
              : <PlayArrowIcon sx={{ fontSize: '0.9rem' }} />}
          </IconButton>
        </Tooltip>

        {/* Stop — optional */}
        {onStop && (
          <Tooltip title={zh ? '停止BGM' : 'Stop BGM'}>
            <IconButton size="small" onClick={onStop} sx={{ p: 0.5, ...buttonSx }}>
              <StopIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Track selector */}
        <Select
          value={selectedAudioSrc ?? ''}
          onChange={(e) => setSelectedAudioSrc(e.target.value)}
          size="small"
          sx={{ fontSize: '0.75rem', ...selectSx }}
        >
          {(audioTracks ?? []).map((t) => (
            <MenuItem
              key={t.src} value={t.src}
              sx={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: 1, pr: 0.5 }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
              {deleteTrack && !INITIAL_SRCS.has(t.src) && (
                <IconButton
                  size="small"
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); deleteTrack(t.src) }}
                  sx={{ p: 0.25, flexShrink: 0 }}
                  title={zh ? '删除' : 'Remove'}
                >
                  <CloseIcon sx={{ fontSize: '0.75rem' }} />
                </IconButton>
              )}
            </MenuItem>
          ))}
        </Select>

        {/* Volume slider */}
        <Slider
          value={bgmVolume ?? 0.7}
          onChange={(_, v) => setBgmVolume(v as number)}
          min={0} max={1} step={0.05} size="small"
          sx={{ width: 60, '& .MuiSlider-thumb': { width: 12, height: 12 }, ...sliderSx }}
        />

        {/* Add local file */}
        {handleLocalFileChange && (
          <label>
            <Tooltip title={zh ? '添加本地文件' : 'Add local file'}>
              <IconButton size="medium" component="span" sx={{ p: 0.25, border: '1px dashed', borderColor: 'primary.light', borderRadius: 999, ...buttonSx }}>
                <AddIcon />
              </IconButton>
            </Tooltip>
            <input type="file" accept=".mp3,.ogg,.wav,.flac,.m4a,.aac" onChange={handleLocalFileChange} style={{ display: 'none' }} />
          </label>
        )}

        {/* Add URL */}
        {handleUrlTrackAdd && (
          <Tooltip title={zh ? '添加URL链接' : 'Add URL (e.g. YouTube)'}>
            <IconButton
              size="small"
              onClick={() => setShowUrlInput((v) => !v)}
              sx={{ p: 0.25, border: '1px dashed', borderColor: showUrlInput ? 'secondary.main' : 'primary.light', borderRadius: 999, ...buttonSx }}
            >
              <LinkIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* URL input row */}
      {showUrlInput && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
          <TextField
            size="small"
            placeholder={zh ? '粘贴YouTube或音频URL…' : 'Paste YouTube or audio URL…'}
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitUrl() }}
            autoFocus fullWidth
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
  )
}
