import { useId } from 'react'
import { FONT_CSS } from '../PrintOptionsDialog'
import type { TokenPrintOptions, TokenShape } from './types'

/** Word-wrap ability text onto concentric arcs. Returns lines + their radii. */
function wrapArcText(text: string, outerR: number, fontPx: number, lineH: number) {
  const AVG_CHAR_W = fontPx * 0.52
  const lines: string[] = []
  const radii: number[] = []
  let currentR = outerR
  let currentLine = ''
  for (const word of text.split(' ')) {
    const maxChars = Math.max(4, Math.floor(Math.PI * currentR / AVG_CHAR_W))
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

interface SingleTokenProps {
  nameEn: string
  nameZh: string
  abilityEn: string
  abilityZh: string
  iconSrc?: string
  opts: TokenPrintOptions
  diamPx: number
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
      const a = (Math.PI / 3) * i - Math.PI / 6
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

function borderShape(shape: TokenShape, cx: number, cy: number, r: number, sw: number, color: string) {
  const half = sw / 2
  const rr = r - half
  const commonProps = { fill: 'none', stroke: color, strokeWidth: sw }
  if (shape === 'hexagon') {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6
      return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`
    }).join(' ')
    return <polygon points={pts} {...commonProps} />
  }
  if (shape === 'square') {
    return <rect x={cx - rr} y={cy - rr} width={rr * 2} height={rr * 2} rx={rr * 0.1} {...commonProps} />
  }
  return <circle cx={cx} cy={cy} r={rr} {...commonProps} />
}

function CropMarks({ S, color = '#aaa' }: { S: number; color?: string }) {
  const GAP = 4
  const LEN = 8
  const lines = [
    // top-left
    [GAP, 0, GAP, LEN], [0, GAP, LEN, GAP],
    // top-right
    [S - GAP, 0, S - GAP, LEN], [S - LEN, GAP, S, GAP],
    // bottom-left
    [GAP, S - LEN, GAP, S], [0, S - GAP, LEN, S - GAP],
    // bottom-right
    [S - GAP, S - LEN, S - GAP, S], [S - LEN, S - GAP, S, S - GAP],
  ] as const
  return (
    <>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={0.5} />
      ))}
    </>
  )
}

export function SingleToken({
  nameEn, nameZh, abilityEn, abilityZh, iconSrc,
  opts, diamPx,
  overrideLabel, overrideIcon, overrideBgColor,
  centerText, centerFontPx,
}: SingleTokenProps) {
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '')

  const S = diamPx
  const cx = S / 2
  const cy = S / 2
  const r  = S * 0.46
  const bw = Math.max(0.5, opts.borderWidth * (S / 189) * 1.5)
  const innerPad = S * 0.07    // breathing room from shape edge
  const cR = r - innerPad - bw // usable content radius (excludes border stroke)
  const arcR = cR * 0.95       // arc text radius (inside content area)

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

  // Icon geometry — lower half, leaving upper area for ability text
  const iconSize  = S * 0.36 * opts.iconSizeRatio
  const iconX     = cx - iconSize / 2
  const iconY     = cy - iconSize / 2 + S * 0.13

  // Name geometry
  // For circle: single bottom arc ("EN · ZH")
  // For hex/square: flat centered text at bottom
  const isCircle = opts.shape === 'circle'
  const nameArcR = cR * 1.1          // radius for bottom name arc (larger = arc closer to edge = lower)
  const nameCombined =
    opts.nameDisplay === 'both' && nameEn && nameZh && nameEn !== nameZh
      ? `${nameEn} · ${nameZh}`
      : opts.nameDisplay === 'zh' ? nameZh : nameEn
  const nameDisplayStr = overrideLabel !== undefined ? overrideLabel : nameCombined
  // Flat name fallback (hex/square)
  const nameY = cy + cR * 0.88

  // Straight ability area — top portion, more height for long texts
  const abilityTop    = cy - cR
  const abilityWidth  = cR * 1.55
  const abilityHeight = cR * 0.90

  const textColor = opts.blackAndWhite ? '#000000' : '#1a1a1a'
  const grayFilter = opts.blackAndWhite ? 'grayscale(1)' : undefined

  // Pre-compute multi-line arc text
  const arcLineH = abilityFontPx * 1.5
  const { lines: arcLines, radii: arcRadii } =
    (displayAbility && opts.abilityStyle === 'arc')
      ? wrapArcText(displayAbility, arcR, abilityFontPx, arcLineH)
      : { lines: [], radii: [] }

  // Outer SVG size includes crop mark space
  const CROP_SPACE = opts.showCropMarks ? 16 : 0
  const outerS = S + CROP_SPACE * 2
  const offset = CROP_SPACE

  return (
    <svg
      width={outerS}
      height={outerS}
      viewBox={`0 0 ${outerS} ${outerS}`}
      style={{ display: 'block', filter: grayFilter }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {clipShape(opts.shape, cx + offset, cy + offset, r, `clip-${uid}`)}
        {/* Ability arc paths (concentric, top) */}
        {arcLines.map((_, i) => (
          <path key={i} id={`arc-${uid}-${i}`} fill="none"
            d={`M ${cx + offset - arcRadii[i]} ${cy + offset} A ${arcRadii[i]} ${arcRadii[i]} 0 0 1 ${cx + offset + arcRadii[i]} ${cy + offset}`}
          />
        ))}
        {/* Bottom name arc (counter-clockwise = through bottom) */}
        {isCircle && (
          <path id={`name-arc-${uid}`} fill="none"
            d={`M ${cx + offset - nameArcR} ${cy + offset} A ${nameArcR} ${nameArcR} 0 0 0 ${cx + offset + nameArcR} ${cy + offset}`}
          />
        )}
      </defs>

      {/* Crop marks */}
      {opts.showCropMarks && (
        <g transform={`translate(${offset}, ${offset})`}>
          <CropMarks S={S} />
        </g>
      )}

      <g transform={`translate(${offset}, ${offset})`}>
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
          {opts.abilityStyle === 'arc' && arcLines.map((line, i) => (
            <text key={i} fill={textColor} fontSize={abilityFontPx}
              fontFamily={opts.abilityDisplay === 'zh' ? zhFont : enFont}>
              <textPath href={`#arc-${uid}-${i}`} startOffset="50%"
                textAnchor="middle" dy={abilityFontPx * 1.05}>
                {line}
              </textPath>
            </text>
          ))}

          {/* Ability text — straight (foreignObject for wrapping) */}
          {displayAbility && opts.abilityStyle === 'straight' && (
            <foreignObject
              x={cx - abilityWidth / 2}
              y={abilityTop}
              width={abilityWidth}
              height={abilityHeight}
            >
              <div
                // @ts-expect-error xmlns required for SVG foreignObject
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  fontSize: `${abilityFontPx}px`,
                  fontFamily: opts.abilityDisplay === 'zh' ? zhFont : enFont,
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
