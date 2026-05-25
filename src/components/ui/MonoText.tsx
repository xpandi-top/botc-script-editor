/**
 * MonoText — monospaced text for timers, IDs, version strings, seat numbers.
 * Replaces 19 inline `fontFamily: 'monospace'` occurrences.
 */
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import type { TypographyProps } from '@mui/material/Typography'
import { FONT, WEIGHT, TYPE_SCALE } from '../../theme/tokens'

const SIZE_MAP = {
  sm: TYPE_SCALE.base,  // 0.75rem — inline ID / version badge
  md: TYPE_SCALE.ui,    // 0.90rem — compact timer display
  lg: '1.1rem',         // prominent timer
  xl: '1.5rem',         // hero timer / seat number
} as const

interface MonoTextProps extends Omit<TypographyProps, 'variant'> {
  variant?: TypographyProps['variant']
  size?: keyof typeof SIZE_MAP
  bold?: boolean
  sx?: SxProps<Theme>
}

export function MonoText({ children, variant = 'caption', size, bold = false, sx, ...props }: MonoTextProps) {
  return (
    <Typography
      variant={variant}
      sx={{
        fontFamily: FONT.mono,
        ...(bold && { fontWeight: WEIGHT.bold }),
        ...(size && { fontSize: SIZE_MAP[size] }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  )
}
