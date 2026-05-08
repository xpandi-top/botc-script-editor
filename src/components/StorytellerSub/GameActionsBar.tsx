import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import SaveIcon from '@mui/icons-material/Save'

interface GameActionsBarProps {
  openNewGamePanel: () => void
  setShowEditPlayersModal: (v: boolean) => void
  openEndGamePanel: () => void
  /** Localised text for tooltips / labels */
  text: { newGame?: string; editPlayers?: string; endGame?: string }
  language: string
  /**
   * Called after every action — use this to close a drawer/panel after the
   * user taps an action in the right-side bar.
   */
  onAfterAction?: () => void
  /**
   * `'toolbar'`  — horizontal row of icon-only buttons with Tooltip (CompactToolbar)
   * `'sidebar'`  — vertical column of icon + label buttons (RightConsole icon bar)
   */
  variant?: 'toolbar' | 'sidebar'
}

export function GameActionsBar({
  openNewGamePanel,
  setShowEditPlayersModal,
  openEndGamePanel,
  text,
  language,
  onAfterAction,
  variant = 'toolbar',
}: GameActionsBarProps) {
  const wrap = (fn: () => void) => () => { fn(); onAfterAction?.() }

  const actions = [
    {
      key: 'new',
      icon: <AddCircleIcon sx={{ fontSize: variant === 'sidebar' ? '1.1rem' : undefined }} />,
      label: text.newGame ?? (language === 'zh' ? '新游戏' : 'New'),
      onClick: wrap(openNewGamePanel),
    },
    {
      key: 'players',
      icon: <ManageAccountsIcon sx={{ fontSize: variant === 'sidebar' ? '1.1rem' : undefined }} />,
      label: text.editPlayers ?? (language === 'zh' ? '玩家' : 'Players'),
      onClick: wrap(() => setShowEditPlayersModal(true)),
    },
    {
      key: 'save',
      icon: <SaveIcon sx={{ fontSize: variant === 'sidebar' ? '1.1rem' : undefined }} />,
      label: text.endGame ?? (language === 'zh' ? '保存' : 'Save'),
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
              flexDirection: 'column', width: 44, p: 0.5, borderRadius: 1.5,
              border: '1px solid transparent',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.hover', color: 'text.primary', borderColor: 'divider' },
            }}
          >
            <Box sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{icon}</Box>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.02em', lineHeight: 1, color: 'inherit' }}>
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
