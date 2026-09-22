import { Box, Badge, IconButton, Tooltip, Typography } from '@mui/material'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import SaveIcon from '@mui/icons-material/Save'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import { makeT } from '../../lib/t'

interface GameActionsBarProps {
  openNewGamePanel: () => void
  openEndGamePanel: () => void
  openAssignmentCenter: () => void
  /** Shows a small live-session dot on the Player Assignments action. */
  hasActiveDealSession?: boolean
  text: { newGame?: string; editPlayers?: string; endGame?: string }
  language: string
  onAfterAction?: () => void
  /**
   * 'toolbar'   — horizontal row of icon-only buttons with Tooltip (CompactToolbar)
   * 'sidebar'   — vertical column of icon + label buttons (RightConsole desktop sidebar)
   * 'bottombar' — horizontal row of icon + label buttons (RightConsole mobile bottom bar)
   */
  variant?: 'toolbar' | 'sidebar' | 'bottombar'
}

export function GameActionsBar({
  openNewGamePanel,
  openEndGamePanel,
  openAssignmentCenter,
  hasActiveDealSession,
  language,
  onAfterAction,
  variant = 'toolbar',
}: GameActionsBarProps) {
  const wrap = (fn: () => void) => () => { fn(); onAfterAction?.() }
  const t = makeT(language as any)

  const actions = [
    {
      key: 'new',
      icon: <AddCircleIcon />,
      label: t('new_game'),
      onClick: wrap(openNewGamePanel),
    },
    {
      key: 'assignments',
      icon: hasActiveDealSession ? <Badge color="secondary" variant="dot"><AssignmentIndIcon /></Badge> : <AssignmentIndIcon />,
      label: t('player_assignments'),
      onClick: wrap(openAssignmentCenter),
    },
    {
      key: 'save',
      icon: <SaveIcon />,
      label: t('save'),
      onClick: wrap(openEndGamePanel),
    },
  ]

  if (variant === 'sidebar') {
    return (
      <>
        {actions.map(({ key, icon, label, onClick }) => (
          <IconButton
            key={key}
            onClick={onClick}
            sx={{
              flexDirection: 'column', width: 48, p: 0.75, borderRadius: 1.5,
              border: '1px solid transparent',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary', borderColor: 'divider' },
            }}
          >
            <Box sx={{ fontSize: '1.5rem', lineHeight: 1, display: 'flex' }}>{icon}</Box>
            <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1.2, color: 'inherit' }}>
              {label}
            </Typography>
          </IconButton>
        ))}
      </>
    )
  }

  if (variant === 'bottombar') {
    return (
      <>
        {actions.map(({ key, icon, label, onClick }) => (
          <IconButton
            key={key}
            onClick={onClick}
            sx={{
              flexDirection: 'column', flex: 1, py: 0.5, px: 0.25, borderRadius: 1.5,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
            }}
          >
            <Box sx={{ fontSize: '1.5rem', lineHeight: 1, display: 'flex' }}>{icon}</Box>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, lineHeight: 1.2, color: 'inherit' }}>
              {label}
            </Typography>
          </IconButton>
        ))}
      </>
    )
  }

  // toolbar variant — horizontal, icon-only, Tooltip-wrapped
  return (
    <>
      {actions.map(({ key, icon, label, onClick }) => (
        <Tooltip key={key} title={label}>
          <IconButton size="medium" onClick={onClick}>
            {icon}
          </IconButton>
        </Tooltip>
      ))}
    </>
  )
}
