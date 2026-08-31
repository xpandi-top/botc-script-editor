import enLocale from '../assets/locales/en.json'
import enJinxLocale from '../assets/locales/en.jinxes.json'
import jinxData from '../assets/jinxes.json'
import zhLocale from '../assets/locales/zh.json'
import zhJinxLocale from '../assets/locales/zh.jinxes.json'
import nightOrderData from '../assets/characters/night-order.json'
import editionCreditData from '../assets/editions.json'
import type {
  CharacterEntry,
  CharacterFileEntry,
  CharacterPackOverrides,
  CharacterRevisionEntry,
  CustomCharacter,
  EditableScript,
  JinxEntry,
  JinxOverride,
  JinxOverrides,
  Language,
  LocaleData,
  NightOrderData,
  RevisionOverrides,
  ScriptJinxOverride,
  ScriptCharacterItem,
  ScriptFileEntry,
  ScriptFileSource,
  ScriptMetaEntry,
  Team,
} from './types'

export const REVISION_OVERRIDES_KEY = 'BOTC_REVISION_OVERRIDES'

function loadRevisionOverrides(): RevisionOverrides {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(REVISION_OVERRIDES_KEY) ?? '{}') as RevisionOverrides
  } catch {
    return {}
  }
}

let _revisionOverrides: RevisionOverrides = loadRevisionOverrides()

/** Call after writing to BOTC_REVISION_OVERRIDES so catalog picks up changes. */
export function refreshRevisionOverrides() {
  _revisionOverrides = loadRevisionOverrides()
}

// ── Jinx overrides (UI-edited reasons / status) ───────────────────────────────

export const JINX_OVERRIDES_KEY = 'BOTC_JINX_OVERRIDES'

function loadJinxOverrides(): JinxOverrides {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(JINX_OVERRIDES_KEY) ?? '{}') as JinxOverrides
  } catch {
    return {}
  }
}

let _jinxOverrides: JinxOverrides = loadJinxOverrides()

/** Call after writing to BOTC_JINX_OVERRIDES so catalog picks up changes. */
export function refreshJinxOverrides() {
  _jinxOverrides = loadJinxOverrides()
}

/** Write a partial override for a jinx pair. Pass null to clear the override. */
export function setJinxOverride(id: string, patch: JinxOverride | null) {
  const stored = loadJinxOverrides()
  if (patch === null) {
    delete stored[id]
  } else {
    stored[id] = { ...stored[id], ...patch }
  }
  localStorage.setItem(JINX_OVERRIDES_KEY, JSON.stringify(stored))
  refreshJinxOverrides()
}

// ── Character pack overrides (from uploaded packs) ────────────────────────────

export const CHAR_PACK_OVERRIDES_KEY = 'BOTC_CHAR_PACK_OVERRIDES'

function loadCharPackOverrides(): CharacterPackOverrides {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(CHAR_PACK_OVERRIDES_KEY) ?? '{}') as CharacterPackOverrides
  } catch { return {} }
}

let _charPackOverrides: CharacterPackOverrides = loadCharPackOverrides()

export function refreshCharPackOverrides() {
  _charPackOverrides = loadCharPackOverrides()
}

/** Apply an uploaded character pack — merges into existing overrides. */
export function applyCharacterPack(pack: CharacterFileEntry[]) {
  const current = loadCharPackOverrides()
  for (const entry of pack) {
    if (!entry.id) continue
    current[entry.id] = {
      ...current[entry.id],
      ...(entry.en && { en: entry.en }),
      ...(entry.zh && { zh: entry.zh }),
      ...(entry.current_revision && { current_revision: entry.current_revision }),
    }
  }
  localStorage.setItem(CHAR_PACK_OVERRIDES_KEY, JSON.stringify(current))
  _charPackOverrides = current
}

/** Clear all character pack overrides. */
export function clearCharacterPackOverrides() {
  localStorage.removeItem(CHAR_PACK_OVERRIDES_KEY)
  _charPackOverrides = {}
}

// ── Character reminder token overrides (catalog chars) ────────────────────────

export const CHAR_REMINDERS_KEY = 'BOTC_CHAR_REMINDERS'

type CharRemindersOverrides = Record<string, { reminders?: string[]; remindersGlobal?: string[] }>

function loadCharReminders(): CharRemindersOverrides {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(CHAR_REMINDERS_KEY) ?? '{}') as CharRemindersOverrides
  } catch { return {} }
}

let _charReminders: CharRemindersOverrides = loadCharReminders()

export function refreshCharReminders() {
  _charReminders = loadCharReminders()
}

/**
 * Get effective reminders for any character id.
 * Priority: CustomCharacter fields → BOTC_CHAR_REMINDERS user override →
 * character JSON `<language>` block → other language block → top-level `reminders`.
 *
 * Official characters keep their tokens in the top-level field (English); packs
 * that ship localized tokens (e.g. Odyssey) put them under `en`/`zh`. The
 * cross-language fallback mirrors getAbilityText: showing the other language
 * beats showing nothing.
 */
export function getCharacterReminders(id: string, language?: Language): string[] {
  const custom = _customCharRegistry.get(id)
  if (custom) return custom.reminders ?? []
  if (_charReminders[id]?.reminders !== undefined) return _charReminders[id].reminders!
  if (language) {
    const fallbackLanguage: Language = language === 'en' ? 'zh' : 'en'
    const localized = _charLocale[language]?.[id]?.reminders ?? _charLocale[fallbackLanguage]?.[id]?.reminders
    if (localized) return localized
  }
  // Fall back to value baked into the character JSON file (loaded at startup via characterById)
  return characterById[id]?.reminders ?? []
}

export function getCharacterRemindersGlobal(id: string, language?: Language): string[] {
  const custom = _customCharRegistry.get(id)
  if (custom) return custom.remindersGlobal ?? []
  if (_charReminders[id]?.remindersGlobal !== undefined) return _charReminders[id].remindersGlobal!
  if (language) {
    const fallbackLanguage: Language = language === 'en' ? 'zh' : 'en'
    const localized = _charLocale[language]?.[id]?.remindersGlobal ?? _charLocale[fallbackLanguage]?.[id]?.remindersGlobal
    if (localized) return localized
  }
  return characterById[id]?.remindersGlobal ?? []
}

/** Persist reminder overrides for a catalog character. Pass null to clear. */
export function setCharacterRemindersOverride(
  id: string,
  reminders: string[] | null,
  remindersGlobal: string[] | null,
) {
  const stored = loadCharReminders()
  if (reminders === null && remindersGlobal === null) {
    delete stored[id]
  } else {
    stored[id] = {
      ...(reminders !== null && { reminders }),
      ...(remindersGlobal !== null && { remindersGlobal }),
    }
  }
  localStorage.setItem(CHAR_REMINDERS_KEY, JSON.stringify(stored))
  _charReminders = stored
}

// ── Night reminder overrides ───────────────────────────────────────────────────

export const CHAR_NIGHT_OVERRIDES_KEY = 'BOTC_CHAR_NIGHT_OVERRIDES'

type CharNightOverrides = Record<string, {
  firstNightReminder?: string
  firstNightReminderZh?: string
  otherNightReminder?: string
  otherNightReminderZh?: string
  setup?: boolean
}>

function loadCharNightOverrides(): CharNightOverrides {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(CHAR_NIGHT_OVERRIDES_KEY) ?? '{}') as CharNightOverrides
  } catch { return {} }
}

let _charNightOverrides: CharNightOverrides = loadCharNightOverrides()

export function refreshCharNightOverrides() {
  _charNightOverrides = loadCharNightOverrides()
}

export function getCharNightOverride(id: string): CharNightOverrides[string] | undefined {
  return _charNightOverrides[id]
}

/** Persist night reminder / setup overrides for a catalog character. Pass null to clear all. */
export function setCharNightOverride(
  id: string,
  patch: CharNightOverrides[string] | null,
) {
  const stored = loadCharNightOverrides()
  if (patch === null) {
    delete stored[id]
  } else {
    stored[id] = { ...stored[id], ...patch }
  }
  localStorage.setItem(CHAR_NIGHT_OVERRIDES_KEY, JSON.stringify(stored))
  _charNightOverrides = stored
}

// ── Custom character registry ──────────────────────────────────────────────────

export const CUSTOM_CHARACTERS_KEY = 'BOTC_CUSTOM_CHARACTERS'

let _customCharRegistry: Map<string, CustomCharacter> = new Map()
let _customCharEntries: CharacterEntry[] = []

/** Convert a CustomCharacter to a CharacterEntry usable by catalog consumers. */
export function toCharacterEntry(c: CustomCharacter): CharacterEntry {
  return { id: c.id, team: c.team, edition: c.edition }
}

/**
 * Register custom characters so all catalog functions (getDisplayName, getAbilityText,
 * getIconForCharacter, getEffectiveAllCharacters, getEffectiveNightOrderFromRegistry)
 * transparently include them. Call on app init and whenever custom chars change.
 */
export function registerCustomCharacters(chars: CustomCharacter[]) {
  _customCharRegistry = new Map(chars.map((c) => [c.id, c]))
  _customCharEntries = chars.map(toCharacterEntry)
}

/** Returns catalog characters merged with currently registered custom characters. */
export function getEffectiveAllCharacters(): CharacterEntry[] {
  if (_customCharEntries.length === 0) return allCharacters
  return [...allCharacters, ..._customCharEntries]
}

/** Returns CharacterEntry for any id — catalog or custom. */
export function getCharacterById(id: string): CharacterEntry | undefined {
  return characterById[id] ?? (_customCharRegistry.get(id) ? toCharacterEntry(_customCharRegistry.get(id)!) : undefined)
}

/** Returns the full CustomCharacter object by id, or undefined if it's a catalog char. */
export function getCustomChar(id: string): CustomCharacter | undefined {
  return _customCharRegistry.get(id)
}

const characterFiles = import.meta.glob('../assets/characters/individual/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, CharacterFileEntry>

// ── Build locale maps from individual character files ─────────────────────────

const _charLocale: Record<Language, Record<string, { name?: string; ability?: string; flavor?: string; revisions?: Record<string, string>; reminders?: string[]; remindersGlobal?: string[] }>> = {
  en: {},
  zh: {},
}
for (const entry of Object.values(characterFiles)) {
  if (!entry?.id) continue
  if (entry.en) _charLocale.en[entry.id] = entry.en
  if (entry.zh) _charLocale.zh[entry.id] = entry.zh
}

// ── Exported list and map of all character file entries ──────────────────────
export const allCharacterFiles: CharacterFileEntry[] = Object.values(characterFiles)
export const characterFileById: Record<string, CharacterFileEntry> = Object.fromEntries(
  allCharacterFiles.filter((c) => c?.id).map((c) => [c.id, c])
)

const scriptFiles = import.meta.glob('../assets/scripts/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, ScriptFileSource>

const iconFiles = import.meta.glob('../assets/icons/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

// Pre-built map: character id → asset URL. Built once at module init, O(1) lookup.
const _iconMap = new Map<string, string>()
for (const [path, url] of Object.entries(iconFiles)) {
  const filename = path.split('/').pop() ?? ''
  const id = filename.replace(/\.[^.]+$/, '') // strip extension
  _iconMap.set(id, url)
}

export const locales: Record<Language, LocaleData> = {
  en: { ...enLocale, jinxes: enJinxLocale },
  zh: { ...zhLocale, jinxes: zhJinxLocale },
}

export const jinxes: Record<string, JinxEntry> = jinxData as unknown as Record<string, JinxEntry>

function requireUiString(language: Language, key: string) {
  const value = locales[language].ui?.[key]
  if (!value) {
    throw new Error(`Missing ui locale string: ${language}.${key}`)
  }

  return value
}

export const teamOrder: Team[] = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveler',
  'fabled',
  'loric',
]

export const teamLabels: Record<Language, Record<Team, string>> = {
  en: {
    townsfolk: requireUiString('en', 'townsfolk'),
    outsider: requireUiString('en', 'outsider'),
    minion: requireUiString('en', 'minion'),
    demon: requireUiString('en', 'demon'),
    traveler: requireUiString('en', 'traveler'),
    fabled: requireUiString('en', 'fabled'),
    loric: requireUiString('en', 'loric'),
  },
  zh: {
    townsfolk: requireUiString('zh', 'townsfolk'),
    outsider: requireUiString('zh', 'outsider'),
    minion: requireUiString('zh', 'minion'),
    demon: requireUiString('zh', 'demon'),
    traveler: requireUiString('zh', 'traveler'),
    fabled: requireUiString('zh', 'fabled'),
    loric: requireUiString('zh', 'loric'),
  },
}

export const editionLabels: Record<Language, Record<string, string>> = {
  en: {
    tb: requireUiString('en', 'tb'),
    snv: requireUiString('en', 'snv'),
    bmr: requireUiString('en', 'bmr'),
    custom: requireUiString('en', 'custom'),
    experimental: requireUiString('en', 'experimental'),
    huadengchushang: requireUiString('en', 'huadengchushang'),
    shanyuyulai: requireUiString('en', 'shanyuyulai'),
    odyssey: requireUiString('en', 'odyssey'),
    fabled: requireUiString('en', 'fabled'),
    loric: requireUiString('en', 'loric'),
    'night-order': requireUiString('en', 'night_order'),
  },
  zh: {
    tb: requireUiString('zh', 'tb'),
    snv: requireUiString('zh', 'snv'),
    bmr: requireUiString('zh', 'bmr'),
    custom: requireUiString('zh', 'custom'),
    experimental: requireUiString('zh', 'experimental'),
    huadengchushang: requireUiString('zh', 'huadengchushang'),
    shanyuyulai: requireUiString('zh', 'shanyuyulai'),
    odyssey: requireUiString('zh', 'odyssey'),
    fabled: requireUiString('zh', 'fabled'),
    loric: requireUiString('zh', 'loric'),
    'night-order': requireUiString('zh', 'night_order'),
  },
}

export const nightOrder = nightOrderData as NightOrderData

/**
 * Returns night order arrays with custom characters inserted at their
 * specified positions (1-based). Custom chars without a position are appended.
 */
export function buildEffectiveNightOrder(customChars: CustomCharacter[]): NightOrderData {
  const first = [...(nightOrder.first_night ?? [])]
  const other = [...(nightOrder.other_nights ?? [])]

  // Sort descending so splicing earlier positions doesn't shift later inserts
  const withFirst = customChars.filter((c) => c.firstNight != null).sort((a, b) => (b.firstNight ?? 0) - (a.firstNight ?? 0))
  const withOther = customChars.filter((c) => c.otherNight != null).sort((a, b) => (b.otherNight ?? 0) - (a.otherNight ?? 0))

  for (const c of withFirst) first.splice(Math.min((c.firstNight ?? 1) - 1, first.length), 0, c.id)
  for (const c of withOther) other.splice(Math.min((c.otherNight ?? 1) - 1, other.length), 0, c.id)

  // Characters with no position (undefined / 0) do NOT wake that night — exclude them.
  return { first_night: first, other_nights: other }
}

export const NIGHT_ORDER_OVERRIDES_KEY = 'BOTC_NIGHT_ORDER_OVERRIDES'

function loadNightOrderOverrides(): { first_night: string[]; other_nights: string[] } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(NIGHT_ORDER_OVERRIDES_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

let _nightOrderOverrides: { first_night: string[]; other_nights: string[] } | null = loadNightOrderOverrides()

export function saveNightOrderOverrides(data: { first_night: string[]; other_nights: string[] }) {
  _nightOrderOverrides = data
  localStorage.setItem(NIGHT_ORDER_OVERRIDES_KEY, JSON.stringify(data))
}

export function clearNightOrderOverrides() {
  _nightOrderOverrides = null
  localStorage.removeItem(NIGHT_ORDER_OVERRIDES_KEY)
}

export function refreshNightOrderOverrides() {
  _nightOrderOverrides = loadNightOrderOverrides()
}

/** Like buildEffectiveNightOrder but uses the currently registered custom chars. */
export function getEffectiveNightOrderFromRegistry(): NightOrderData {
  if (_nightOrderOverrides) return _nightOrderOverrides
  return buildEffectiveNightOrder([..._customCharRegistry.values()])
}

export function toTitleCase(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}


function getJinxCopy(id: string, language: Language) {
  const preferred = locales[language].jinxes?.[id]
  if (preferred?.reason) {
    return preferred
  }

  const fallbackLanguage: Language = language === 'en' ? 'zh' : 'en'
  return locales[fallbackLanguage].jinxes?.[id]
}

export function getDisplayName(id: string, language: Language = 'en') {
  const custom = _customCharRegistry.get(id)
  if (custom) return (language === 'zh' && custom.nameZh) ? custom.nameZh : custom.nameEn
  const fallbackLanguage: Language = language === 'en' ? 'zh' : 'en'
  const packOverride = _charPackOverrides[id]?.[language]?.name
  if (packOverride) return packOverride
  const fromFile = _charLocale[language]?.[id]?.name
  if (fromFile) return fromFile
  const fallback = _charLocale[fallbackLanguage]?.[id]?.name ?? _charPackOverrides[id]?.[fallbackLanguage]?.name
  if (fallback) return fallback
  return toTitleCase(id)
}

export function getAbilityText(id: string, language: Language = 'en') {
  const custom = _customCharRegistry.get(id)
  if (custom) return (language === 'zh' && custom.abilityZh) ? custom.abilityZh : custom.abilityEn
  const fallbackLanguage: Language = language === 'en' ? 'zh' : 'en'
  const packOverride = _charPackOverrides[id]?.[language]?.ability
  if (packOverride) return packOverride
  const fromFile = _charLocale[language]?.[id]?.ability
  if (fromFile) return fromFile
  const fallback = _charLocale[fallbackLanguage]?.[id]?.ability ?? _charPackOverrides[id]?.[fallbackLanguage]?.ability
  if (fallback) return fallback
  return 'No ability text available.'
}

/** Returns the flavor text for a character. Only official characters have flavor (English only from official schema). */
export function getFlavorText(id: string, language: Language = 'en'): string | undefined {
  const fromFile = _charLocale[language]?.[id]?.flavor
  if (fromFile) return fromFile
  // Flavor is English-only in official schema; fall back to en when zh is requested
  if (language === 'zh') return _charLocale.en[id]?.flavor
  return undefined
}

export function getJinxReason(id: string, language: Language = 'en') {
  const overrideKey = language === 'en' ? 'reason_en' : 'reason_zh'
  const override = _jinxOverrides[id]?.[overrideKey]
  if (override !== undefined) return override
  return getJinxCopy(id, language)?.reason ?? ''
}

/** Effective status: override wins over jinxes.json status. */
export function getJinxStatus(id: string): 'active' | 'inactive' {
  const override = _jinxOverrides[id]?.status
  if (override) return override
  return jinxes[id]?.status ?? 'active'
}

/**
 * Returns all known jinx pair IDs — from jinxes.json plus any added via overrides
 * that don't already exist in the source file.
 */
export function getAllJinxIds(): string[] {
  const sourceIds = Object.keys(jinxes)
  const overrideIds = Object.keys(_jinxOverrides).filter((id) => !jinxes[id])
  return [...sourceIds, ...overrideIds]
}

/**
 * Export all jinx data as a portable JSON string (source merged with overrides).
 * Format: Record<pairId, { id, characters, status, reason_en, reason_zh }>
 */
export function exportJinxesJson(): string {
  const result: Record<string, {
    id: string
    characters: [string, string]
    status: 'active' | 'inactive'
    reason_en: string
    reason_zh: string
  }> = {}

  for (const id of getAllJinxIds()) {
    const base = jinxes[id]
    const chars = base?.characters ?? (id.split('::') as [string, string])
    result[id] = {
      id,
      characters: chars,
      status: getJinxStatus(id),
      reason_en: getJinxReason(id, 'en'),
      reason_zh: getJinxReason(id, 'zh'),
    }
  }
  return JSON.stringify(result, null, 2)
}

/**
 * Import a portable jinx JSON (from exportJinxesJson). Stores as overrides only
 * for entries that differ from source data.
 */
export function importJinxesJson(json: string) {
  let data: Record<string, {
    id?: string
    characters?: [string, string]
    status?: 'active' | 'inactive'
    reason_en?: string
    reason_zh?: string
  }>
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON in jinx import file')
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Jinx import must be a JSON object')
  }
  const _data = data as Record<string, {
    id?: string
    characters?: [string, string]
    status?: 'active' | 'inactive'
    reason_en?: string
    reason_zh?: string
  }>

  const stored = loadJinxOverrides()
  for (const [id, entry] of Object.entries(_data)) {
    const base = jinxes[id]
    const patch: JinxOverride = {}
    if (entry.status && entry.status !== (base?.status ?? 'active')) patch.status = entry.status
    if (entry.reason_en !== undefined && entry.reason_en !== (getJinxCopy(id, 'en')?.reason ?? '')) patch.reason_en = entry.reason_en
    if (entry.reason_zh !== undefined && entry.reason_zh !== (getJinxCopy(id, 'zh')?.reason ?? '')) patch.reason_zh = entry.reason_zh
    if (Object.keys(patch).length > 0) stored[id] = patch
  }
  localStorage.setItem(JINX_OVERRIDES_KEY, JSON.stringify(stored))
  refreshJinxOverrides()
}

function normalizeJinxPairId(id: string) {
  const parts = id
    .split('::')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length !== 2) {
    return null
  }

  return parts.sort((left, right) => left.localeCompare(right)).join('::')
}

function normalizeScriptJinxOverride(entry: ScriptJinxOverride) {
  const normalizedId = typeof entry.id === 'string' ? normalizeJinxPairId(entry.id) : null
  const normalizedCharacters =
    Array.isArray(entry.characters) && entry.characters.length === 2
      ? [...entry.characters].map((characterId) => characterId.trim()).filter(Boolean)
      : []
  const pairId =
    normalizedId ??
    (normalizedCharacters.length === 2
      ? normalizedJinxPairIdFromCharacters(normalizedCharacters[0], normalizedCharacters[1])
      : null)

  if (!pairId) {
    return null
  }

  const [left, right] = pairId.split('::')

  const status: 'active' | 'inactive' = entry.status === 'inactive' ? 'inactive' : 'active'

  return {
    id: pairId,
    characters: [left, right] as [string, string],
    status,
    reason: entry.reason?.trim() ?? '',
    reason_zh: entry.reason_zh?.trim() ?? '',
  }
}

function normalizedJinxPairIdFromCharacters(left: string, right: string) {
  return [left.trim(), right.trim()]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join('::')
}

export function getCurrentRevision(id: string) {
  return _revisionOverrides[id]?.current_revision ?? characterById[id]?.current_revision
}

export function getCharacterRevisionIds(id: string): string[] {
  const base = (characterById[id]?.revisions ?? []).map((r) => r.id)
  const extra = (_revisionOverrides[id]?.revisions ?? []).map((r) => r.id)
  // Merge: base first, then any user-added ids not already present
  const seen = new Set(base)
  return [...base, ...extra.filter((id) => !seen.has(id))]
}

export function getRevisionText(
  id: string,
  language: Language,
  revision: string,
): string | undefined {
  const overrideLocale = language === 'zh'
    ? _revisionOverrides[id]?.locale_zh
    : _revisionOverrides[id]?.locale_en
  if (overrideLocale?.[revision]) return overrideLocale[revision]
  const fallbackLanguage: Language = language === 'en' ? 'zh' : 'en'
  const packOverride = _charPackOverrides[id]?.[language]?.revisions?.[revision]
  if (packOverride) return packOverride
  const fromFile = _charLocale[language]?.[id]?.revisions?.[revision]
  if (fromFile) return fromFile
  const fallback = _charLocale[fallbackLanguage]?.[id]?.revisions?.[revision] ?? _charPackOverrides[id]?.[fallbackLanguage]?.revisions?.[revision]
  return fallback
}

/**
 * Returns the revision ID to use for a character within a specific script.
 * Checks the script's pinned overrides first, then falls back to current_revision.
 */
export function getRevisionForScript(
  charId: string,
  pinnedRevisions?: Record<string, string>,
): string | undefined {
  return pinnedRevisions?.[charId] ?? getCurrentRevision(charId)
}

/**
 * Returns ability text for a character, respecting pinned revision and user overrides.
 */
export function getAbilityTextForScript(
  id: string,
  language: Language,
  pinnedRevisions?: Record<string, string>,
): string {
  const revision = getRevisionForScript(id, pinnedRevisions)
  if (revision) {
    const text = getRevisionText(id, language, revision)
    if (text) return text
  }
  return getAbilityText(id, language)
}

export function getJinxRevisionText(id: string, language: Language, revision: string) {
  return locales[language].jinxes?.[id]?.revisions?.[revision]
}

export function getRevisionNote(id: string, revisionId: string) {
  return characterById[id]?.revisions?.find((revision) => revision.id === revisionId)?.note ?? ''
}

export function getJinxRevisionNote(id: string, revisionId: string) {
  return jinxes[id]?.revisions?.find((revision) => revision.id === revisionId)?.note ?? ''
}

export function getNextRevisionId(id: string) {
  const revisions = characterById[id]?.revisions ?? []
  const maxVersion = revisions.reduce((highest, revision) => {
    const match = /^v(\d+)$/i.exec(revision.id)
    if (!match) {
      return highest
    }

    return Math.max(highest, Number(match[1]))
  }, 0)

  return `v${maxVersion + 1}`
}

export function getActiveJinxesForScript(
  characterIds: string[],
  language: Language,
  overrides: ScriptJinxOverride[] = [],
) {
  const ids = new Set(characterIds)
  const activeJinxMap = new Map<
    string,
    { id: string; names: string; reason: string; characters: [string, string] }
  >()

  // ── Static jinxes from jinxes.json ───────────────────────────────────────
  Object.values(jinxes)
    .filter(
      (jinx) =>
        jinx.characters.length === 2 &&
        ids.has(jinx.characters[0]) &&
        ids.has(jinx.characters[1]),
    )
    .forEach((jinx) => {
      // Use getJinxStatus so user status-overrides from JinxManager are respected
      if (getJinxStatus(jinx.id) !== 'active') return

      activeJinxMap.set(jinx.id, {
        id: jinx.id,
        characters: jinx.characters,
        names: jinx.characters
          .map((characterId) => getDisplayName(characterId, language))
          .sort((left, right) => left.localeCompare(right))
          .join(' / '),
        reason: getJinxReason(jinx.id, language),
      })
    })

  // ── User-created jinxes from JinxManager (override-only, not in jinxes.json) ─
  // IDs are encoded as "charA::charB" (sorted alphabetically on creation).
  Object.entries(_jinxOverrides)
    .filter(([id]) => !jinxes[id])          // skip entries that shadow jinxes.json
    .forEach(([id, ov]) => {
      if ((ov.status ?? 'active') !== 'active') return
      const parts = id.split('::')
      if (parts.length !== 2) return
      const [char0, char1] = parts as [string, string]
      if (!ids.has(char0) || !ids.has(char1)) return
      const reason = (language === 'zh' ? ov.reason_zh : ov.reason_en) ?? ov.reason_en ?? ov.reason_zh ?? ''
      activeJinxMap.set(id, {
        id,
        characters: [char0, char1],
        names: [char0, char1]
          .map((cid) => getDisplayName(cid, language))
          .sort((a, b) => a.localeCompare(b))
          .join(' / '),
        reason,
      })
    })

  overrides
    .map(normalizeScriptJinxOverride)
    .filter((entry): entry is NonNullable<ReturnType<typeof normalizeScriptJinxOverride>> => entry !== null)
    .forEach((override) => {
      if (!ids.has(override.characters[0]) || !ids.has(override.characters[1])) {
        return
      }

      if (override.status === 'inactive') {
        activeJinxMap.delete(override.id)
        return
      }

      const existingReason = activeJinxMap.get(override.id)?.reason ?? getJinxReason(override.id, language)
      const reason =
        language === 'zh'
          ? override.reason_zh || override.reason || existingReason
          : override.reason || existingReason || override.reason_zh

      activeJinxMap.set(override.id, {
        id: override.id,
        characters: override.characters,
        names: override.characters
          .map((characterId) => getDisplayName(characterId, language))
          .sort((left, right) => left.localeCompare(right))
          .join(' / '),
        reason,
      })
    })

  return Array.from(activeJinxMap.values())
    .map(({ id, names, reason }) => ({ id, names, reason }))
    .sort((left, right) => left.names.localeCompare(right.names))
}

export function createCharacterRevision(
  id: string,
  revision: string,
  note: string,
  abilities: Record<Language, string>,
) {
  const character = characterById[id]

  if (!character) {
    throw new Error(`Unknown character: ${id}`)
  }

  if (!revision.trim()) {
    throw new Error('Revision id is required.')
  }

  const normalizedRevision = revision.trim()
  const existingRevisions = character.revisions ?? []

  if (existingRevisions.some((entry) => entry.id === normalizedRevision)) {
    throw new Error(`Revision already exists for ${id}: ${normalizedRevision}`)
  }

  // Build new object instead of mutating the exported characterById entry.
  // Mutation would leave stale references in callers that cached characterById[id].
  characterById[id] = {
    ...character,
    revisions: [...existingRevisions, { id: normalizedRevision, note: note.trim() }],
    current_revision: normalizedRevision,
  }

  ;(['en', 'zh'] as Language[]).forEach((language) => {
    if (!_charLocale[language][id]) {
      _charLocale[language][id] = {}
    }
    _charLocale[language][id].ability = abilities[language]
    _charLocale[language][id].revisions = {
      ...(_charLocale[language][id].revisions ?? {}),
      [normalizedRevision]: abilities[language],
    }
  })

  return normalizedRevision
}

export function getIconForCharacter(id: string): string | undefined {
  const custom = _customCharRegistry.get(id)
  if (custom?.icon) return custom.icon
  return _iconMap.get(id)
}

// ── Edition credits / required attribution ───────────────────────────────────
//
// Some character packs are free to use but require the script to name their
// source. Odyssey's terms are "credit 《奥德赛 Odyssey》 or use the Odyssey
// character background" — so any sheet built from its characters carries a
// credit line, and it is deliberately not behind a toggle.

export type EditionCredit = {
  id: string
  name_en: string
  name_zh: string
  author_en?: string
  author_zh?: string
  source?: string
  requiresAttribution?: boolean
  terms_en?: string
  terms_zh?: string
}

export const editionCredits = editionCreditData as Record<string, EditionCredit>

export function getEditionCredit(edition: string): EditionCredit | undefined {
  return editionCredits[edition]
}

/** Localized pack name, e.g. "《奥德赛 Odyssey》" / "Odyssey". */
export function getEditionCreditName(credit: EditionCredit, language: Language): string {
  return (language === 'zh' ? credit.name_zh : credit.name_en) || credit.name_en || credit.id
}

export function getEditionCreditAuthor(credit: EditionCredit, language: Language): string | undefined {
  return (language === 'zh' ? credit.author_zh : credit.author_en) || credit.author_en
}

export function getEditionTerms(credit: EditionCredit, language: Language): string | undefined {
  return (language === 'zh' ? credit.terms_zh : credit.terms_en) || credit.terms_en
}

/**
 * Editions among these characters whose terms require attribution, in the order
 * they are declared in editions.json. Empty when nothing on the sheet needs it.
 */
export function getRequiredAttributions(characterIds: Iterable<string>): EditionCredit[] {
  const editions = new Set<string>()
  for (const id of characterIds) {
    const edition = characterById[id]?.edition ?? _customCharRegistry.get(id)?.edition
    if (edition) editions.add(edition)
  }
  return Object.values(editionCredits).filter(
    (credit) => credit.requiresAttribution && editions.has(credit.id),
  )
}

// ── Character almanac (lazy-loaded) ───────────────────────────────────────────
//
// Almanac files are large (Odyssey alone is ~650 KB of prose) and only needed
// when someone opens a character's detail panel, so they are NOT eager-globbed
// like the character files — each edition is fetched on first use and cached.

export type AlmanacCharacterEntry = {
  zh_name?: string
  en_name?: string
  number?: string
  source?: string
  flavor?: string
  summary?: string
  ability?: string
  examples?: string
  howto?: string
  reminder_details?: string
  rules?: string
  design_notes?: string
  tips?: string
  bluffing?: string
  scripts?: string
  credits?: { design?: string; concept?: string; art?: string }
}

export type AlmanacTerm = { title: string; text: string; source?: string }

export type AlmanacFile = {
  edition: string
  name_zh?: string
  name_en?: string
  source?: string
  license?: string
  terminology?: Record<string, AlmanacTerm>
  characters?: Record<string, AlmanacCharacterEntry>
}

const almanacFiles = import.meta.glob('../assets/almanac/*.json', {
  import: 'default',
}) as Record<string, () => Promise<AlmanacFile>>

const _almanacCache = new Map<string, Promise<AlmanacFile | null>>()

/**
 * Load the almanac for an edition, preferring the requested language.
 * Files are named `<edition>.<language>.json`; a different language for the
 * same edition is used rather than returning nothing.
 */
export function loadAlmanacFile(edition: string, language: Language): Promise<AlmanacFile | null> {
  const cacheKey = `${edition}.${language}`
  const cached = _almanacCache.get(cacheKey)
  if (cached) return cached

  const basenameOf = (path: string) => path.split('/').pop() ?? ''
  const paths = Object.keys(almanacFiles)
  const match =
    paths.find((path) => basenameOf(path) === `${edition}.${language}.json`) ??
    paths.find((path) => basenameOf(path).startsWith(`${edition}.`))

  const pending: Promise<AlmanacFile | null> = match
    ? almanacFiles[match]().catch(() => null)
    : Promise.resolve(null)

  _almanacCache.set(cacheKey, pending)
  return pending
}

/** Almanac prose for one character, or null when its edition ships no almanac. */
export async function getAlmanacEntry(
  id: string,
  language: Language,
): Promise<AlmanacCharacterEntry | null> {
  const edition = characterById[id]?.edition ?? characterFileById[id]?.edition
  if (!edition) return null
  const file = await loadAlmanacFile(edition, language)
  return file?.characters?.[id] ?? null
}

/** Glossary terms an edition defines (Odyssey's 审判日, 变量X, 延迟, …). */
export async function getAlmanacTerminology(
  edition: string,
  language: Language,
): Promise<Record<string, AlmanacTerm>> {
  const file = await loadAlmanacFile(edition, language)
  return file?.terminology ?? {}
}

/** Whether any almanac file exists for an edition (sync — no fetch). */
export function hasAlmanac(edition: string): boolean {
  return Object.keys(almanacFiles).some((path) =>
    (path.split('/').pop() ?? '').startsWith(`${edition}.`),
  )
}

/** First candidate that is a non-empty array of strings, cleaned of non-strings. */
function pickStringList(...candidates: Array<unknown>): string[] | undefined {
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    const cleaned = candidate.filter((value): value is string => typeof value === 'string')
    if (cleaned.length > 0) return cleaned
  }
  return undefined
}

function loadCharacterCatalog() {
  const entries = new Map<string, CharacterEntry>()

  for (const value of Object.values(characterFiles)) {
    if (!value?.id) continue
    const candidate = {
      id: value.id,
      team: value.team,
      edition: value.edition,
      current_revision: value.current_revision,
      revisions: Array.isArray(value.revisions)
        ? value.revisions.filter(
            (revision): revision is CharacterRevisionEntry =>
              Boolean(revision?.id && typeof revision.note === 'string'),
          )
        : undefined,
      // Language-neutral default for consumers that don't know the UI language
      // (script export, the character editor). Packs that only ship localized
      // tokens still get a usable list here.
      reminders: pickStringList(value.reminders, value.en?.reminders, value.zh?.reminders),
      remindersGlobal: pickStringList(value.remindersGlobal, value.en?.remindersGlobal, value.zh?.remindersGlobal),
      setup: typeof value.setup === 'boolean' ? value.setup : undefined,
      firstNightReminder: value.en?.firstNightReminder ?? (typeof value.firstNightReminder === 'string' && value.firstNightReminder ? value.firstNightReminder : undefined),
      otherNightReminder: value.en?.otherNightReminder ?? (typeof value.otherNightReminder === 'string' && value.otherNightReminder ? value.otherNightReminder : undefined),
      firstNightReminderZh: value.zh?.firstNightReminder ?? undefined,
      otherNightReminderZh: value.zh?.otherNightReminder ?? undefined,
    }

    if (
      !candidate.id ||
      !candidate.team ||
      !teamOrder.includes(candidate.team as Team) ||
      !candidate.edition
    ) {
      continue
    }

    if (!entries.has(candidate.id)) {
      entries.set(candidate.id, candidate as CharacterEntry)
    }
  }

  const allCharacters = Array.from(entries.values()).sort((left, right) => {
    const teamCompare = teamOrder.indexOf(left.team) - teamOrder.indexOf(right.team)
    return teamCompare !== 0
      ? teamCompare
      : getDisplayName(left.id, 'en').localeCompare(getDisplayName(right.id, 'en'))
  })

  return {
    allCharacters,
    characterById: Object.fromEntries(allCharacters.map((entry) => [entry.id, entry])),
  }
}

// ── Shared script parsing helpers ────────────────────────────────────────────

function inferEditionFromSlug(slug: string) {
  if (slug === 'huadeng-shan-yu') return 'huadeng'
  if (slug in editionLabels.en) return slug
  return 'custom'
}

const isScriptMetaEntry = (entry: ScriptFileEntry): entry is ScriptMetaEntry =>
  typeof entry === 'object' && entry !== null && (entry as ScriptMetaEntry).id === '_meta'

const isScriptCharacterItem = (entry: ScriptFileEntry): entry is ScriptCharacterItem =>
  typeof entry === 'object' && entry !== null && (entry as ScriptMetaEntry).id !== '_meta'

/** Extract per-character night position overrides from script JSON items. */
function extractScriptNightPositions(
  items: ScriptCharacterItem[],
): Record<string, { firstNight?: number; otherNight?: number }> | undefined {
  const result: Record<string, { firstNight?: number; otherNight?: number }> = {}
  for (const item of items) {
    const fn = typeof item.firstNight === 'number' && item.firstNight > 0 ? item.firstNight : undefined
    const on = typeof item.otherNight === 'number' && item.otherNight > 0 ? item.otherNight : undefined
    if (fn !== undefined || on !== undefined) {
      result[item.id] = { ...(fn !== undefined ? { firstNight: fn } : {}), ...(on !== undefined ? { otherNight: on } : {}) }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

// ── Shared script-parsing helpers ────────────────────────────────────────────

/** Normalize the _meta entry from an array-format script (handles jinx overrides). */
function normalizeScriptMetaEntry(data: ScriptFileEntry[]) {
  const meta = data.find(isScriptMetaEntry)
  if (!meta) return undefined
  return {
    ...meta,
    jinxes: Array.isArray(meta.jinxes)
      ? meta.jinxes
          .map(normalizeScriptJinxOverride)
          .filter((e): e is NonNullable<ReturnType<typeof normalizeScriptJinxOverride>> => e !== null)
      : undefined,
  }
}

/** Extract character id list + raw ScriptCharacterItem list from array-format data. */
function extractScriptCharacters(data: ScriptFileEntry[]) {
  const scriptCharacterItems = data.filter(isScriptCharacterItem)
  const characters = data
    .filter((e): e is string | ScriptCharacterItem => typeof e === 'string' || isScriptCharacterItem(e))
    .map((e) => (typeof e === 'string' ? e : e.id))
  return { scriptCharacterItems, characters }
}

// ─────────────────────────────────────────────────────────────────────────────

function loadScripts() {
  return Object.entries(scriptFiles)
    .map(([path, data]) => {
      const sourceFile = path.split('/').pop() ?? 'script.json'
      const fallbackSlug = sourceFile.replace('.json', '')

      if (Array.isArray(data)) {
        const normalizedMeta = normalizeScriptMetaEntry(data as ScriptFileEntry[])
        const { scriptCharacterItems, characters } = extractScriptCharacters(data as ScriptFileEntry[])
        const nightPositions = extractScriptNightPositions(scriptCharacterItems)
        return {
          slug: fallbackSlug,
          title: normalizedMeta?.name ?? toTitleCase(fallbackSlug),
          titleZh: normalizedMeta?.name_zh ?? normalizedMeta?.name ?? toTitleCase(fallbackSlug),
          author: normalizedMeta?.author ?? '',
          meta: normalizedMeta ?? { id: '_meta', name: toTitleCase(fallbackSlug) },
          customCharacters: scriptCharacterItems.filter(
            (e) => typeof e.name === 'string' || typeof e.ability === 'string',
          ),
          edition: inferEditionFromSlug(fallbackSlug),
          characters,
          sourceFile,
          ...(nightPositions ? { scriptNightPositions: nightPositions } : {}),
        }
      }

      return {
        slug: data.slug ?? fallbackSlug,
        title: data.title ?? toTitleCase(fallbackSlug),
        titleZh: data.title ?? toTitleCase(fallbackSlug),
        author: '',
        meta: { id: '_meta', name: data.title ?? toTitleCase(fallbackSlug) },
        customCharacters: [],
        edition: data.edition ?? 'custom',
        characters: Array.isArray(data.characters) ? data.characters : [],
        sourceFile,
      }
    })
    .sort((left, right) => left.title.localeCompare(right.title))
}

export const { allCharacters, characterById } = loadCharacterCatalog()

/**
 * Get ST night reminder for a character in the given language.
 * Falls back: zh → en if zh not available; returns undefined if no reminder.
 */
export function getNightReminder(id: string, language: Language, night: 'first' | 'other'): string | undefined {
  // Custom chars: read from registry
  const custom = _customCharRegistry.get(id)
  if (custom) {
    if (night === 'first') return custom.firstNightReminder || undefined
    return custom.otherNightReminder || undefined
  }
  // Catalog chars: user override takes priority, then catalog data
  const ov = _charNightOverrides[id]
  const char = characterById[id]
  if (night === 'first') {
    if (language === 'zh') {
      return ov?.firstNightReminderZh ?? ov?.firstNightReminder
        ?? char?.firstNightReminderZh ?? char?.firstNightReminder
    }
    return ov?.firstNightReminder ?? char?.firstNightReminder
  }
  if (language === 'zh') {
    return ov?.otherNightReminderZh ?? ov?.otherNightReminder
      ?? char?.otherNightReminderZh ?? char?.otherNightReminder
  }
  return ov?.otherNightReminder ?? char?.otherNightReminder
}

export const initialScripts = loadScripts()

export function parseScriptFromData(data: unknown, filename: string): import('./types').EditableScript {
  const sourceFile = filename
  const fallbackSlug = filename.replace(/\.json$/i, '').replace(/\s+/g, '-').toLowerCase()

  // Deduplicate slug against built-in scripts.
  const dedupeSlug = (base: string) => {
    let slug = base
    let counter = 2
    while (initialScripts.some((s) => s.slug === slug)) { slug = `${base}-${counter}`; counter++ }
    return slug
  }

  if (Array.isArray(data)) {
    const normalizedMeta = normalizeScriptMetaEntry(data as ScriptFileEntry[])
    const { scriptCharacterItems, characters } = extractScriptCharacters(data as ScriptFileEntry[])
    const nightPositions = extractScriptNightPositions(scriptCharacterItems)
    return {
      slug: dedupeSlug(fallbackSlug),
      title: normalizedMeta?.name ?? toTitleCase(fallbackSlug),
      titleZh: normalizedMeta?.name_zh ?? normalizedMeta?.name ?? toTitleCase(fallbackSlug),
      author: normalizedMeta?.author ?? '',
      meta: normalizedMeta ?? { id: '_meta', name: toTitleCase(fallbackSlug) },
      customCharacters: scriptCharacterItems.filter(
        (e) => typeof e.name === 'string' || typeof e.ability === 'string',
      ),
      edition: inferEditionFromSlug(fallbackSlug),
      characters,
      sourceFile,
      ...(normalizedMeta?.version !== undefined ? { version: normalizedMeta.version } : {}),
      ...(normalizedMeta?.tags?.length ? { tags: normalizedMeta.tags } : {}),
      ...(nightPositions ? { scriptNightPositions: nightPositions } : {}),
    }
  }

  const d = data as any
  return {
    slug: dedupeSlug(fallbackSlug),
    title: d.title ?? toTitleCase(fallbackSlug),
    titleZh: d.title ?? toTitleCase(fallbackSlug),
    author: '',
    meta: { id: '_meta', name: d.title ?? toTitleCase(fallbackSlug) },
    customCharacters: [],
    edition: d.edition ?? 'custom',
    characters: Array.isArray(d.characters) ? d.characters : [],
    sourceFile,
    ...(d.version !== undefined ? { version: d.version } : {}),
  }
}

export function sortCharacterIds(ids: string[]) {
  return [...ids].sort((left, right) => {
    const leftCharacter = characterById[left]
    const rightCharacter = characterById[right]

    if (!leftCharacter || !rightCharacter) {
      return left.localeCompare(right)
    }

    const teamCompare =
      teamOrder.indexOf(leftCharacter.team) - teamOrder.indexOf(rightCharacter.team)
    return teamCompare !== 0
      ? teamCompare
      : getDisplayName(left, 'en').localeCompare(getDisplayName(right, 'en'))
  })
}

export function createScriptPayload(script: EditableScript) {
  const customCharactersById = new Map(script.customCharacters.map((character) => [character.id, character]))
  const normalizedScriptJinxes = (script.meta.jinxes ?? [])
    .map(normalizeScriptJinxOverride)
    .filter(
      (entry): entry is NonNullable<ReturnType<typeof normalizeScriptJinxOverride>> => entry !== null,
    )

  return [
    {
      ...script.meta,
      id: '_meta',
      name: script.title,
      name_zh: script.titleZh || script.title,
      author: script.author,
      logo: script.meta.logo ?? '',
      jinxes: normalizedScriptJinxes.length > 0 ? normalizedScriptJinxes : undefined,
      ...(script.version !== undefined ? { version: script.version } : {}),
      ...(script.tags?.length ? { tags: script.tags } : {}),
    },
    ...sortCharacterIds(script.characters).map((id) => customCharactersById.get(id) ?? id),
  ]
}
