// @ts-nocheck
import React, { useState } from 'react'
import { Box, IconButton, Select, MenuItem, Slider, Tooltip, TextField, InputAdornment, Typography } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import AddIcon from '@mui/icons-material/Add'
import LinkIcon from '@mui/icons-material/Link'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'
import { INITIAL_AUDIO_TRACKS } from './constants'

const INITIAL_SRCS = new Set(INITIAL_AUDIO_TRACKS.map((t) => t.src))

/** Derive a human-readable default name from a URL */
function deriveTrackName(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube Track'
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''
    return decodeURIComponent(seg).replace(/\.[^.]+$/, '') || 'New Track'
  } catch {
    return 'New Track'
  }
}

interface BgmBarProps {
  audioPlaying: boolean
  /** Called when user clicks play/pause toggle */
  onTogglePlay: () => void
  /** Optional stop button — rendered only when provided */
  onStop?: () => void
  audioTracks: Array<{ src: string; name: string }>
  selectedAudioSrc: string
  setSelectedAudioSrc: (src: string) => void
  bgmVolume: number
  setBgmVolume: (v: number) => void
  /** Omit to hide the file upload button */
  handleLocalFileChange?: React.ChangeEventHandler<HTMLInputElement>
  /** Omit to hide the URL button */
  handleUrlTrackAdd?: (url: string, name?: string) => void
  /** Omit to hide delete icons inside the track dropdown */
  deleteTrack?: (src: string) => void
  /** Omit to hide rename icons inside the track dropdown */
  renameTrack?: (src: string, name: string) => void
  language: string
  /**
   * 'small'  — compact pill style used in CompactToolbar (default)
   * 'medium' — matches PhaseControlPanel icon row
   * 'large'  — matches ArenaCenterContent night controls
   */
  iconSize?: 'small' | 'medium' | 'large'
  /** Extra sx for the outer pill container */
  sx?: object
  /** sx merged onto every IconButton */
  buttonSx?: object
  /** sx for the active (playing) play button — merges with buttonSx */
  activeButtonSx?: object
  /** sx for the Select */
  selectSx?: object
  /** sx for the Slider */
  sliderSx?: object
}

type UrlStep = 'url' | 'name'

export function BgmBar({
  audioPlaying, onTogglePlay, onStop,
  audioTracks, selectedAudioSrc, setSelectedAudioSrc,
  bgmVolume, setBgmVolume,
  handleLocalFileChange, handleUrlTrackAdd, deleteTrack, renameTrack,
  language,
  iconSize = 'small',
  sx, buttonSx, activeButtonSx, selectSx, sliderSx,
}: BgmBarProps) {
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlStep, setUrlStep] = useState<UrlStep>('url')
  const [pendingUrl, setPendingUrl] = useState('')
  const [urlInputValue, setUrlInputValue] = useState('')
  const [renamingSrc, setRenamingSrc] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const zh = language === 'zh'

  // Icon font-size and padding scale with iconSize
  const iconSx = iconSize === 'small' ? { fontSize: '0.9rem' } : {}
  const btnPad = iconSize === 'small' ? { p: 0.5 } : { p: 0.75 }

  function submitUrl() {
    const url = urlInputValue.trim()
    if (!url) return
    // Step 1 → step 2: move to name entry
    setPendingUrl(url)
    setUrlInputValue(deriveTrackName(url))
    setUrlStep('name')
  }

  function submitName() {
    const name = urlInputValue.trim()
    handleUrlTrackAdd?.(pendingUrl, name || deriveTrackName(pendingUrl))
    setPendingUrl('')
    setUrlInputValue('')
    setUrlStep('url')
    setShowUrlInput(false)
  }

  function cancelUrl() {
    setPendingUrl('')
    setUrlInputValue('')
    setUrlStep('url')
    setShowUrlInput(false)
  }

  function startRename(src: string, currentName: string) {
    setRenamingSrc(src)
    setRenameValue(currentName)
  }

  function submitRename() {
    if (renamingSrc && renameValue.trim()) {
      renameTrack?.(renamingSrc, renameValue.trim())
    }
    setRenamingSrc(null)
    setRenameValue('')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0, width: '100%' }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        border: '1px solid', borderColor: 'divider', borderRadius: 999,
        px: 1, py: 0.25, bgcolor: 'background.paper',
        width: '100%', boxSizing: 'border-box', minWidth: 0,
        ...sx,
      }}>

        {/* Play / Pause */}
        <Tooltip title={audioPlaying ? (zh ? '暂停BGM' : 'Pause BGM') : (zh ? '播放BGM' : 'Play BGM')}>
          <IconButton
            size={iconSize}
            onClick={onTogglePlay}
            sx={{ ...btnPad, flexShrink: 0, ...buttonSx, ...(audioPlaying ? activeButtonSx : {}) }}
          >
            {audioPlaying
              ? <PauseIcon sx={iconSx} />
              : <PlayArrowIcon sx={iconSx} />}
          </IconButton>
        </Tooltip>

        {/* Stop — optional */}
        {onStop && (
          <Tooltip title={zh ? '停止BGM' : 'Stop BGM'}>
            <IconButton size={iconSize} onClick={onStop} sx={{ ...btnPad, flexShrink: 0, ...buttonSx }}>
              <StopIcon sx={iconSx} />
            </IconButton>
          </Tooltip>
        )}

        {/* Track selector */}
        <Select
          value={selectedAudioSrc ?? ''}
          onChange={(e) => setSelectedAudioSrc(e.target.value)}
          size="small"
          sx={{
            fontSize: '0.75rem',
            flex: '1 1 60px',
            minWidth: 60,
            maxWidth: 200,
            overflow: 'hidden',
            '& .MuiSelect-select': { overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '0 !important' },
            ...selectSx,
          }}
        >
          {(audioTracks ?? []).map((t) => (
            <MenuItem
              key={t.src} value={t.src}
              sx={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: 1, pr: 0.5 }}
            >
              {renamingSrc === t.src ? (
                <TextField
                  size="small" autoFocus
                  value={renameValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setRenamingSrc(null) } }}
                  sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.75rem', py: '2px' } }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); submitRename() }} edge="end">
                            <CheckIcon sx={{ fontSize: '0.75rem' }} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              ) : (
                <>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                  {renameTrack && !INITIAL_SRCS.has(t.src) && (
                    <IconButton
                      size="small"
                      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startRename(t.src, t.name) }}
                      sx={{ p: 0.25, flexShrink: 0 }}
                      title={zh ? '重命名' : 'Rename'}
                    >
                      <DriveFileRenameOutlineIcon sx={{ fontSize: '0.75rem' }} />
                    </IconButton>
                  )}
                  {deleteTrack && !INITIAL_SRCS.has(t.src) && (
                    <IconButton
                      size="small"
                      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); deleteTrack(t.src) }}
                      sx={{ p: 0.25, flexShrink: 0 }}
                      title={zh ? '删除' : 'Remove'}
                    >
                      <DeleteIcon sx={{ fontSize: '0.75rem' }} />
                    </IconButton>
                  )}
                </>
              )}
            </MenuItem>
          ))}
        </Select>

        {/* Volume slider */}
        <Slider
          value={bgmVolume ?? 0.7}
          onChange={(_, v) => setBgmVolume(v as number)}
          min={0} max={1} step={0.05} size="small"
          sx={{ width: 60, flexShrink: 0, '& .MuiSlider-thumb': { width: 12, height: 12 }, ...sliderSx }}
        />

        {/* Add local file */}
        {handleLocalFileChange && (
          <Tooltip title={zh ? '添加本地文件' : 'Add local file'}>
            <IconButton
              size={iconSize}
              component="label"
              sx={{ ...btnPad, flexShrink: 0, border: '1px dashed', borderColor: 'primary.light', borderRadius: 999, ...buttonSx }}
            >
              <AddIcon sx={iconSx} />
              <input type="file" accept=".mp3,.ogg,.wav,.flac,.m4a,.aac" onChange={handleLocalFileChange} style={{ display: 'none' }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Add URL */}
        {handleUrlTrackAdd && (
          <Tooltip title={zh ? '添加URL链接' : 'Add URL (e.g. YouTube)'}>
            <IconButton
              size={iconSize}
              onClick={() => { if (showUrlInput) { cancelUrl() } else { setShowUrlInput(true) } }}
              sx={{ ...btnPad, flexShrink: 0, border: '1px dashed', borderColor: showUrlInput ? 'secondary.main' : 'primary.light', borderRadius: 999, ...buttonSx }}
            >
              <LinkIcon sx={iconSize === 'medium' ? {} : { fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* URL / Name input row */}
      {showUrlInput && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {urlStep === 'url' ? (
            <TextField
              size="small" autoFocus fullWidth
              placeholder={zh ? '粘贴YouTube或音频URL…' : 'Paste YouTube or audio URL…'}
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitUrl(); if (e.key === 'Escape') cancelUrl() }}
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
          ) : (
            <>
              <Typography variant="caption" sx={{ flexShrink: 0, color: 'text.secondary', fontSize: '0.7rem' }}>
                {zh ? '名称:' : 'Name:'}
              </Typography>
              <TextField
                size="small" autoFocus fullWidth
                placeholder={zh ? '输入曲目名称…' : 'Track name…'}
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitName(); if (e.key === 'Escape') cancelUrl() }}
                sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem', py: '4px' } }}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={submitName} edge="end">
                          <CheckIcon sx={{ fontSize: '0.9rem' }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </>
          )}
        </Box>
      )}
    </Box>
  )
}
