import type { PageSize, FontKey } from '../PrintOptionsDialog'

export type TokenShape = 'circle' | 'hexagon' | 'square'
export type NameDisplay = 'en' | 'zh' | 'both'
export type AbilityDisplay = 'en' | 'zh' | 'both' | 'hidden'
export type BgFit = 'cover' | 'contain' | 'stretch'

export type WatermarkOptions = {
  type: 'text' | 'image'
  text: string
  imageData: string | null
  position: 'center' | 'bottom-right' | 'bottom-center'
  opacity: number
  fontSize: number
  color: string
}

export type MarkerDef = {
  id: string
  icon: string       // emoji or empty string
  label: string
  quantity: number
  bgColor: string
}

export type TokenPrintOptions = {
  mode: 'characters' | 'custom-tags'
  pageSize: PageSize
  pageLang: 'en' | 'zh' | 'auto'
  fontKeyEn: FontKey
  fontKeyZh: FontKey
  // token appearance
  shape: TokenShape
  diameterMm: number
  gapMm: number
  marginMm: number        // page margin in mm (default 10)
  borderWidth: number
  borderColor: string
  blackAndWhite: boolean
  // background
  bgType: 'none' | 'color' | 'image'
  bgColor: string
  bgImage: string | null   // data URL
  bgFit: BgFit
  // text
  nameDisplay: NameDisplay
  abilityDisplay: AbilityDisplay
  abilityStyle: 'arc' | 'straight'
  nameFontSize: number     // pt
  abilityFontSize: number  // pt
  iconSizeRatio: number    // 0.5–2.0, scales icon relative to default
  // characters mode
  selectedCharacterIds: string[]
  // watermark
  watermarkEnabled: boolean
  watermark: WatermarkOptions
  // custom tags
  tagMode: 'numbers' | 'markers'
  numberFrom: number
  numberTo: number
  numberLabel: string
  numberFontSize: number
  numberBgColor: string
  markers: MarkerDef[]
  // indicators
  showWakeIndicators: boolean
  showSetupIndicators: boolean
}

export const DEFAULT_MARKERS: MarkerDef[] = [
  { id: 'dead',      icon: '☠',  label: 'Dead',       quantity: 2, bgColor: '#555555' },
  { id: 'poisoned',  icon: '☣',  label: 'Poisoned',   quantity: 2, bgColor: '#4a7a3a' },
  { id: 'drunk',     icon: '🍺', label: 'Drunk',      quantity: 2, bgColor: '#a0522d' },
  { id: 'protected', icon: '🛡', label: 'Protected',  quantity: 2, bgColor: '#2a5a8a' },
  { id: 'used',      icon: '✓',  label: 'Used',       quantity: 2, bgColor: '#666666' },
  { id: 'reminder',  icon: '★',  label: 'Reminder',   quantity: 3, bgColor: '#888888' },
]

export const DEFAULT_TOKEN_OPTIONS: TokenPrintOptions = {
  mode: 'characters',
  pageSize: 'letter',
  pageLang: 'auto',
  fontKeyEn: 'sans',
  fontKeyZh: 'sans',
  shape: 'circle',
  diameterMm: 45,
  gapMm: 0,
  marginMm: 0,
  borderWidth: 2,
  borderColor: '#333333',
  blackAndWhite: false,
  bgType: 'none',
  bgColor: '#ffffff',
  bgImage: null,
  bgFit: 'cover',
  nameDisplay: 'both',
  abilityDisplay: 'en',
  abilityStyle: 'straight',
  nameFontSize: 14,
  abilityFontSize: 7,
  iconSizeRatio: 2.0,
  selectedCharacterIds: [],
  watermarkEnabled: false,
  watermark: {
    type: 'text',
    text: 'Custom',
    imageData: null,
    position: 'center',
    opacity: 0.15,
    fontSize: 8,
    color: '#888888',
  },
  tagMode: 'numbers',
  numberFrom: 1,
  numberTo: 15,
  numberLabel: '',
  numberFontSize: 24,
  numberBgColor: '#dddddd',
  markers: DEFAULT_MARKERS,
  showWakeIndicators: true,
  showSetupIndicators: true,
}

export const MM_TO_PX = 3.7795
