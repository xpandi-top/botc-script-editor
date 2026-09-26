/**
 * Secondary row / card actions (the "…" buttons) stay visible on touch screens,
 * but on mouse-driven screens they appear only while the row is hovered or has
 * keyboard focus, so long lists are not a column of identical icons.
 */
export const HOVER_REVEAL_CLASS = 'hover-reveal'

export const hoverRevealSx = {
  '@media (hover: hover) and (pointer: fine)': {
    [`& .${HOVER_REVEAL_CLASS}`]: { opacity: 0, transition: 'opacity 0.15s ease' },
    [`&:hover .${HOVER_REVEAL_CLASS}, &:focus-within .${HOVER_REVEAL_CLASS}`]: { opacity: 1 },
  },
} as const
