import React from 'react'
import { Box, Typography } from '@mui/material'
import { SingleToken } from './SingleToken'
import { MM_TO_PX, type TokenPrintOptions, type MarkerDef } from './types'
import { PAGE_SIZE_DEFS } from '../PrintOptionsDialog'
import {
  getDisplayName,
  getAbilityTextForScript,
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
  pinnedRevisions?: Record<string, string>
}

function buildCharacterTokens(ids: string[], pinnedRevisions?: Record<string, string>): CharacterToken[] {
  return ids.map((id) => ({
    id,
    nameEn: getDisplayName(id, 'en'),
    nameZh: getDisplayName(id, 'zh'),
    abilityEn: getAbilityTextForScript(id, 'en', pinnedRevisions),
    abilityZh: getAbilityTextForScript(id, 'zh', pinnedRevisions),
    iconSrc: getIconForCharacter(id) ?? undefined,
  }))
}

// ── Layout helpers ────────────────────────────────────────────────

function calculateGridTokensPerPage(
  pageWidthMm: number,
  pageHeightMm: number,
  tokenWidthMm: number,
  tokenHeightMm: number,
  gapMm: number,
  marginMm: number,
): number {
  const usableW = pageWidthMm - marginMm * 2
  const usableH = pageHeightMm - marginMm * 2
  const cols = usableW < tokenWidthMm  ? 1 : 1 + Math.floor((usableW - tokenWidthMm)  / (tokenWidthMm  + gapMm))
  const rows = usableH < tokenHeightMm ? 1 : 1 + Math.floor((usableH - tokenHeightMm) / (tokenHeightMm + gapMm))
  return cols * rows
}

/**
 * Compute absolute token-center positions for one page.
 *
 * circle  → row-major honeycomb packing
 *           stepX = diam + gap, stepY = stepX * √3/2, odd rows offset right by stepX/2
 *
 * hexagon → column-major flat-top staggered grid
 *           colStepX = 1.5r + gap, rowStepY = r√3 + gap, odd cols offset down by rowStepY/2
 *           positions sorted (y, x) so tokens fill in reading order
 */
function computeStaggeredPositions(
  usableWidthPx: number,
  usableHeightPx: number,
  diamPx: number,
  gapPx: number,
  shape: 'circle' | 'hexagon',
): Array<{ x: number; y: number }> {
  const r = diamPx / 2
  const positions: Array<{ x: number; y: number }> = []

  if (shape === 'circle') {
    const stepX = diamPx + gapPx
    const stepY = stepX * Math.sqrt(3) / 2
    let row = 0
    let cy = r
    while (cy <= usableHeightPx - r + 0.5) {
      const offsetX = row % 2 === 1 ? stepX / 2 : 0
      let cx = r + offsetX
      while (cx <= usableWidthPx - r + 0.5) {
        positions.push({ x: cx, y: cy })
        cx += stepX
      }
      cy += stepY
      row++
    }
  } else {
    // Flat-top hex: column-major
    // colStepX = 1.5r (horizontal tip-overlap step), rowStepY = r√3 (flat-to-flat)
    const colStepX = r * 1.5 + gapPx
    const rowStepY = r * Math.sqrt(3) + gapPx
    let col = 0
    let cx = r
    while (cx <= usableWidthPx - r + 0.5) {
      const offsetY = col % 2 === 1 ? rowStepY / 2 : 0
      let cy = r + offsetY
      while (cy <= usableHeightPx - r + 0.5) {
        positions.push({ x: cx, y: cy })
        cy += rowStepY
      }
      cx += colStepX
      col++
    }
    // Sort into reading order (top-to-bottom, left-to-right)
    const rowBucket = rowStepY / 2
    positions.sort((a, b) => {
      const ra = Math.round(a.y / rowBucket)
      const rb = Math.round(b.y / rowBucket)
      return ra !== rb ? ra - rb : a.x - b.x
    })
  }

  return positions
}

function splitIntoPages<T>(items: T[], itemsPerPage: number): T[][] {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += itemsPerPage) {
    pages.push(items.slice(i, i + itemsPerPage))
  }
  return pages
}

// ── Page renderers ────────────────────────────────────────────────

function GridPage({
  children,
  opts,
  gapPx,
  marginMm,
  showBorder = false,
}: {
  children: React.ReactNode
  opts: TokenPrintOptions
  gapPx: number
  marginMm: number
  showBorder?: boolean
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: `${gapPx}px`,
        p: `${marginMm}mm`,
        width: PAGE_SIZE_DEFS[opts.pageSize].w * MM_TO_PX,
        height: PAGE_SIZE_DEFS[opts.pageSize].h * MM_TO_PX,
        backgroundColor: '#fff',
        flexShrink: 0,
        ...(showBorder && { border: '1px dashed #ccc' }),
      }}
    >
      {children}
    </Box>
  )
}

function StaggeredPage({
  items,
  positions,
  opts,
  diamPx,
  marginPx,
  showBorder = false,
}: {
  items: React.ReactNode[]
  positions: Array<{ x: number; y: number }>
  opts: TokenPrintOptions
  diamPx: number
  marginPx: number
  showBorder?: boolean
}) {
  const r = diamPx / 2
  const { w, h } = PAGE_SIZE_DEFS[opts.pageSize]
  return (
    <Box
      sx={{
        position: 'relative',
        width: w * MM_TO_PX,
        height: h * MM_TO_PX,
        backgroundColor: '#fff',
        flexShrink: 0,
        overflow: 'hidden',
        ...(showBorder && { border: '1px dashed #ccc' }),
      }}
    >
      {items.slice(0, positions.length).map((item, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            left: marginPx + positions[i].x - r,
            top: marginPx + positions[i].y - r,
          }}
        >
          {item}
        </Box>
      ))}
    </Box>
  )
}

// ── Token renderers ───────────────────────────────────────────────

interface RenderOpts { opts: TokenPrintOptions; diamPx: number; rectWidthPx?: number; rectHeightPx?: number }

function renderCharToken(t: CharacterToken, ro: RenderOpts) {
  return (
    <SingleToken
      nameEn={t.nameEn} nameZh={t.nameZh} abilityEn={t.abilityEn} abilityZh={t.abilityZh}
      iconSrc={t.iconSrc} opts={ro.opts} diamPx={ro.diamPx}
      rectWidthPx={ro.rectWidthPx} rectHeightPx={ro.rectHeightPx}
      characterId={t.id}
    />
  )
}

function renderNumberToken(n: number, ro: RenderOpts) {
  const numFontPx = ro.opts.numberFontSize * (96 / 72)
  return (
    <SingleToken
      nameEn={ro.opts.numberLabel} nameZh={ro.opts.numberLabel} abilityEn="" abilityZh=""
      opts={{ ...ro.opts, abilityDisplay: 'hidden', bgType: 'color', bgColor: ro.opts.numberBgColor }}
      diamPx={ro.diamPx} rectWidthPx={ro.rectWidthPx} rectHeightPx={ro.rectHeightPx}
      overrideLabel={ro.opts.numberLabel} overrideBgColor={ro.opts.numberBgColor}
      centerText={String(n)} centerFontPx={numFontPx}
    />
  )
}

function renderMarkerToken(marker: MarkerDef, _idx: number, ro: RenderOpts) {
  return (
    <SingleToken
      nameEn={marker.label} nameZh={marker.label} abilityEn="" abilityZh=""
      opts={{ ...ro.opts, abilityDisplay: 'hidden', nameDisplay: 'en', bgType: 'color' }}
      diamPx={ro.diamPx} rectWidthPx={ro.rectWidthPx} rectHeightPx={ro.rectHeightPx}
      overrideLabel={marker.label} overrideIcon={marker.icon} overrideBgColor={marker.bgColor}
    />
  )
}

// ── Main component ────────────────────────────────────────────────

export function TokenPageGrid(props: TokenPageGridProps) {
  const { opts, forPrint = false, pinnedRevisions } = props
  const { w, h } = PAGE_SIZE_DEFS[opts.pageSize]
  const marginMm = opts.marginMm
  const marginPx = marginMm * MM_TO_PX
  const isRect = opts.shape === 'rectangle'
  const diamPx = opts.diameterMm * MM_TO_PX
  const rectWidthPx  = opts.rectWidthMm  * MM_TO_PX
  const rectHeightPx = opts.rectHeightMm * MM_TO_PX
  const gapPx = opts.gapMm * MM_TO_PX
  const useStaggered = opts.shape === 'circle' || opts.shape === 'hexagon'

  const staggeredPositions = useStaggered
    ? computeStaggeredPositions(
        w * MM_TO_PX - marginPx * 2,
        h * MM_TO_PX - marginPx * 2,
        diamPx,
        gapPx,
        opts.shape as 'circle' | 'hexagon',
      )
    : []
  const itemsPerPage = useStaggered
    ? Math.max(1, staggeredPositions.length)
    : isRect
      ? Math.max(1, calculateGridTokensPerPage(w, h, opts.rectWidthMm, opts.rectHeightMm, opts.gapMm, marginMm))
      : Math.max(1, calculateGridTokensPerPage(w, h, opts.diameterMm, opts.diameterMm, opts.gapMm, marginMm))

  const ro: RenderOpts = {
    opts,
    diamPx,
    rectWidthPx:  isRect ? rectWidthPx  : undefined,
    rectHeightPx: isRect ? rectHeightPx : undefined,
  }

  // ── Characters ──────────────────────────────────────────────────
  if (opts.mode === 'characters') {
    const tokens = buildCharacterTokens(opts.selectedCharacterIds, pinnedRevisions)
    if (tokens.length === 0) return null
    const pages = splitIntoPages(tokens, itemsPerPage)

    return (
      <Box>
        {pages.map((pageTokens, pageIdx) => (
          <Box key={pageIdx}>
            {!forPrint && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Page {pageIdx + 1}/{pages.length} ({pageTokens.length} tokens)
              </Typography>
            )}
            {useStaggered ? (
              <StaggeredPage
                items={pageTokens.map((t) => renderCharToken(t, ro))}
                positions={staggeredPositions}
                opts={opts} diamPx={diamPx} marginPx={marginPx} showBorder={!forPrint}
              />
            ) : (
              <GridPage opts={opts} gapPx={gapPx} marginMm={marginMm} showBorder={!forPrint}>
                {pageTokens.map((t, i) => <React.Fragment key={i}>{renderCharToken(t, ro)}</React.Fragment>)}
              </GridPage>
            )}
          </Box>
        ))}
      </Box>
    )
  }

  // ── Numbers ─────────────────────────────────────────────────────
  if (opts.tagMode === 'numbers') {
    const from = Math.min(opts.numberFrom, opts.numberTo)
    const to = Math.max(opts.numberFrom, opts.numberTo)
    const numbers = Array.from({ length: to - from + 1 }, (_, i) => from + i)
    const pages = splitIntoPages(numbers, itemsPerPage)

    return (
      <Box>
        {pages.map((pageNums, pageIdx) => (
          <Box key={pageIdx}>
            {!forPrint && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Page {pageIdx + 1}/{pages.length}
              </Typography>
            )}
            {useStaggered ? (
              <StaggeredPage
                items={pageNums.map((n) => renderNumberToken(n, ro))}
                positions={staggeredPositions}
                opts={opts} diamPx={diamPx} marginPx={marginPx} showBorder={!forPrint}
              />
            ) : (
              <GridPage opts={opts} gapPx={gapPx} marginMm={marginMm} showBorder={!forPrint}>
                {pageNums.map((n, i) => <React.Fragment key={i}>{renderNumberToken(n, ro)}</React.Fragment>)}
              </GridPage>
            )}
          </Box>
        ))}
      </Box>
    )
  }

  // ── Markers ─────────────────────────────────────────────────────
  const allMarkerTokens: Array<{ marker: MarkerDef; idx: number }> = []
  for (const marker of opts.markers) {
    for (let i = 0; i < marker.quantity; i++) {
      allMarkerTokens.push({ marker, idx: i })
    }
  }
  const pages = splitIntoPages(allMarkerTokens, itemsPerPage)

  return (
    <Box>
      {pages.map((pageMarkers, pageIdx) => (
        <Box key={pageIdx}>
          {!forPrint && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Page {pageIdx + 1}/{pages.length} ({pageMarkers.length} markers)
            </Typography>
          )}
          {useStaggered ? (
            <StaggeredPage
              items={pageMarkers.map(({ marker, idx }) => renderMarkerToken(marker, idx, ro))}
              positions={staggeredPositions}
              opts={opts} diamPx={diamPx} marginPx={marginPx} showBorder={!forPrint}
            />
          ) : (
            <GridPage opts={opts} gapPx={gapPx} marginMm={marginMm} showBorder={!forPrint}>
              {pageMarkers.map(({ marker, idx: mIdx }, i) => <React.Fragment key={i}>{renderMarkerToken(marker, mIdx, ro)}</React.Fragment>)}
            </GridPage>
          )}
        </Box>
      ))}
    </Box>
  )
}

// For actual print
export function TokenPrintPortal({ opts, pinnedRevisions }: { opts: TokenPrintOptions; pinnedRevisions?: Record<string, string> }) {
  return (
    <div className="token-print-portal" aria-hidden="true">
      <TokenPageGrid opts={opts} forPrint pinnedRevisions={pinnedRevisions} />
    </div>
  )
}

// Legacy export
export function TokenGrid(props: { opts: TokenPrintOptions; characters?: CharacterToken[]; containerWidth?: number; forPrint?: boolean }) {
  return <TokenPageGrid opts={props.opts} forPrint={props.forPrint} />
}
