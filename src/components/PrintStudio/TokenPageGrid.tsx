import { Box, Typography } from '@mui/material'
import { SingleToken } from './SingleToken'
import { MM_TO_PX, type TokenPrintOptions, type MarkerDef } from './types'
import { PAGE_SIZE_DEFS } from '../PrintOptionsDialog'
import {
  getDisplayName,
  getAbilityText,
  getIconForCharacter,
} from '../../catalog'

interface CharacterToken {
  id: string
  nameEn: string
  nameZh: string
  abilityEn: string
  abilityZh: string
  iconSrc?: string
}

interface TokenPageGridProps {
  opts: TokenPrintOptions
  forPrint?: boolean
  language?: 'en' | 'zh'
}

function buildCharacterTokens(ids: string[]): CharacterToken[] {
  return ids.map((id) => ({
    id,
    nameEn: getDisplayName(id, 'en'),
    nameZh: getDisplayName(id, 'zh'),
    abilityEn: getAbilityText(id, 'en'),
    abilityZh: getAbilityText(id, 'zh'),
    iconSrc: getIconForCharacter(id) ?? undefined,
  }))
}

function calculateTokensPerRow(pageWidthMm: number, diamMm: number, gapMm: number, marginMm: number): number {
  const usableWidth = pageWidthMm - marginMm * 2
  if (diamMm + gapMm > usableWidth) return 1
  const tokensPlusGaps = usableWidth - diamMm
  return 1 + Math.floor(tokensPlusGaps / (diamMm + gapMm))
}

function calculateTokensPerColumn(pageHeightMm: number, diamMm: number, gapMm: number, marginMm: number): number {
  const usableHeight = pageHeightMm - marginMm * 2
  if (diamMm + gapMm > usableHeight) return 1
  const tokensPlusGaps = usableHeight - diamMm
  return 1 + Math.floor(tokensPlusGaps / (diamMm + gapMm))
}

function splitIntoPages<T>(items: T[], itemsPerPage: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage))
  }
  return pages
}

function TokenPage({
  tokens,
  opts,
  diamPx,
  gapPx,
  marginMm,
  showBorder = false,
}: {
  tokens: CharacterToken[]
  opts: TokenPrintOptions
  diamPx: number
  gapPx: number
  marginMm: number
  showBorder?: boolean
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${gapPx}px`,
        p: `${marginMm}mm`,
        ...(showBorder && { border: '1px dashed #ccc' }),
        width: PAGE_SIZE_DEFS[opts.pageSize].w*MM_TO_PX,
        height: PAGE_SIZE_DEFS[opts.pageSize].h*MM_TO_PX,
        backgroundColor: '#fff',
      }}
    >
      {tokens.map((t) => (
        <SingleToken
          key={t.id}
          nameEn={t.nameEn}
          nameZh={t.nameZh}
          abilityEn={t.abilityEn}
          abilityZh={t.abilityZh}
          iconSrc={t.iconSrc}
          opts={opts}
          diamPx={diamPx}
          characterId={t.id}
        />
      ))}
    </Box>
  )
}

function NumberTokenPage({
  opts,
  diamPx,
  gapPx,
  marginMm,
  showBorder = false,
}: {
  opts: TokenPrintOptions
  diamPx: number
  gapPx: number
  marginMm: number
  showBorder?: boolean
}) {
  const from = Math.min(opts.numberFrom, opts.numberTo)
  const to = Math.max(opts.numberFrom, opts.numberTo)
  const numFontPx = opts.numberFontSize * (96 / 72)

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${gapPx}px`,
        p: `${marginMm}mm`,
        ...(showBorder && { border: '1px dashed #ccc' }),
      }}
    >
      {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((n) => (
        <SingleToken
          key={n}
          nameEn={opts.numberLabel}
          nameZh={opts.numberLabel}
          abilityEn=""
          abilityZh=""
          opts={{ ...opts, abilityDisplay: 'hidden', bgType: 'color', bgColor: opts.numberBgColor }}
          diamPx={diamPx}
          overrideLabel={opts.numberLabel}
          overrideBgColor={opts.numberBgColor}
          centerText={String(n)}
          centerFontPx={numFontPx}
        />
      ))}
    </Box>
  )
}

function MarkerTokenPage({
  markerTokens,
  opts,
  diamPx,
  gapPx,
  marginMm,
  showBorder = false,
}: {
  markerTokens: Array<{ marker: MarkerDef; idx: number }>
  opts: TokenPrintOptions
  diamPx: number
  gapPx: number
  marginMm: number
  showBorder?: boolean
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${gapPx}px`,
        p: `${marginMm}mm`,
        ...(showBorder && { border: '1px dashed #ccc' }),
      }}
    >
      {markerTokens.map(({ marker, idx }) => (
        <SingleToken
          key={`${marker.id}-${idx}`}
          nameEn={marker.label}
          nameZh={marker.label}
          abilityEn=""
          abilityZh=""
          opts={{ ...opts, abilityDisplay: 'hidden', nameDisplay: 'en', bgType: 'color' }}
          diamPx={diamPx}
          overrideLabel={marker.label}
          overrideIcon={marker.icon}
          overrideBgColor={marker.bgColor}
        />
      ))}
    </Box>
  )
}

export function TokenPageGrid(props: TokenPageGridProps) {
  const { opts, forPrint = false } = props
  const { w, h } = PAGE_SIZE_DEFS[opts.pageSize]
  const marginMm = opts.marginMm
  const diamPx = opts.diameterMm * MM_TO_PX
  const gapPx = opts.gapMm * MM_TO_PX

  const tokensPerRow = calculateTokensPerRow(w, opts.diameterMm, opts.gapMm, marginMm)
  const tokensPerCol = calculateTokensPerColumn(h, opts.diameterMm, opts.gapMm, marginMm)
  const tokensPerPage = tokensPerRow * tokensPerCol

  if (opts.mode === 'characters') {
    const tokens = buildCharacterTokens(opts.selectedCharacterIds)
    if (tokens.length === 0) return null
    const pages = splitIntoPages(tokens, tokensPerPage)

    return (
      <Box>
        {pages.map((pageTokens, pageIdx) => (
          <Box key={pageIdx}>
            {!forPrint && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Page {pageIdx + 1}/{pages.length} ({pageTokens.length} tokens)
              </Typography>
            )}
            <TokenPage tokens={pageTokens} opts={opts} diamPx={diamPx} gapPx={gapPx} marginMm={marginMm} showBorder={!forPrint} />
          </Box>
        ))}
      </Box>
    )
  }

  if (opts.tagMode === 'numbers') {
    const from = Math.min(opts.numberFrom, opts.numberTo)
    const to = Math.max(opts.numberFrom, opts.numberTo)
    const totalCount = to - from + 1
    const allNums = Array.from({ length: totalCount }, (_, i) => from + i)
    const pages = splitIntoPages(allNums, tokensPerPage)

    return (
      <Box>
        {pages.map((_, pageIdx) => (
          <Box key={pageIdx}>
            {!forPrint && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Page {pageIdx + 1}/{pages.length}
              </Typography>
            )}
            <NumberTokenPage opts={opts} diamPx={diamPx} gapPx={gapPx} marginMm={marginMm} showBorder={!forPrint} />
          </Box>
        ))}
      </Box>
    )
  }

  // Markers mode
  const allMarkerTokens: Array<{ marker: MarkerDef; idx: number }> = []
  for (const marker of opts.markers) {
    for (let i = 0; i < marker.quantity; i++) {
      allMarkerTokens.push({ marker, idx: i })
    }
  }
  const pages = splitIntoPages(allMarkerTokens, tokensPerPage)

  return (
    <Box>
      {pages.map((pageTokens, pageIdx) => (
        <Box key={pageIdx}>
          {!forPrint && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Page {pageIdx + 1}/{pages.length} ({pageTokens.length} markers)
            </Typography>
          )}
          <MarkerTokenPage markerTokens={pageTokens} opts={opts} diamPx={diamPx} gapPx={gapPx} marginMm={marginMm} showBorder={!forPrint} />
        </Box>
      ))}
    </Box>
  )
}

// For actual print (uses token-print-portal class)
export function TokenPrintPortal({ opts }: { opts: TokenPrintOptions }) {
  return (
    <div className="token-print-portal" aria-hidden="true">
      <TokenPageGrid opts={opts} forPrint />
    </div>
  )
}

// Legacy export for backward compatibility
export function TokenGrid(props: { opts: TokenPrintOptions; characters?: CharacterToken[]; containerWidth?: number; forPrint?: boolean }) {
  return <TokenPageGrid opts={props.opts} forPrint={props.forPrint} />
}