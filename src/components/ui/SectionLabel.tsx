/**
 * SectionLabel — ALL-CAPS category divider / option group header.
 * Replaces the 14-instance pattern:
 *   <Typography variant="caption" color="text.secondary"
 *     sx={{ display:'block', mb:0.75, textTransform:'uppercase',
 *           letterSpacing:'0.5px', fontWeight:600 }}>
 */
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'
import type { TypographyProps } from '@mui/material/Typography'

interface SectionLabelProps extends Omit<TypographyProps, 'variant' | 'color'> {
  /** bottom margin — default 0.75 */
  mb?: number
  sx?: SxProps<Theme>
}

export function SectionLabel({ children, mb = 0.75, sx, ...props }: SectionLabelProps) {
  return (
    <Typography
      variant="sectionHeader"
      sx={{ mb, ...sx }}
      {...props}
    >
      {children}
    </Typography>
  )
}
