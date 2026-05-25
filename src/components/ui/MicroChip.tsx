/**
 * MicroChip — always-small Chip with fixed micro typography.
 * Replaces 30+ instances of:
 *   <Chip size="small" sx={{ fontSize:'0.65rem'|'0.68rem', height:18|20 }}>
 *
 * All layout / color props pass through to MUI Chip unchanged.
 * Only typography and height are fixed.
 */
import Chip from '@mui/material/Chip'
import type { ChipProps } from '@mui/material/Chip'
import { TYPE_SCALE } from '../../theme/tokens'

interface MicroChipProps extends Omit<ChipProps, 'size'> {
  /** height override — default 20 */
  h?: number
}

export function MicroChip({ h = 20, sx, ...props }: MicroChipProps) {
  return (
    <Chip
      size="small"
      sx={{
        fontSize: TYPE_SCALE.tiny,
        height:   h,
        '& .MuiChip-label': { px: '5px' },
        ...sx,
      }}
      {...props}
    />
  )
}
