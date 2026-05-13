import enLocale from '../assets/locales/en.json'
import jinxData from '../assets/jinxes.json'
import zhLocale from '../assets/locales/zh.json'
import nightOrderData from '../assets/characters/night-order.json'
import type {
  CharacterEntry,
  CharacterMap,
  CharacterRevisionEntry,
  CustomCharacter,
  EditableScript,
  JinxEntry,
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

const characterFiles = import.meta.glob('../assets/characters/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, CharacterMap>

const scriptFiles = import.meta.glob('../assets/scripts/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, ScriptFileSource>

const iconFiles = import.meta.glob('../assets/icons/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

export const locales: Record<Language, LocaleData> = {
  en: enLocale,
  zh: zhLocale,
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

  // No position → append (only if not already inserted)
  for (const c of customChars) {
    if (c.firstNight == null && !first.includes(c.id)) first.push(c.id)
    if (c.otherNight == null && !other.includes(c.id)) other.push(c.id)
  }
  return { first_night: first, other_nights: other }
}

/** Like buildEffectiveNightOrder but uses the currently registered custom chars. */
export function getEffectiveNightOrderFromRegistry(): NightOrderData {
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

function getCharacterCopy(id: string, language: Language) {
  const preferred = locales[language].characters?.[id]
  if (preferred?.name || preferred?.ability) {
    return preferred
  }

  const fallbackLanguage: Language = language === 'en' ? 'zh' : 'en'
  return locales[fallbackLanguage].characters?.[id]
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
  return getCharacterCopy(id, language)?.name ?? toTitleCase(id)
}

export function getAbilityText(id: string, language: Language = 'en') {
  const custom = _customCharRegistry.get(id)
  if (custom) return (language === 'zh' && custom.abilityZh) ? custom.abilityZh : custom.abilityEn
  return getCharacterCopy(id, language)?.ability ?? 'No ability text available.'
}

export function getJinxReason(id: string, language: Language = 'en') {
  return getJinxCopy(id, language)?.reason ?? ''
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
  return locales[language].characters?.[id]?.revisions?.[revision]
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

  Object.values(jinxes)
    .filter(
      (jinx) =>
        jinx.characters.length === 2 &&
        ids.has(jinx.characters[0]) &&
        ids.has(jinx.characters[1]),
    )
    .forEach((jinx) => {
      if (jinx.status !== 'active') {
        return
      }

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

  character.revisions = [
    ...existingRevisions,
    { id: normalizedRevision, note: note.trim() },
  ]
  character.current_revision = normalizedRevision

  ;(['en', 'zh'] as Language[]).forEach((language) => {
    const localeCharacters = locales[language].characters

    if (!localeCharacters?.[id]) {
      throw new Error(`Missing ${language} locale character entry: ${id}`)
    }

    localeCharacters[id].revision = normalizedRevision
    localeCharacters[id].ability = abilities[language]
    localeCharacters[id].revisions = {
      ...(localeCharacters[id].revisions ?? {}),
      [normalizedRevision]: abilities[language],
    }
  })

  return normalizedRevision
}

export function getIconForCharacter(id: string): string | undefined {
  const custom = _customCharRegistry.get(id)
  if (custom?.icon) return custom.icon

  const entry = Object.entries(iconFiles).find(([path]) =>
    path.endsWith(`/${id}.png`) ||
    path.endsWith(`/${id}.jpg`) ||
    path.endsWith(`/${id}.jpeg`) ||
    path.endsWith(`/${id}.webp`) ||
    path.endsWith(`/${id}.svg`),
  )
  return entry?.[1]
}

function loadCharacterCatalog() {
  const entries = new Map<string, CharacterEntry>()

  for (const data of Object.values(characterFiles)) {
    for (const [key, value] of Object.entries(data)) {
      const candidate = {
        id: value.id ?? key,
        team: value.team,
        edition: value.edition,
        current_revision: value.current_revision,
        revisions: Array.isArray(value.revisions)
          ? value.revisions.filter(
              (revision): revision is CharacterRevisionEntry =>
                Boolean(revision?.id && typeof revision.note === 'string'),
            )
          : undefined,
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

function loadScripts() {
  return Object.entries(scriptFiles)
    .map(([path, data]) => {
      const sourceFile = path.split('/').pop() ?? 'script.json'
      const fallbackSlug = sourceFile.replace('.json', '')

      if (Array.isArray(data)) {
        const meta = (data as ScriptFileEntry[]).find(isScriptMetaEntry)
        const normalizedMeta = meta
          ? {
              ...meta,
              jinxes: Array.isArray(meta.jinxes)
                ? meta.jinxes
                    .map(normalizeScriptJinxOverride)
                    .filter(
                      (
                        entry,
                      ): entry is NonNullable<ReturnType<typeof normalizeScriptJinxOverride>> =>
                        entry !== null,
                    )
                : undefined,
            }
          : undefined
        const scriptCharacterItems = data.filter(isScriptCharacterItem)
        const characters = data
          .filter(
            (entry): entry is string | ScriptCharacterItem =>
              typeof entry === 'string' || isScriptCharacterItem(entry),
          )
          .map((entry) => (typeof entry === 'string' ? entry : entry.id))

        return {
          slug: fallbackSlug,
          title: normalizedMeta?.name ?? toTitleCase(fallbackSlug),
          titleZh: normalizedMeta?.name_zh ?? normalizedMeta?.name ?? toTitleCase(fallbackSlug),
          author: normalizedMeta?.author ?? '',
          meta: normalizedMeta ?? { id: '_meta', name: toTitleCase(fallbackSlug) },
          customCharacters: scriptCharacterItems.filter(
            (entry) => typeof entry.name === 'string' || typeof entry.ability === 'string',
          ),
          edition: inferEditionFromSlug(fallbackSlug),
          characters,
          sourceFile,
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

export const initialScripts = loadScripts()

export function parseScriptFromData(data: unknown, filename: string): import('./types').EditableScript {
  const sourceFile = filename
  const fallbackSlug = filename.replace(/\.json$/i, '').replace(/\s+/g, '-').toLowerCase()

  if (Array.isArray(data)) {
    const meta = (data as ScriptFileEntry[]).find(isScriptMetaEntry)
    const normalizedMeta = meta
      ? {
          ...meta,
          jinxes: Array.isArray(meta.jinxes)
            ? meta.jinxes
                .map(normalizeScriptJinxOverride)
                .filter((e): e is NonNullable<ReturnType<typeof normalizeScriptJinxOverride>> => e !== null)
            : undefined,
        }
      : undefined
    const scriptCharacterItems = data.filter(isScriptCharacterItem)
    const characters = data
      .filter((e): e is string | ScriptCharacterItem => typeof e === 'string' || isScriptCharacterItem(e))
      .map((e) => (typeof e === 'string' ? e : e.id))

    let slug = fallbackSlug
    let counter = 2
    while (initialScripts.some((s) => s.slug === slug)) { slug = `${fallbackSlug}-${counter}`; counter++ }

    return {
      slug,
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
    }
  }

  const d = data as any
  let slug = fallbackSlug
  let counter = 2
  while (initialScripts.some((s) => s.slug === slug)) { slug = `${fallbackSlug}-${counter}`; counter++ }
  return {
    slug,
    title: d.title ?? toTitleCase(fallbackSlug),
    titleZh: d.title ?? toTitleCase(fallbackSlug),
    author: '',
    meta: { id: '_meta', name: d.title ?? toTitleCase(fallbackSlug) },
    customCharacters: [],
    edition: d.edition ?? 'custom',
    characters: Array.isArray(d.characters) ? d.characters : [],
    sourceFile,
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
    },
    ...sortCharacterIds(script.characters).map((id) => customCharactersById.get(id) ?? id),
  ]
}
