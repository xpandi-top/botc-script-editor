/**
 * CompactButton — ghost action button with minimal padding.
 * Replaces 14+ instances of:
 *   <Button sx={{ textTransform:'none', fontSize:'0.75rem',
 *                 py:0, px:0.75, minWidth:0 }}>
 *
 * All MUI Button props (variant, color, onClick, disabled, startIcon, etc.)
 * pass through unchanged. Only typography + padding are fixed.
 */
import Button from '@mui/material/Button'
import type { ButtonProps } from '@mui/material/Button'
import { TYPE_SCALE } from '../../theme/tokens'

export function CompactButton({ sx, ...props }: ButtonProps) {
  return (
    <Button
      sx={{
        textTransform: 'none',
        fontSize:      TYPE_SCALE.base,
        py:            0,
        px:            0.75,
        minWidth:      0,
        ...sx,
      }}
      {...props}
    />
  )
}
