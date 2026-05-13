/**
 * LogDetailText — renders a log detail string with inline character icons.
 *
 * Detail strings may contain `[icon:charId]` tokens that are substituted with
 * a small circular character icon.  All other text is rendered as-is.
 *
 * Usage:
 *   <LogDetailText detail="#5 添加[icon:lleech]宿主" />
 */
import React from 'react'
import { Box, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import { getIconForCharacter } from '../../catalog'

const ICON_TOKEN = /(\[icon:[^\]]+\])/g

interface Props {
  detail: string
  sx?: SxProps<Theme>
  variant?: 'body2' | 'body1' | 'caption'
}

export function LogDetailText({ detail, sx, variant = 'body2' }: Props) {
  // Fast path — no icon tokens
  if (!detail.includes('[icon:')) {
    return <Typography variant={variant} sx={{ wordBreak: 'break-word', ...sx }}>{detail}</Typography>
  }

  const parts = detail.split(ICON_TOKEN)

  return (
    <Typography
      variant={variant}
      component="span"
      sx={{ display: 'block', wordBreak: 'break-word', ...sx }}
    >
      {parts.map((part, i) => {
        const match = part.match(/^\[icon:([^\]]+)\]$/)
        if (!match) return <React.Fragment key={i}>{part}</React.Fragment>
        const charId = match[1]
        const src = charId ? getIconForCharacter(charId) : null
        if (!src) return null
        return (
          <Box
            key={i}
            component="img"
            src={src}
            alt={charId}
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              verticalAlign: 'middle',
              mx: 0.25,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
        )
      })}
    </Typography>
  )
}
