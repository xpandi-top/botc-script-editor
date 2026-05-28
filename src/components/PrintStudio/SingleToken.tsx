import { useId } from 'react'
import { FONT_CSS } from '../PrintOptionsDialog'
import type { TokenPrintOptions, TokenShape } from './types'
import { getEffectiveNightOrderFromRegistry } from '../../catalog'

function isChineseText(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

function avgCharWidth(text: string, fontPx: number): number {
  return isChineseText(text) ? fontPx * 1.0 : fontPx * 0.52
}

function splitIntoTokens(text: string): string[] {
  if (isChineseText(text)) {
    const chars: string[] = []
    let i = 0
    while (i < text.length) {
      if (/[\u4e00-\u9fff]/.test(text[i])) {
        chars.push(text[i])
        i++
      } else {
        let eng = ''
        while (i < text.length && !/[\u4e00-\u9fff]/.test(text[i])) {
          eng += text[i]
          i++
        }
        if (eng) chars.push(eng)
      }
    }
    return chars
  }
  return text.split(' ')
}

/** Word-wrap ability text onto concentric arcs. Returns lines + their radii. */
function wrapArcText(text: string, outerR: number, fontPx: number, lineH: number) {
  const AVG_CHAR_W = avgCharWidth(text, fontPx)
  const lines: string[] = []
  const radii: number[] = []
  let currentR = outerR
  let currentLine = ''
  for (const word of text.split(' ')) {
    const maxChars = Math.max(2, Math.floor(Math.PI * currentR / AVG_CHAR_W))
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (candidate.length <= maxChars) {
      currentLine = candidate
    } else {
      if (currentLine) { lines.push(currentLine); radii.push(currentR); currentR -= lineH }
      currentLine = word
    }
  }
  if (currentLine) { lines.push(currentLine); radii.push(currentR) }
  return { lines, radii }
}

interface StraightLine { text: string; y: number }

function wrapStraightCircleText(text: string, cy: number, cR: number, fontPx: number, lineH: number): StraightLine[] {
  const AVG_CHAR_W = avgCharWidth(text, fontPx)
  const lines: StraightLine[] = []
  let currentY = cy - cR + fontPx * 0.5
  let currentLine = ''
  const bottomY = cy+ fontPx * 0.3

  for (const token of splitIntoTokens(text)) {
    const distFromCenter = Math.abs(currentY - cy)
    const halfWidth = Math.max(0, Math.sqrt(Math.max(0, cR * cR - distFromCenter * distFromCenter)))
    const maxChars = Math.max(2, Math.floor(2 * halfWidth / AVG_CHAR_W))
    const separator = currentLine ? (isChineseText(token) ? '' : ' ') : ''
    const candidate = currentLine ? currentLine + separator + token : token

    if (candidate.length <= maxChars) {
      currentLine = candidate
    } else {
      if (currentLine) {
        lines.push({ text: currentLine, y: currentY })
        currentY += lineH
      }
      currentLine = token
      if (currentY + lineH > bottomY) break
    }
  }
  if (currentLine && currentY + lineH <= bottomY) {
    lines.push({ text: currentLine, y: currentY })
  }
  return lines
}

interface SingleTokenProps {
  nameEn: string
  nameZh: string
  abilityEn: string
  abilityZh: string
  iconSrc?: string
  opts: TokenPrintOptions
  diamPx: number
  /** For rectangle shape: explicit width/height in px */
  rectWidthPx?: number
  rectHeightPx?: number
  /** Character ID for wake indicators */
  characterId?: string
  /** Custom tags: override name display */
  overrideLabel?: string
  /** Custom tags: override icon (emoji or img url) */
  overrideIcon?: string
  /** Custom tags: override background color */
  overrideBgColor?: string
  /** Custom tags: large center text (seat numbers) */
  centerText?: string
  centerFontPx?: number
}

function clipShape(shape: TokenShape, cx: number, cy: number, r: number, id: string) {
  let el: React.ReactElement
  if (shape === 'hexagon') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
    }).join(' ')
    el = <polygon points={pts} />
  } else if (shape === 'square') {
    el = <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={r * 0.1} />
  } else {
    el = <circle cx={cx} cy={cy} r={r} />
  }
  return (
    <clipPath id={id}>
      {el}
    </clipPath>
  )
}

function getWakeIndicators(charId: string): { firstNight: boolean; otherNight: boolean; hasSetup: boolean } {
  const eff = getEffectiveNightOrderFromRegistry()
  const firstNightList = eff.first_night ?? []
  const otherNightList = eff.other_nights ?? []
  return {
    firstNight: firstNightList.includes(charId),
    otherNight: otherNightList.includes(charId),
    hasSetup: false,
  }
}

function borderShape(shape: TokenShape, cx: number, cy: number, r: number, sw: number, color: string) {
  const half = sw / 2
  const rr = r - half
  const commonProps = { fill: 'none', stroke: color, strokeWidth: sw }
  if (shape === 'hexagon') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i
      return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`
    }).join(' ')
    return <polygon points={pts} {...commonProps} />
  }
  if (shape === 'square') {
    return <rect x={cx - rr} y={cy - rr} width={rr * 2} height={rr * 2} rx={rr * 0.1} {...commonProps} />
  }
  return <circle cx={cx} cy={cy} r={rr} {...commonProps} />
}

// ── Rectangle token ──────────────────────────────────────────────

interface RectangleTokenProps {
  nameEn: string
  nameZh: string
  abilityEn: string
  abilityZh: string
  iconSrc?: string
  opts: TokenPrintOptions
  uid: string
  widthPx: number
  heightPx: number
  overrideLabel?: string
  overrideIcon?: string
  overrideBgColor?: string
  centerText?: string
  centerFontPx?: number
}

function RectangleToken({
  nameEn, nameZh, abilityEn, abilityZh, iconSrc,
  opts, uid, widthPx, heightPx,
  overrideLabel, overrideIcon, overrideBgColor,
  centerText, centerFontPx,
}: RectangleTokenProps) {
  const W = widthPx
  const H = heightPx
  const bw = Math.max(0, opts.borderWidth * (H / 113) * 1.5)
  const rounding = H * 0.08

  const enFont = FONT_CSS[opts.fontKeyEn]
  const zhFont = FONT_CSS[opts.fontKeyZh]
  const PT_TO_PX = 96 / 72
  const nameFontPx    = opts.nameFontSize * PT_TO_PX
  const abilityFontPx = opts.abilityFontSize * PT_TO_PX

  const textColor  = opts.blackAndWhite ? '#000000' : '#1a1a1a'
  const grayFilter = opts.blackAndWhite ? 'grayscale(1)' : undefined

  const bgFill   = overrideBgColor ?? (opts.bgType === 'color' ? opts.bgColor : '#ffffff')
  const hasBgImg = opts.bgType === 'image' && opts.bgImage && !overrideBgColor

  const abilityText =
    opts.abilityDisplay === 'hidden' ? ''
    : opts.abilityDisplay === 'zh'   ? abilityZh
    : opts.abilityDisplay === 'both' ? (abilityEn && abilityZh ? `${abilityEn} / ${abilityZh}` : abilityEn || abilityZh)
    : abilityEn
  const displayAbility  = overrideLabel !== undefined ? '' : abilityText
  const displayIconSrc   = overrideIcon !== undefined ? (overrideIcon.startsWith('data:') || overrideIcon.startsWith('http') || overrideIcon.startsWith('/') || overrideIcon.startsWith('blob:') ? overrideIcon : null) : iconSrc
  const displayIconEmoji = overrideIcon !== undefined && !displayIconSrc ? overrideIcon : null

  const nameCombined =
    opts.nameDisplay === 'both' && nameEn && nameZh && nameEn !== nameZh
      ? `${nameEn} · ${nameZh}`
      : opts.nameDisplay === 'zh' ? nameZh : nameEn
  const nameDisplayStr = overrideLabel !== undefined ? overrideLabel : nameCombined

  // Icon occupies a square region equal to token height
  const iconAreaW  = H
  const iconPad    = H * 0.08
  const iconSize   = (H - iconPad * 2) * opts.iconSizeRatio
  const iconAreaX  = opts.rectIconPosition === 'left' ? 0 : W - iconAreaW
  const textAreaX  = opts.rectIconPosition === 'left' ? iconAreaW : 0
  const textAreaW  = W - iconAreaW
  const textPad    = H * 0.06

  // icon center within its area
  const iconCx = iconAreaX + iconAreaW / 2
  const iconCy = H / 2
  const iconDrawX = iconCx - iconSize / 2
  const iconDrawY = iconCy - iconSize / 2

  // name sits near top of text area, ability fills rest
  const nameY       = H * 0.28
  const abilityTop  = nameY + nameFontPx * 0.6 + textPad
  const abilityH    = H - abilityTop - textPad

  const abilityFontFamily = opts.abilityDisplay === 'both'
    ? `${enFont}, ${zhFont}`
    : opts.abilityDisplay === 'zh' ? zhFont : enFont

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', filter: grayFilter }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={`clip-${uid}`}>
          <rect x={0} y={0} width={W} height={H} rx={rounding} />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${uid})`}>
        {/* Background */}
        <rect x={0} y={0} width={W} height={H} fill={bgFill} />
        {hasBgImg && (
          <image href={opts.bgImage!} x={0} y={0} width={W} height={H}
            preserveAspectRatio={opts.bgFit === 'contain' ? 'xMidYMid meet' : opts.bgFit === 'stretch' ? 'none' : 'xMidYMid slice'} />
        )}

        {/* Divider line between icon area and text area */}
        <line
          x1={opts.rectIconPosition === 'left' ? iconAreaW : textAreaW}
          y1={bw} x2={opts.rectIconPosition === 'left' ? iconAreaW : textAreaW} y2={H - bw}
          stroke={opts.borderColor} strokeWidth={bw * 0.5} opacity={0.4}
        />

        {/* Icon */}
        {displayIconSrc && (
          <image href={displayIconSrc} x={iconDrawX} y={iconDrawY}
            width={iconSize} height={iconSize} preserveAspectRatio="xMidYMid meet" />
        )}
        {displayIconEmoji && (
          <text x={iconCx} y={iconCy} textAnchor="middle" dominantBaseline="middle"
            fontSize={iconSize * 0.75}>{displayIconEmoji}</text>
        )}

        {/* Center text (number tokens) */}
        {centerText && (
          <text x={iconCx} y={iconCy} textAnchor="middle" dominantBaseline="middle"
            fontSize={centerFontPx ?? H * 0.45} fontFamily={enFont} fontWeight="700" fill={textColor}>
            {centerText}
          </text>
        )}

        {/* Name */}
        <text
          x={textAreaX + textAreaW / 2} y={nameY}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={nameFontPx}
          fontFamily={opts.nameDisplay === 'zh' ? zhFont : enFont}
          fontWeight="600" fill={textColor}
        >
          {nameDisplayStr.length > 22 ? nameDisplayStr.slice(0, 20) + '…' : nameDisplayStr}
        </text>

        {/* Ability text */}
        {displayAbility && (
          <foreignObject x={textAreaX + textPad} y={abilityTop} width={textAreaW - textPad * 2} height={abilityH}>
            <div
              // @ts-expect-error xmlns required for SVG foreignObject
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                fontSize: `${abilityFontPx}px`,
                fontFamily: abilityFontFamily,
                textAlign: 'center',
                lineHeight: 1.2,
                color: textColor,
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
              }}
            >
              {displayAbility}
            </div>
          </foreignObject>
        )}

        {/* Watermark */}
        {opts.watermarkEnabled && opts.watermark.type === 'text' && opts.watermark.text && (
          <text
            x={W / 2} y={H / 2}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={opts.watermark.fontSize * PT_TO_PX}
            fill={opts.watermark.color} opacity={opts.watermark.opacity}
            fontFamily={enFont}
            transform={opts.watermark.position === 'center' ? `rotate(-25, ${W / 2}, ${H / 2})` : undefined}
          >
            {opts.watermark.text}
          </text>
        )}
      </g>

      {/* Border */}
      {bw > 0 && (
        <rect x={bw / 2} y={bw / 2} width={W - bw} height={H - bw}
          rx={rounding} fill="none" stroke={opts.borderColor} strokeWidth={bw} />
      )}
    </svg>
  )
}

// ── Circular / hexagon / square token ────────────────────────────

export function SingleToken({
  nameEn, nameZh, abilityEn, abilityZh, iconSrc,
  opts, diamPx, rectWidthPx, rectHeightPx, characterId,
  overrideLabel, overrideIcon, overrideBgColor,
  centerText, centerFontPx,
}: SingleTokenProps) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '')

  // ── Rectangle shape — separate render path ─────────────────────
  if (opts.shape === 'rectangle' && rectWidthPx && rectHeightPx) {
    return (
      <RectangleToken
        nameEn={nameEn} nameZh={nameZh} abilityEn={abilityEn} abilityZh={abilityZh}
        iconSrc={iconSrc} opts={opts} uid={uid}
        widthPx={rectWidthPx} heightPx={rectHeightPx}
        overrideLabel={overrideLabel} overrideIcon={overrideIcon} overrideBgColor={overrideBgColor}
        centerText={centerText} centerFontPx={centerFontPx}
      />
    )
  }

  const S = diamPx
  const cx = S / 2
  const cy = S / 2
  const r  = (S - 2) / 2  // 1px gap from edge
  const bw = Math.max(0, opts.borderWidth * (S / 189) * 1.5)
  const innerPad = S * 0.01  // minimal breathing room
  const cR = r - innerPad - bw // usable content radius (excludes border stroke)

  const enFont = FONT_CSS[opts.fontKeyEn]
  const zhFont = FONT_CSS[opts.fontKeyZh]

  // Resolve display content
  const abilityText =
    opts.abilityDisplay === 'hidden' ? ''
    : opts.abilityDisplay === 'zh' ? abilityZh
    : opts.abilityDisplay === 'both' ? (abilityEn && abilityZh ? `${abilityEn} / ${abilityZh}` : abilityEn || abilityZh)
    : abilityEn

  const displayAbility = overrideLabel !== undefined ? '' : abilityText
  const displayIconSrc = overrideIcon !== undefined ? (overrideIcon.startsWith('data:') || overrideIcon.startsWith('http') || overrideIcon.startsWith('/') || overrideIcon.startsWith('blob:') ? overrideIcon : null) : iconSrc
  const displayIconEmoji = overrideIcon !== undefined && !displayIconSrc ? overrideIcon : null

  // Background
  const bgFill = overrideBgColor ?? (opts.bgType === 'color' ? opts.bgColor : '#ffffff')
  const hasBgImg = opts.bgType === 'image' && opts.bgImage && !overrideBgColor

  // Font sizes px (1pt = 96/72 px)
  const PT_TO_PX = 96 / 72
  const nameFontPx     = opts.nameFontSize * PT_TO_PX
  const abilityFontPx  = opts.abilityFontSize * PT_TO_PX

  // Shape flags
  const isCircle = opts.shape === 'circle'
  const isHex    = opts.shape === 'hexagon'

  // Flat-top hex geometry: height = r*√3, width = 2r
  // Top flat edge at cy - hexHalfH, bottom flat edge at cy + hexHalfH
  const hexHalfH = r * Math.sqrt(3) / 2  // ≈ 0.433 * S (half of flat-to-flat hex height)

  // Icon geometry
  const iconSize = S * 0.42 * opts.iconSizeRatio
  const iconX    = cx - iconSize / 2
  // Circle: icon in lower half; Hex: centered slightly below shape-center; Square: same as circle
  const iconY = isHex
    ? cy - iconSize / 2 + hexHalfH * 0.08   // slight downward push within hex
    : cy - iconSize / 2 + S * 0.13

  // Name geometry
  const nameArcR = cR * .98
  const nameCombined =
    opts.nameDisplay === 'both' && nameEn && nameZh && nameEn !== nameZh
      ? `${nameEn} · ${nameZh}`
      : opts.nameDisplay === 'zh' ? nameZh : nameEn
  const nameDisplayStr = overrideLabel !== undefined ? overrideLabel : nameCombined
  // Flat name: hex → just above bottom flat edge; square → same as before
  const nameY = isHex
    ? cy + hexHalfH - bw - nameFontPx * 0.55   // inside bottom flat edge
    : cy + cR * .98

  // Ability area (foreignObject for hex/square, SVG text for circle)
  // Hex: from top flat edge down ~55% of hex height; width = flat-edge width (r) minus padding
  // Square: full usable width (2*cR), full top half height
  const abilityTop    = isHex ? cy - hexHalfH + bw + 3            : cy - cR
  const abilityWidth  = isHex ? r - bw * 2 - 4                    : 2 * cR
  const abilityHeight = isHex ? hexHalfH * 1.0 - bw - 3           : cR
  const abilityLeft   = cx - abilityWidth / 2

  const textColor = opts.blackAndWhite ? '#000000' : '#1a1a1a'
  const grayFilter = opts.blackAndWhite ? 'grayscale(1)' : undefined

  // Pre-compute multi-line arc text (circle top half only)
  const arcLineH = abilityFontPx * 1.01
  const { lines: arcLines, radii: arcRadii } =
    (displayAbility && opts.abilityStyle === 'arc')
      ? wrapArcText(displayAbility, cR * 0.85, abilityFontPx, arcLineH)
      : { lines: [], radii: [] }

  // Pre-compute tapered straight text for circles (top half only)
  const straightLines = (isCircle && displayAbility && opts.abilityStyle === 'straight')
    ? wrapStraightCircleText(displayAbility, cy, cR * 0.95, abilityFontPx, arcLineH)
    : []

  // Check if text was truncated
  const arcTextTruncated = opts.abilityStyle === 'arc' && displayAbility && arcLines.length > 0 &&
    arcLines.join(' ').length < displayAbility.replace(/\s+/g, ' ').trim().length
  const straightTextTruncated = opts.abilityStyle === 'straight' && displayAbility && straightLines.length > 0 &&
    straightLines.map(l => l.text).join('').length < displayAbility.replace(/\s+/g, '').length
  const isTextTruncated = arcTextTruncated || straightTextTruncated

  // Wake/setup indicators — placed within actual shape boundary
  // Hex: along horizontal mid-line (y=cy) near left/right tips; setup in upper-right safe zone
  // Circle/square: original edge positions
  const indR = cR * 0.1
  const indFirstX  = isHex ? cx - r * 0.80 : cx - cR
  const indOtherX  = isHex ? cx + r * 0.80 : cx + cR
  const indY       = cy
  const indSetupX  = isHex ? cx + r * 0.55  : cx + cR * 0.85
  const indSetupY  = isHex ? cy - hexHalfH * 0.65 : cy - cR * 0.5

  const indicators = characterId ? getWakeIndicators(characterId) : { firstNight: false, otherNight: false, hasSetup: false }
  const hasSetupMarker = opts.showSetupIndicators && /\[.*?\]/.test(displayAbility)

  // Outer SVG size
  const outerS = S

  return (
    <svg
      width={outerS}
      height={outerS}
      viewBox={`0 0 ${outerS} ${outerS}`}
      style={{ display: 'block', filter: grayFilter }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {clipShape(opts.shape, cx, cy, r, `clip-${uid}`)}
        {/* Ability arc paths (concentric, top) */}
        {arcLines.map((_, i) => (
          <path key={i} id={`arc-${uid}-${i}`} fill="none"
            d={`M ${cx - arcRadii[i]} ${cy} A ${arcRadii[i]} ${arcRadii[i]} 0 0 1 ${cx + arcRadii[i]} ${cy}`}
          />
        ))}
        {/* Bottom name arc (counter-clockwise = through bottom) */}
        {isCircle && (
          <path id={`name-arc-${uid}`} fill="none"
            d={`M ${cx - nameArcR} ${cy} A ${nameArcR} ${nameArcR} 0 0 0 ${cx + nameArcR} ${cy}`}
          />
        )}
      </defs>

      <g>
        {/* Background (clipped) */}
        <g clipPath={`url(#clip-${uid})`}>
          <rect x={0} y={0} width={S} height={S} fill={bgFill} />

          {hasBgImg && (
            <image
              href={opts.bgImage!}
              x={0} y={0} width={S} height={S}
              preserveAspectRatio={
                opts.bgFit === 'contain' ? 'xMidYMid meet'
                : opts.bgFit === 'stretch' ? 'none'
                : 'xMidYMid slice'
              }
            />
          )}

          {/* Character icon */}
          {displayIconSrc && (
            <image
              href={displayIconSrc}
              x={iconX} y={iconY}
              width={iconSize} height={iconSize}
              preserveAspectRatio="xMidYMid meet"
            />
          )}

          {/* Emoji icon (for custom tags) */}
          {displayIconEmoji && (
            <text
              x={cx} y={cy + iconSize * 0.15}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={iconSize * 0.7}
            >
              {displayIconEmoji}
            </text>
          )}

          {/* Truncated text indicator - subtle background pulse */}
          {isTextTruncated && opts.abilityDisplay !== 'hidden' && (
            <circle cx={cx} cy={cy} r={cR * 0.7} fill="#ffeb3b" opacity="0.15">
              <animate attributeName="opacity" values="0.15;0.3;0.15" dur="1.5s" repeatCount="indefinite" />
            </circle>
          )}

          {/* Wake order and setup indicators */}
          {opts.showWakeIndicators && characterId && (
            <>
              {indicators.firstNight && (
                <circle cx={indFirstX} cy={indY} r={indR} fill="#22c55e" />
              )}
              {indicators.otherNight && (
                <circle cx={indOtherX} cy={indY} r={indR} fill="#22c55e" />
              )}
              {hasSetupMarker && (
                <circle cx={indSetupX} cy={indSetupY} r={indR} fill="#f97316" />
              )}
            </>
          )}

          {/* Large center text (seat numbers) */}
          {centerText && (
            <text
              x={cx} y={cy - nameFontPx}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={centerFontPx ?? S * 0.36}
              fontFamily={enFont}
              fontWeight="700"
              fill={textColor}
            >
              {centerText}
            </text>
          )}

          {/* Ability text — multi-line concentric arcs */}
          {opts.abilityStyle === 'arc' && arcLines.map((line, i) => {
            const font = opts.abilityDisplay === 'both'
              ? (isChineseText(line) ? zhFont : enFont)
              : (opts.abilityDisplay === 'zh' ? zhFont : enFont)
            return (
              <text key={i} fill={textColor} fontSize={abilityFontPx} fontFamily={font}>
                <textPath href={`#arc-${uid}-${i}`} startOffset="50%"
                  textAnchor="middle" dy={abilityFontPx * 1.05}>
                  {line}
                </textPath>
              </text>
            )
          })}

          {/* Ability text — straight with tapered layout for circles */}
          {isCircle && straightLines.length > 0 && (
            straightLines.map((line, i) => {
              const font = opts.abilityDisplay === 'both'
                ? (isChineseText(line.text) ? zhFont : enFont)
                : (opts.abilityDisplay === 'zh' ? zhFont : enFont)
              return (
                <text key={i} fill={textColor} fontSize={abilityFontPx}
                  fontFamily={font}
                  textAnchor="middle" dominantBaseline="middle"
                  x={cx} y={line.y}>
                  {line.text}
                </text>
              )
            })
          )}

          {/* Ability text — straight for non-circle (hex/square) */}
          {!isCircle && displayAbility && opts.abilityStyle === 'straight' && (
            <foreignObject
              x={abilityLeft}
              y={abilityTop}
              width={abilityWidth}
              height={abilityHeight}
            >
              <div
                // @ts-expect-error xmlns required for SVG foreignObject
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  fontSize: `${abilityFontPx}px`,
                  fontFamily: opts.abilityDisplay === 'both'
                    ? `${enFont}, ${zhFont}`
                    : (opts.abilityDisplay === 'zh' ? zhFont : enFont),
                  textAlign: 'center',
                  lineHeight: 1.25,
                  color: textColor,
                  overflow: 'hidden',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {displayAbility}
              </div>
            </foreignObject>
          )}

          {/* Name — curved arc for circle, flat for hex/square */}
          {isCircle ? (
            <text fill={textColor} fontSize={nameFontPx}
              fontFamily={opts.nameDisplay === 'zh' ? zhFont : enFont} fontWeight="600">
              <textPath href={`#name-arc-${uid}`} startOffset="50%" textAnchor="middle" dy={-nameFontPx * 0.1}>
                {nameDisplayStr.length > 24 ? nameDisplayStr.slice(0, 22) + '…' : nameDisplayStr}
              </textPath>
            </text>
          ) : (
            <text x={cx} y={nameY} textAnchor="middle" fontSize={nameFontPx}
              fontFamily={opts.nameDisplay === 'zh' ? zhFont : enFont}
              fill={textColor} fontWeight="600">
              {nameDisplayStr.length > 18 ? nameDisplayStr.slice(0, 16) + '…' : nameDisplayStr}
            </text>
          )}

          {/* Watermark */}
          {opts.watermarkEnabled && opts.watermark.type === 'text' && opts.watermark.text && (
            <text
              x={opts.watermark.position === 'center' ? cx : opts.watermark.position === 'bottom-right' ? cx + r * 0.55 : cx}
              y={opts.watermark.position === 'center' ? cy : cy + r * 0.65}
              textAnchor={opts.watermark.position === 'bottom-right' ? 'end' : 'middle'}
              dominantBaseline="middle"
              fontSize={opts.watermark.fontSize * PT_TO_PX}
              fill={opts.watermark.color}
              opacity={opts.watermark.opacity}
              fontFamily={enFont}
              transform={opts.watermark.position === 'center' ? `rotate(-25, ${cx}, ${cy})` : undefined}
            >
              {opts.watermark.text}
            </text>
          )}

          {opts.watermarkEnabled && opts.watermark.type === 'image' && opts.watermark.imageData && (
            <image
              href={opts.watermark.imageData}
              x={opts.watermark.position === 'center' ? cx - S * 0.2 : opts.watermark.position === 'bottom-right' ? cx + r * 0.15 : cx - S * 0.2}
              y={opts.watermark.position === 'center' ? cy - S * 0.2 : cy + r * 0.3}
              width={S * 0.4}
              height={S * 0.4}
              opacity={opts.watermark.opacity}
              preserveAspectRatio="xMidYMid meet"
            />
          )}
        </g>

        {/* Border — rendered outside clip so it's always on top */}
        {bw > 0 && borderShape(opts.shape, cx, cy, r, bw, opts.borderColor)}
      </g>
    </svg>
  )
}
