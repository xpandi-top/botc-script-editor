/**
 * FieldLabel — replaces the 64-instance pattern:
 *   <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
 *
 * Layout props (mb, mt, flex, etc.) stay on the caller.
 * Typography props (font, size, weight, transform) live here.
 */
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import type { TypographyProps } from '@mui/material/Typography'
import { WEIGHT } from '../../theme/tokens'

interface FieldLabelProps extends Omit<TypographyProps, 'variant' | 'color'> {
  /** bottom margin — default 0.5 (matches MUI spacing unit) */
  mb?: number
  /** uppercase ALL-CAPS section header style */
  uppercase?: boolean
  sx?: SxProps<Theme>
}

export function FieldLabel({ children, mb = 0.5, uppercase = false, sx, ...props }: FieldLabelProps) {
  return (
    <Typography
      variant="label"
      sx={{
        mb,
        ...(uppercase && {
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: WEIGHT.semibold,
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Typography>
  )
}
