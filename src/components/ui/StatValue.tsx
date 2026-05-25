/**
 * StatValue — bold numeric / metric display used throughout analytics.
 * Replaces ~30 instances of Typography with fontWeight:700 + specific size.
 *
 * The color prop stays explicit because stat values are semantically
 * colored (good=green, evil=red, etc.) — that's content, not typography.
 */
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import type { TypographyProps } from '@mui/material/Typography'
import { WEIGHT, TYPE_SCALE } from '../../theme/tokens'

const SIZE_MAP = {
  xs: TYPE_SCALE.tiny,  // 0.65rem — micro badge value
  sm: TYPE_SCALE.sm,    // 0.72rem — compact table cell
  md: TYPE_SCALE.md,    // 0.80rem — dense list stat
  lg: '0.9rem',         // near-normal stat
  xl: '1.1rem',         // prominent KPI
} as const

interface StatValueProps extends Omit<TypographyProps, 'variant'> {
  size?: keyof typeof SIZE_MAP
  sx?: SxProps<Theme>
}

export function StatValue({ children, size = 'md', sx, ...props }: StatValueProps) {
  return (
    <Typography
      sx={{
        fontSize:   SIZE_MAP[size],
        fontWeight: WEIGHT.bold,
        lineHeight: 1,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  )
}
