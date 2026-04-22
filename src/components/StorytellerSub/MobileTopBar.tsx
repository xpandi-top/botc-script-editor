import { Box, IconButton, Chip, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import UndoIcon from '@mui/icons-material/Undo'

const PHASE_COLORS: Record<string, string> = {
  night: '#17202a',
  private: '#4a3f80',
  public: '#1a5e20',
  nomination: '#7a1010',
}

export function MobileTopBar({ ctx }: { ctx: any }) {
  const {
    text, currentDay, aliveCount, totalCount,
    activeScriptTitle, showScriptPanel, setShowScriptPanel,
    setShowRightPanel, undo, canUndo,
  } = ctx

  const phaseLabel: Record<string, string> = {
    night: text.nightPhase,
    private: text.privateChat,
    public: text.publicChat,
    nomination: text.nomination,
  }

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1,
      py: 0.5,
      borderBottom: '1px solid rgba(23,32,42,0.10)',
      bgcolor: 'rgba(255,251,245,0.98)',
      flexShrink: 0,
      minHeight: 52,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <IconButton size="small" onClick={() => setShowRightPanel((c: boolean) => !c)}>
        <MenuIcon fontSize="small" />
      </IconButton>

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, overflow: 'hidden' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '0.8rem' }}>
          {aliveCount}/{totalCount}
        </Typography>

        {activeScriptTitle && (
          <Chip
            label={activeScriptTitle}
            size="small"
            onClick={() => setShowScriptPanel((p: boolean) => !p)}
            color={showScriptPanel ? 'primary' : 'default'}
            variant={showScriptPanel ? 'filled' : 'outlined'}
            sx={{ maxWidth: 110, fontSize: '0.65rem', height: 22, flexShrink: 1, minWidth: 0 }}
          />
        )}

        <Chip
          label={`Day ${currentDay.day} · ${phaseLabel[currentDay.phase] ?? currentDay.phase}`}
          size="small"
          sx={{
            bgcolor: PHASE_COLORS[currentDay.phase] ?? 'primary.main',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.65rem',
            height: 22,
            flexShrink: 0,
          }}
        />
      </Box>

      <IconButton size="small" onClick={undo} disabled={!canUndo} title="Undo">
        <UndoIcon fontSize="small" />
      </IconButton>
    </Box>
  )
}
