import type { StorytellerContext } from '../useStoryteller'
import type { ReactNode } from 'react'
import { useState, useMemo } from 'react'
import {
  Box, Button, IconButton, Tooltip, Typography, ToggleButton, ToggleButtonGroup,
  Select, MenuItem, TextField, useTheme,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined'
import SaveIcon from '@mui/icons-material/Save'
import { BgmBar } from '../BgmBar'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ForumIcon from '@mui/icons-material/Forum'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline'
import HowToVoteIcon from '@mui/icons-material/HowToVote'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import BedtimeIcon from '@mui/icons-material/Bedtime'
import LockIcon from '@mui/icons-material/Lock'
import GavelIcon from '@mui/icons-material/Gavel'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import DeleteIcon from '@mui/icons-material/Delete'
import { ArenaCenterNominationSheet } from './ArenaCenterNominationSheet'
import { AggregatedLogModal } from './AggregatedLogModal'
import { StorytellerSetupModal } from './StorytellerSetupModal'
import { CommunicationBoard } from '../CommunicationBoard'
import type { Phase, PublicMode } from '../types'
import { useT } from '../../../context/I18nContext'

const PHASES: Phase[] = ['night', 'private', 'public', 'nomination']

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`


const PHASE_ICONS: Record<Phase, ReactNode> = {
  night: <BedtimeIcon sx={{ fontSize: '1.5rem' }} />,
  private: <LockIcon sx={{ fontSize: '1.5rem' }} />,
  public: <WbSunnyIcon sx={{ fontSize: '1.5rem' }} />,
  nomination: <GavelIcon sx={{ fontSize: '1.5rem' }} />,
}

export function PhaseControlPanel({ ctx, collapsed, setCollapsed }: { ctx: StorytellerContext; collapsed: boolean; setCollapsed: (v: boolean) => void }) {
  const {
    language, text, currentDay, updateCurrentDay, days,
    goToNextDay, goToNextPhase, goToPreviousPhase, setSelectedDayId, setDialogState,
    hasTimer, currentTimerSeconds, isTimerRunning, setIsTimerRunning,
    setCurrentTimer, syncDayTimers, setPickerMode,
    audioPlaying, setAudioPlaying, startNight, stopNight, sendYTCommand,
    audioTracks, selectedAudioSrc, setSelectedAudioSrc, bgmVolume, setBgmVolume,
    handleLocalFileChange, handleUrlTrackAdd, deleteTrack, renameTrack,
    canNominate,
    showNominationSheet, setShowNominationSheet,
    enterNomination, moveToNextSpeaker, setPhase,
    alarmActive, setAlarmActive, nightShowCharacter, setNightShowCharacter,
    nightShowWakeOrder, setNightShowWakeOrder, openCharacterEditor,
    openNewGamePanel, openEndGamePanel,
    setShowAggLogModal,
    currentScriptCharacters,
  } = ctx

  const { t, tpl } = useT()
  const muiTheme = useTheme()

  const [timerEditing, setTimerEditing] = useState(false)
  const [timerInput, setTimerInput] = useState('')
  const [commOpen, setCommOpen] = useState(false)

  const phase = currentDay.phase
  const publicMode = currentDay.publicMode
  const seats = useMemo(() => currentDay.seats, [currentDay.seats])

  // Use the same opaque surface and ink as the rest of the app in every phase.
  const palette = muiTheme.palette
  const textColor = palette.text.primary
  const mutedColor = palette.text.secondary
  const pipColor = palette.text.disabled
  const borderColor = palette.divider
  const btnOverlay = palette.action.hover
  const btnOverlayHover = palette.action.selected
  const btnBorder = palette.divider
  const TIMER_ACTIVE_SX = { bgcolor: palette.action.selected, border: `1px solid ${palette.primary.main}` }
  const TIMER_IDLE_SX = { bgcolor: 'transparent', border: `1px solid ${borderColor}` }

  const getPhaseLabel = (p: Phase) => ({ night: text.nightPhase, private: text.privateChat, public: text.publicChat, nomination: text.nomination }[p])

  const handleTimerSave = () => {
    const [m = '0', s = '0'] = timerInput.split(':')
    setCurrentTimer((parseInt(m) || 0) * 60 + (parseInt(s) || 0))
    setTimerEditing(false)
  }

  const btnSx = { color: textColor, borderColor: btnBorder, fontSize: '0.95rem', px: 1.5, py: 0.75, minHeight: 40, minWidth: 0, fontWeight: 500, bgcolor: btnOverlay, '&:hover': { borderColor: btnBorder, bgcolor: btnOverlayHover } }
  const iconBtnSx = { color: textColor, p: 0.75 }
  // Warm accent for the phase-tab underline — distinct from the neutral action-row chrome below it
  const tabAccent = palette.primary.main
  const actionRowSx = { bgcolor: palette.action.hover, border: `1px solid ${borderColor}`, borderRadius: 2, px: 0.75, pt: 0.5, pb: 0.75 }

  if (collapsed) {
    return (
      <Box
        sx={{
          position: 'fixed', bottom: 'calc(56px + var(--safe-bottom, 0px))',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 600,
          zIndex: 1200, bgcolor: palette.background.paper,
          borderTop: `1px solid ${borderColor}`,
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75,
          cursor: 'pointer',
          minHeight: 48,
        }}
        onClick={() => setCollapsed(false)}
      >
        {/* Drag handle pip */}
        <Box sx={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 32, height: 3, borderRadius: 2, bgcolor: pipColor }} />
        <Typography sx={{
          color: alarmActive ? 'warning.light' : textColor,
          fontWeight: 700, fontSize: '0.82rem', flex: 1,
          ...(alarmActive && {
            animation: 'timerAlarmPulse 0.9s ease-in-out infinite',
            '@keyframes timerAlarmPulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.3 },
            },
          }),
        }}>
          {tpl('day_n', currentDay.day)} · {getPhaseLabel(phase)}
          {hasTimer && ` · ${fmt(currentTimerSeconds)}`}
        </Typography>
        {alarmActive && <NotificationsActiveIcon sx={{ fontSize: '1rem', color: 'warning.light' }} />}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: mutedColor }}>
          <UnfoldMoreIcon sx={{ fontSize: '1rem' }} />
          <Typography sx={{ color: mutedColor, fontSize: '0.72rem' }}>{t('expand')}</Typography>
        </Box>
      </Box>
    )
  }

  return (
    <>
      <Box
        data-tutorial="st-phase-panel"
        sx={{
          position: 'fixed',
          bottom: 'calc(56px + var(--safe-bottom, 0px))',
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 600,
          minHeight: 200,
          zIndex: 1200,
          bgcolor: palette.background.paper,
          borderTop: `1px solid ${borderColor}`,
          borderRadius: '16px',
          boxShadow: muiTheme.shadows[8],
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {/* Drag handle + collapse */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', pt: 0.5, pb: 0.25, cursor: 'pointer', flexShrink: 0 }} onClick={() => setCollapsed(true)}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: pipColor }} />
        </Box>

        <Box sx={{ overflowY: 'auto', maxHeight: '38dvh', px: 1.5, pb: 1.5 }}>
          {/* Row 1: Day navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Tooltip title={t('previous_phase')}>
              <IconButton sx={iconBtnSx} onClick={() => goToPreviousPhase()}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
            <Select
              value={currentDay.id}
              onChange={(e) => setSelectedDayId(e.target.value)}
              renderValue={(id) => { const d = days.find((day) => day.id === id); return d ? tpl('day_n', d.day) : '' }}
              sx={{ color: textColor, fontWeight: 700, fontSize: '1rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: btnBorder }, '& .MuiOutlinedInput-root': { background: 'transparent' }, '& .MuiSelect-select': { color: textColor }, background: 'transparent', minWidth: 100 }}
            >
              {days.map((d) => (
                <MenuItem key={d.id} value={d.id} sx={{ fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', gap: 1, pr: 0.5 }}>
                  <span style={{ flex: 1 }}>{tpl('day_n', d.day)}</span>
                  {days.length > 1 && (
                    <Tooltip title={t('delete_this_day')}>
                      <IconButton
                        size="small"
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDialogState({ kind: 'deleteDay', dayId: d.id, dayNum: d.day }) }}
                        sx={{ p: 0.25, flexShrink: 0, color: 'error.main', opacity: 0.7, '&:hover': { opacity: 1 } }}
                      >
                        <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </MenuItem>
              ))}
            </Select>
            <Tooltip title={t('next_phase')}>
              <IconButton sx={iconBtnSx} onClick={() => goToNextPhase()}>
                <ArrowForwardIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('communication_board')}>
              <IconButton sx={{ ...iconBtnSx, color: 'primary.main' }} onClick={() => setCommOpen(true)}>
                <ForumIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Row 2: Phase tabs — which part of the day we're in */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ToggleButtonGroup
              value={phase} exclusive
              onChange={(_, v) => v && setPhase(v)}
              sx={{
                width: '100%',
                gap: 0,
                borderBottom: `1px solid ${borderColor}`,
                '& .MuiToggleButton-root': {
                  flex: 1,
                  color: mutedColor,
                  border: 'none',
                  borderRadius: 0,
                  borderBottom: '3px solid transparent',
                  px: 1, py: 0.625, minHeight: 56, minWidth: 0,
                  bgcolor: 'transparent',
                  flexDirection: 'column',
                  gap: 0.25,
                  textTransform: 'none',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  '&:hover': { bgcolor: 'transparent', color: textColor },
                  '&.Mui-selected': { color: textColor, bgcolor: 'transparent', borderBottomColor: tabAccent, fontWeight: 700 },
                  '&.Mui-selected:hover': { bgcolor: 'transparent' },
                },
              }}
            >
              {PHASES.map(p => (
                <ToggleButton key={p} value={p}>
                  {PHASE_ICONS[p]}
                  <Typography sx={{ fontSize: '0.62rem', lineHeight: 1, color: 'inherit', fontWeight: 'inherit', userSelect: 'none' }}>
                    {getPhaseLabel(p)}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Row 3: Action toolbar — buttons the storyteller presses to DO things during this phase */}
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: mutedColor, mb: 0.375, ml: 0.25 }}>
            {t('quick_actions')}
          </Typography>
          <Box sx={{ ...actionRowSx, display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
            {phase === 'public' && (
              <Select
                value={publicMode}
                onChange={(e) => updateCurrentDay((d) => ({ ...d, publicMode: e.target.value as PublicMode }))}
                sx={{ color: textColor, fontSize: '0.9rem', '& .MuiSelect-icon': { color: mutedColor }, '& fieldset': { borderColor: btnBorder }, '& .MuiSelect-select': { color: textColor }, background: 'transparent', minWidth: 120 }}
              >
                <MenuItem value="free" sx={{ fontSize: '0.95rem' }}>{text.freeSpeech}</MenuItem>
                <MenuItem value="roundRobin" sx={{ fontSize: '0.95rem' }}>{text.roundRobinMode}</MenuItem>
              </Select>
            )}

            {/* Edit Characters */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Tooltip title={t('edit_characters')}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={openCharacterEditor}>
                  <ManageAccountsIcon />
                </IconButton>
              </Tooltip>
              <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('characters_section')}</Typography>
            </Box>

            {phase === 'night' && [
              { label: nightShowCharacter ? t('hide_characters') : t('show_characters'), active: nightShowCharacter, icon: nightShowCharacter ? <VisibilityIcon /> : <VisibilityOffIcon />, action: () => setNightShowCharacter((v: boolean) => !v) },
              { label: nightShowWakeOrder ? t('hide_wake_order') : t('show_wake_order'), active: nightShowWakeOrder, icon: <FormatListNumberedIcon />, action: () => setNightShowWakeOrder((v: boolean) => !v) },
            ].map(control => (
              <Box key={control.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                <Tooltip title={control.label}>
                  <IconButton aria-label={control.label} aria-pressed={control.active} sx={{ ...iconBtnSx, ...(control.active ? TIMER_ACTIVE_SX : TIMER_IDLE_SX), p: 0.75 }} onClick={control.action}>
                    {control.icon}
                  </IconButton>
                </Tooltip>
                <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, whiteSpace: 'nowrap' }}>{control.label}</Typography>
              </Box>
            ))}

            {/* Log */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Tooltip title={t('log')}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={() => setShowAggLogModal(true)}>
                  <ViewTimelineIcon />
                </IconButton>
              </Tooltip>
              <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('log')}</Typography>
            </Box>

            {/* New Game */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Tooltip title={t('new_game')}>
                <IconButton data-tutorial="st-new-game-btn" sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={openNewGamePanel}>
                  <AddCircleOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('new')}</Typography>
            </Box>

            {/* Save Record */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
              <Tooltip title={t('save_record')}>
                <IconButton data-tutorial="st-save-btn" sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={openEndGamePanel}>
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('save')}</Typography>
            </Box>

            {phase === 'nomination' && (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Tooltip title={t('nominate')}>
                    <IconButton sx={{ ...iconBtnSx, ...(showNominationSheet ? TIMER_ACTIVE_SX : TIMER_IDLE_SX), p: 0.75 }} onClick={() => setShowNominationSheet((v: boolean) => !v)}>
                      <HowToVoteIcon />
                    </IconButton>
                  </Tooltip>
                  <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('vote_label')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                  <Tooltip title={t('next_day')}>
                    <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={goToNextDay}>
                      <ArrowForwardIosIcon />
                    </IconButton>
                  </Tooltip>
                  <Typography sx={{ fontSize: '0.58rem', color: mutedColor, lineHeight: 1, userSelect: 'none' }}>{t('next')}</Typography>
                </Box>
              </>
            )}
          </Box>
          
          {/* Timer */}
          {hasTimer && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
              {timerEditing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <TextField
                    value={timerInput}
                    onChange={(e) => setTimerInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTimerSave()}
                    autoFocus placeholder="MM:SS"
                    slotProps={{ input: { style: { color: textColor, fontSize: '1.4rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.08em' } } }}
                    sx={{ width: 105, '& fieldset': { borderColor: btnBorder }, '& .MuiInputBase-root': { py: 0.75, background: 'transparent' } }}
                  />
                  <Button variant="contained" onClick={handleTimerSave} sx={{ minWidth: 44, px: 1, py: 1 }}><CheckIcon /></Button>
                  <Button variant="outlined" onClick={() => setTimerEditing(false)} sx={{ ...btnSx, minWidth: 44, px: 1, py: 1 }}><CloseIcon /></Button>
                </Box>
              ) : (
                <Box
                  onClick={() => { setTimerInput(fmt(currentTimerSeconds)); setTimerEditing(true) }}
                  sx={{
                    fontFamily: 'monospace', fontSize: '1.35rem', fontWeight: 700,
                    color: alarmActive ? 'warning.light' : textColor,
                    px: 1, py: 0.125, borderRadius: 1,
                    border: `1px solid ${btnBorder}`,
                    cursor: 'pointer', letterSpacing: '0.08em',
                    '&:hover': { bgcolor: btnOverlay },
                    // Pulse animation when alarm fires
                    ...(alarmActive && {
                      animation: 'timerAlarmPulse 0.9s ease-in-out infinite',
                      '@keyframes timerAlarmPulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.25 },
                      },
                    }),
                  }}
                >
                  {fmt(currentTimerSeconds)}
                </Box>
              )}
              <IconButton sx={{ ...iconBtnSx, p: 0.75 }} onClick={() => setAlarmActive(false)}><NotificationsActiveIcon /></IconButton>
              <IconButton sx={isTimerRunning ? { ...iconBtnSx, ...TIMER_ACTIVE_SX, p: 0.75 } : { ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={() => { setIsTimerRunning((c: boolean) => !c); if (alarmActive) setAlarmActive(false) }}>
                {isTimerRunning ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>
              <IconButton sx={{ ...iconBtnSx, p: 0.75 }} onClick={() => { updateCurrentDay(syncDayTimers); setIsTimerRunning(false) }}><RefreshIcon /></IconButton>
              <IconButton sx={{ ...iconBtnSx, p: 0.75 }} onClick={() => { setIsTimerRunning(false); setAlarmActive(false); setCurrentTimer(0) }}><StopIcon /></IconButton>
            </Box>
          )}

          {/* Night controls */}
          {phase === 'night' && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, flexDirection: 'column' }}>
              <BgmBar
                audioPlaying={audioPlaying}
                onTogglePlay={() => {
                  // Call sendYTCommand SYNCHRONOUSLY here — inside the user gesture.
                  // On iOS Safari postMessage to a cross-origin iframe must happen
                  // in the same call stack as the gesture; useEffect fires too late.
                  if (audioPlaying) { sendYTCommand('pauseVideo'); setAudioPlaying(false) }
                  else { sendYTCommand('playVideo'); startNight() }
                }}
                onStop={stopNight}
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
                iconSize="medium"
                sx={{ border: `1px solid ${btnBorder}`, bgcolor: 'transparent', borderRadius: 2, px: 0.5, py: 0.5 }}
                buttonSx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }}
                activeButtonSx={{ ...TIMER_ACTIVE_SX }}
                selectSx={{
                  color: textColor,
                  '.MuiOutlinedInput-notchedOutline': { borderColor: btnBorder },
                  '.MuiSvgIcon-root': { color: textColor },
                }}
                sliderSx={{ color: textColor }}
              />

            </Box>
          )}

          {/* Public round robin controls */}
          {phase === 'public' && publicMode === 'roundRobin' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ color: textColor, fontWeight: 700, fontSize: '1.15rem', minWidth: 32, textAlign: 'center' }}>
                #{currentDay.currentSpeakerSeat ?? '—'}
              </Typography>
              <Tooltip title={text.chooseSpeaker}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={() => setPickerMode('speaker')}>
                  <PersonAddIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={text.randomSpeaker}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={() => {
                  const all = seats.map((s) => s.seat)
                  const r = all[Math.floor(Math.random() * Math.max(all.length, 1))]
                  updateCurrentDay((d) => ({ ...d, currentSpeakerSeat: r ?? 1, roundRobinSpokenSeats: [] }))
                }}>
                  <ShuffleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={text.nextSpeaker}>
                <IconButton sx={{ ...iconBtnSx, ...TIMER_IDLE_SX, p: 0.75 }} onClick={moveToNextSpeaker}>
                  <SkipNextIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Public free — nomination gate */}
          {phase === 'public' && publicMode === 'free' && canNominate && (
            <Box sx={{ mb: 1 }}>
              {canNominate
                ? <Button variant="contained" onClick={enterNomination} sx={{ borderRadius: 999, fontSize: '0.95rem', px: 2, py: 0.75, minHeight: 40 }}>{text.startNomination}</Button>
                : null
              }
            </Box>
          )}

        </Box>
      </Box>
      <ArenaCenterNominationSheet ctx={ctx} />
      <AggregatedLogModal ctx={ctx} />
      <StorytellerSetupModal ctx={ctx} />
      <CommunicationBoard
        open={commOpen}
        onClose={() => setCommOpen(false)}
        scriptCharacters={currentScriptCharacters}
        language={language}
      />
    </>
  )
}
