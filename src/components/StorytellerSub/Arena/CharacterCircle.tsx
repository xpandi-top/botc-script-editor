import type { MouseEvent } from 'react'
import { Box } from '@mui/material'

interface Props {
  charIcon: string | null
  charName: string
  nightShowCharacter: boolean
  isOpen: boolean
  onClick: (e: MouseEvent<HTMLElement>) => void
  size?: number
  disabled?: boolean
}

export function CharacterCircle({ charIcon, charName, nightShowCharacter, isOpen, onClick, size = 60, disabled = false }: Props) {
  const revealed = nightShowCharacter && charIcon

  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid',
        borderColor: disabled ? 'divider' : isOpen ? 'primary.main' : revealed ? 'primary.light' : 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: isOpen && !disabled ? 3 : 1,
        flexShrink: 0,
        overflow: 'hidden',
        zIndex: 2,
        opacity: disabled ? 0.45 : 1,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
        '&:hover': disabled ? {} : { boxShadow: 3, borderColor: 'primary.main' },
      }}
    >
      {revealed ? (
        <>
          <Box
            component="img"
            src={charIcon as string}
            alt={charName}
            sx={{ width: size * 0.48, height: size * 0.48, objectFit: 'contain', flexShrink: 0 }}
          />
          <Box sx={{
            fontSize: `${Math.max(size * 0.13, 8)}px`,
            fontWeight: 600,
            lineHeight: 1.1,
            textAlign: 'center',
            color: 'text.primary',
            px: 0.25,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {charName.length > 9 ? charName.slice(0, 8) + '…' : charName}
          </Box>
        </>
      ) : (
        <Box sx={{ fontSize: `${size * 0.38}px`, color: 'text.secondary', fontWeight: 400, lineHeight: 1, userSelect: 'none' }}>
          ?
        </Box>
      )}
    </Box>
  )
}
