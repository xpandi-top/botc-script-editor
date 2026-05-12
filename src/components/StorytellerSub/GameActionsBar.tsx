import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import SaveIcon from '@mui/icons-material/Save'

interface GameActionsBarProps {
  openNewGamePanel: () => void
  openCharacterEditor: () => void
  openEndGamePanel: () => void
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
  openCharacterEditor,
  openEndGamePanel,
  language,
  onAfterAction,
  variant = 'toolbar',
}: GameActionsBarProps) {
  const wrap = (fn: () => void) => () => { fn(); onAfterAction?.() }
  const zh = language === 'zh'

  const actions = [
    {
      key: 'new',
      icon: <AddCircleIcon />,
      label: zh ? '新游戏' : 'New',
      onClick: wrap(openNewGamePanel),
    },
    {
      key: 'players',
      icon: <ManageAccountsIcon />,
      label: zh ? '玩家' : 'Edit',
      onClick: wrap(openCharacterEditor),
    },
    {
      key: 'save',
      icon: <SaveIcon />,
      label: zh ? '保存' : 'Save',
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
