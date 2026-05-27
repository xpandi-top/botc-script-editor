import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import type { DialogProps } from '@mui/material/Dialog'
import type { DialogActionsProps } from '@mui/material/DialogActions'
import type { DialogContentProps } from '@mui/material/DialogContent'
import type { SxProps, Theme } from '@mui/material/styles'
import { useBreakpoint } from '../../hooks/useBreakpoint'

type MobileMode = 'fullScreen' | 'compact'

interface ResponsiveDialogProps extends Omit<DialogProps, 'fullScreen'> {
  mobile?: MobileMode
  paperSx?: SxProps<Theme>
}

export function ResponsiveDialog({
  mobile = 'fullScreen',
  maxWidth = 'sm',
  fullWidth = true,
  paperSx,
  slotProps,
  ...props
}: ResponsiveDialogProps) {
  const { isMobile } = useBreakpoint()
  const isFullScreenMobile = mobile === 'fullScreen' && isMobile
  const paperSlot = slotProps?.paper ?? {}
  const basePaperSx: SxProps<Theme> = {
    m: mobile === 'fullScreen' ? { xs: 0, sm: 2 } : { xs: 0.75, sm: 2 },
    ...(mobile === 'fullScreen' && { width: { xs: '100%', sm: undefined } }),
    maxHeight: { xs: '100dvh', sm: '92vh' },
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: mobile === 'fullScreen' ? { xs: 0, sm: 2 } : 2,
  }

  return (
    <Dialog
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={isFullScreenMobile}
      slotProps={{
        ...slotProps,
        paper: {
          ...paperSlot,
          sx: [basePaperSx, (paperSlot as { sx?: SxProps<Theme> }).sx, paperSx].filter(Boolean) as any,
        },
      }}
      {...props}
    />
  )
}

export function ResponsiveDialogContent({ sx, ...props }: DialogContentProps) {
  return (
    <DialogContent
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        ...sx,
      }}
      {...props}
    />
  )
}

export function ResponsiveDialogActions({ sx, ...props }: DialogActionsProps) {
  return (
    <DialogActions
      sx={{
        flexWrap: 'wrap',
        gap: 1,
        px: { xs: 2, sm: 3 },
        pt: 1,
        pb: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 2 },
        ...sx,
      }}
      {...props}
    />
  )
}
