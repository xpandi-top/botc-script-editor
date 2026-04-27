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
  fontKeyEn: FontKey
  fontKeyZh: FontKey
  // token appearance
  shape: TokenShape
  diameterMm: number
  gapMm: number
  borderWidth: number
  borderColor: string
  blackAndWhite: boolean
  showCropMarks: boolean
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
  iconSizeRatio: number    // 0.5–1.5, scales icon relative to default
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
  pageSize: 'a4',
  fontKeyEn: 'sans',
  fontKeyZh: 'sans',
  shape: 'circle',
  diameterMm: 50,
  gapMm: 4,
  borderWidth: 2,
  borderColor: '#333333',
  blackAndWhite: false,
  showCropMarks: true,
  bgType: 'none',
  bgColor: '#ffffff',
  bgImage: null,
  bgFit: 'cover',
  nameDisplay: 'both',
  abilityDisplay: 'en',
  abilityStyle: 'arc',
  nameFontSize: 8,
  abilityFontSize: 5.5,
  iconSizeRatio: 1.0,
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
}

export const MM_TO_PX = 3.7795
