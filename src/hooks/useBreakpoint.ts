import { useTheme, useMediaQuery } from '@mui/material'

export function useBreakpoint() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))   // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg')) // 600–1199px
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))    // >= 1200px
  return { isMobile, isTablet, isDesktop }
}
