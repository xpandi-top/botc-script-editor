import { PresentationControls } from './PresentationControls'
import type { StorytellerContext } from './useStoryteller'
import { Box, IconButton, Typography, Chip, Tooltip, useMediaQuery, useTheme } from '@mui/material'
import UndoIcon from '@mui/icons-material/Undo'
import MenuOpenIcon from '@mui/icons-material/MenuOpen'
import { CHARACTER_DISTRIBUTION } from './constants'
import { GameActionsBar } from './GameActionsBar'
import { BgmBar } from './BgmBar'
import { LanguageToggle } from './LanguageToggle'
import { SetupCounts } from './SetupCounts'
import { useT } from '../../context/I18nContext'

/**
 * One-row toolbar above the arena (tablet and desktop).
 * Left: seat counts, script, background music. Right: undo and language.
 * From md up the game rail beside the arena is always visible, so new game /
 * assignments / save and the panel toggle only appear below md.
 */
export function CompactToolbar({ ctx }: { ctx: StorytellerContext }) {
  const {
    activeScriptTitle, activeScriptVersion, language, onLanguageChange, currentDay, aliveCount, totalCount,
    audioPlaying, setAudioPlaying, audioTracks, selectedAudioSrc, setSelectedAudioSrc,
    sendYTCommand,
    handleLocalFileChange, handleUrlTrackAdd, deleteTrack, renameTrack, openNewGamePanel, openEndGamePanel,
    showRightPanel, setShowRightPanel, showScriptPanel, setShowScriptPanel,
    setShowAssignmentCenter, linkedDealSession,
    text, undo, canUndo, bgmVolume, setBgmVolume,
  } = ctx

  const { t } = useT()
  const theme = useTheme()
  const railVisible = useMediaQuery(theme.breakpoints.up('md'))
  const nonTravelerCount = currentDay.seats.filter((s: any) => !s.isTraveler).length
  const dist = CHARACTER_DISTRIBUTION[nonTravelerCount]
  const travelerCount = currentDay.seats.filter((s: any) => s.isTraveler).length

  return (
    <>
    <PresentationControls ctx={ctx} />
    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.5, rowGap: 1, pb: 1.5, borderBottom: '1px solid', borderBottomColor: 'divider', mb: 1, flexShrink: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexShrink: 0 }}>
        <Tooltip title={t('st_alive_total')}>
          <Typography variant="h6" component="span" sx={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', fontVariantNumeric: 'tabular-nums' }}>{aliveCount}/{totalCount}</Typography>
        </Tooltip>
        {travelerCount > 0 && <Typography variant="caption" color="text.secondary">+{travelerCount}{text.travelersCount}</Typography>}
        {dist && <SetupCounts dist={dist} />}
      </Box>

      {activeScriptTitle && (
        <Chip
          label={activeScriptVersion ? `${activeScriptTitle} v${activeScriptVersion}` : activeScriptTitle}
          onClick={() => setShowScriptPanel((p: boolean) => !p)}
          color={showScriptPanel ? 'primary' : 'default'}
          variant={showScriptPanel ? 'filled' : 'outlined'}
          aria-pressed={showScriptPanel}
          sx={{ maxWidth: 240 }}
        />
      )}

      <BgmBar
        fullWidth={false}
        audioPlaying={audioPlaying}
        onTogglePlay={() => {
          // sendYTCommand MUST run synchronously inside the tap gesture for iOS Safari.
          // It is a no-op on desktop and when no YouTube track is active.
          if (audioPlaying) { sendYTCommand('pauseVideo'); setAudioPlaying(false) }
          else { sendYTCommand('playVideo'); setAudioPlaying(true) }
        }}
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
        selectSx={{ maxWidth: 180 }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
        {!railVisible && (
          <GameActionsBar
            openNewGamePanel={openNewGamePanel}
            openEndGamePanel={openEndGamePanel}
            openAssignmentCenter={() => setShowAssignmentCenter(true)}
            hasActiveDealSession={!!linkedDealSession}
            text={text}
            language={language}
            variant="toolbar"
          />
        )}
        <Tooltip title={t('undo')}>
          <span>
            <IconButton aria-label={t('undo')} onClick={undo} disabled={!canUndo}>
              <UndoIcon />
            </IconButton>
          </span>
        </Tooltip>
        {onLanguageChange && <LanguageToggle language={language} onLanguageChange={onLanguageChange} />}
        {!railVisible && (
          <Tooltip title={showRightPanel ? t('hide_menu') : t('show_menu')}>
            <IconButton aria-label={showRightPanel ? t('hide_menu') : t('show_menu')} aria-expanded={showRightPanel}
              onClick={() => setShowRightPanel((c: boolean) => !c)}>
              <MenuOpenIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
    </>
  )
}
