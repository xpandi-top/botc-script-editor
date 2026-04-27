import { Box } from '@mui/material'
import { SingleToken } from './SingleToken'
import { MM_TO_PX } from './types'
import type { TokenPrintOptions, MarkerDef } from './types'
import { PAGE_SIZE_DEFS } from '../PrintOptionsDialog'
import {
  getDisplayName,
  getAbilityText,
  getIconForCharacter,
} from '../../catalog'
import type { Language } from '../../types'

interface CharacterToken {
  id: string
  nameEn: string
  nameZh: string
  abilityEn: string
  abilityZh: string
  iconSrc?: string
}

interface TokenGridProps {
  opts: TokenPrintOptions
  characters: CharacterToken[]
  /** Container width in px — tokens wrap to fill this width */
  containerWidth: number
  /** If true, renders for @media print (no preview chrome) */
  forPrint?: boolean
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

export function TokenGrid({ opts, containerWidth: _containerWidth, forPrint: _forPrint }: TokenGridProps) {
  const diamPx = opts.diameterMm * MM_TO_PX
  const gapPx  = opts.gapMm * MM_TO_PX

  if (opts.mode === 'characters') {
    const tokens = buildCharacterTokens(opts.selectedCharacterIds)
    if (tokens.length === 0) return null
    return (
      <Box sx={{
        display: 'flex', flexWrap: 'wrap',
        gap: `${gapPx}px`,
      }}>
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
          />
        ))}
      </Box>
    )
  }

  // Custom tags mode
  if (opts.tagMode === 'numbers') {
    const from = Math.min(opts.numberFrom, opts.numberTo)
    const to   = Math.max(opts.numberFrom, opts.numberTo)
    const nums = Array.from({ length: to - from + 1 }, (_, i) => from + i)
    const numFontPx = opts.numberFontSize * (96 / 72)
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: `${gapPx}px` }}>
        {nums.map((n) => (
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

  // Markers mode
  const markerTokens: Array<{ marker: MarkerDef; idx: number }> = []
  for (const marker of opts.markers) {
    for (let i = 0; i < marker.quantity; i++) {
      markerTokens.push({ marker, idx: i })
    }
  }
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: `${gapPx}px` }}>
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

// Standalone export for print portal (no dependency on preview width)
export function TokenPrintPortal({ opts, language: _language }: { opts: TokenPrintOptions; language: Language }) {
  const { w } = PAGE_SIZE_DEFS[opts.pageSize]
  const printableWidth = (w - 30) * MM_TO_PX
  const characters = buildCharacterTokens(opts.selectedCharacterIds)
  return (
    <TokenGrid
      opts={opts}
      characters={characters}
      containerWidth={printableWidth}
      forPrint
    />
  )
}
