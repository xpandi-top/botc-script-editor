export type Team =
  | 'townsfolk'
  | 'outsider'
  | 'minion'
  | 'demon'
  | 'traveler'
  | 'fabled'
  | 'loric'

export type CharacterEntry = {
  id: string
  team: Team
  edition: string
  current_revision?: string
  revisions?: CharacterRevisionEntry[]
  jinxes?: Array<{
    id: string
    reason: string
  }>
  /** Reminder tokens this character places on other players' seats. */
  reminders?: string[]
  /** Reminder tokens available on all seats regardless of assignment. */
  remindersGlobal?: string[]
  /** Whether this character affects game setup (bag composition). */
  setup?: boolean
  /** ST reminder shown during the first night phase (English). */
  firstNightReminder?: string
  /** ST reminder shown during other night phases (English). */
  otherNightReminder?: string
  /** ST reminder shown during the first night phase (Chinese). */
  firstNightReminderZh?: string
  /** ST reminder shown during other night phases (Chinese). */
  otherNightReminderZh?: string
}

export type CharacterRevisionEntry = {
  id: string
  note: string
  jinx_updates?: Record<string, string>
}

export type CharacterGroup = {
  team: Team
  characters: CharacterEntry[]
}

/** @deprecated Unused — prefer CharacterEntry */
export type CharacterSource = Partial<CharacterEntry>

/** @deprecated Unused — prefer Record<string, CharacterEntry> */
export type CharacterMap = Record<string, CharacterSource>

export type LegacyScriptFileSource = {
  slug?: string
  title?: string
  edition?: string
  characters?: string[]
}

export type ScriptMetaEntry = {
  id?: string
  name?: string
  name_zh?: string
  author?: string
  logo?: string
  hideTitle?: boolean
  background?: string
  almanac?: string
  bootlegger?: string[]
  bootlegger_zh?: string[]
  jinxes?: ScriptJinxOverride[]
  firstNight?: string[]
  otherNight?: string[]
  use_second_page_title_image?: boolean
  version?: string
  tags?: string[]                        // status tags preserved in exported JSON
}

export type ScriptJinxOverride = {
  id?: string
  characters?: [string, string]
  status?: 'active' | 'inactive'
  reason?: string
  reason_zh?: string
}

export type ScriptCharacterItem = {
  id: string
  name?: string
  name_zh?: string           // localized name (Chinese)
  image?: string | string[]
  team?: Team
  edition?: string
  ability?: string
  ability_zh?: string        // localized ability (Chinese)
  flavor?: string
  firstNight?: number
  firstNightReminder?: string
  otherNight?: number
  otherNightReminder?: string
  reminders?: string[]
  remindersGlobal?: string[]
  setup?: boolean
  jinxes?: Array<{
    id: string
    reason: string
  }>
  special?: Array<{
    type: 'selection' | 'ability' | 'signal' | 'vote' | 'reveal' | 'player'
    name: string
    value?: string | number
    time?: 'pregame' | 'day' | 'night' | 'firstNight' | 'firstDay' | 'otherNight' | 'otherDay'
    global?: 'townsfolk' | 'outsider' | 'minion' | 'demon' | 'traveller' | 'dead'
  }>
}

export type ScriptFileEntry = string | ScriptMetaEntry | ScriptCharacterItem

export type ScriptFileSource = LegacyScriptFileSource | ScriptFileEntry[]

export type EditableScript = {
  slug: string
  title: string
  titleZh: string
  author: string
  edition: string
  characters: string[]
  meta: ScriptMetaEntry
  customCharacters: ScriptCharacterItem[]
  sourceFile: string
  version?: string                         // version string e.g. "1.0", "2.3"
  notes?: string                           // ST notes for this script (legacy — kept for compat)
  tags?: string[]                          // quick status tags (wip, balanced, experimental…)
  pinnedRevisions?: Record<string, string> // charId → revisionId override
  folderId?: string                        // optional folder assignment (DIY scripts only)
  /** Structured revision history for this script (project extension, not in official schema). */
  scriptRevisions?: ScriptRevision[]
  /** ID of the currently active revision in scriptRevisions. */
  currentScriptRevision?: string
  /** Per-character night positions extracted from the script JSON (overrides catalog order) */
  scriptNightPositions?: Record<string, { firstNight?: number; otherNight?: number }>
}

// ── Script revisions ─────────────────────────────────────────────────────────

/** A single revision entry for a script (project-specific extension). */
export type ScriptRevision = {
  id: string        // e.g. "v1", "v2", "beta-3"
  note: string      // changelog / what changed
  date?: string     // ISO 8601 date string e.g. "2025-05-19"
}

// ── Script folders (Phase 3) ──────────────────────────────────────────────────

export type ScriptFolder = {
  id: string
  name: string
  order: number
  collapsed?: boolean
  /** Which script section owns this folder. Existing folders without this field default to 'diy'. */
  section?: 'community' | 'diy'
}

export type ResolvedScriptCharacter = CharacterEntry & {
  name?: string
  nameZh?: string      // inline Chinese name (for shared custom chars)
  ability?: string
  abilityZh?: string   // inline Chinese ability (for shared custom chars)
  image?: string | string[]
}

export type ResolvedScriptCharacterGroup = {
  team: Team
  characters: ResolvedScriptCharacter[]
}

export type LocaleCharacter = {
  name?: string
  ability?: string
  revision?: string
  revisions?: Record<string, string>
}

export type LocaleJinx = {
  revision?: string
  reason?: string
  revisions?: Record<string, string>
}

export type LocaleData = {
  ui?: Record<string, string>
  characters?: Record<string, LocaleCharacter>
  jinxes?: Record<string, LocaleJinx>
}

export type JinxRevisionEntry = {
  id: string
  note: string
  status: 'active' | 'inactive'
  triggered_by?: Record<string, string>
}

export type JinxEntry = {
  id: string
  characters: [string, string]
  current_revision: string
  status: 'active' | 'inactive'
  revisions: JinxRevisionEntry[]
}

export type JinxOverride = {
  status?: 'active' | 'inactive'
  reason_en?: string
  reason_zh?: string
}

export type JinxOverrides = Record<string, JinxOverride>

export type Language = 'en' | 'zh'

export type NightOrderData = {
  first_night?: string[]
  other_nights?: string[]
}

// ── Custom characters (Phase 2 — stored in localStorage BOTC_CUSTOM_CHARACTERS) ──

export type CustomCharacter = {
  id: string                      // must start with "custom_"
  author: string                  // required
  team: Team
  nameEn: string
  nameZh?: string
  abilityEn: string
  abilityZh?: string
  icon?: string                   // data URL (128 px JPEG) or https:// URL
  edition: string                 // user label, default "Custom"
  firstNight?: number             // 1-based position in night-order first_night array
  otherNight?: number             // 1-based position in night-order other_nights array
  firstNightReminder?: string
  otherNightReminder?: string
  reminders?: string[]
  /** Reminder tokens available on ALL seats regardless of which character sits there. */
  remindersGlobal?: string[]
  jinxes?: Array<{ id: string; reason: string }>
  createdAt: number
  updatedAt: number
}

// ── Revision overrides (Phase 1 — stored in localStorage BOTC_REVISION_OVERRIDES) ──

export type CharacterRevisionOverride = {
  current_revision: string
  revisions: CharacterRevisionEntry[]
  locale_en: Record<string, string>  // revisionId → ability text
  locale_zh?: Record<string, string>
}

export type RevisionOverrides = Record<string, CharacterRevisionOverride>

// ── Character pack types (per-character JSON + import/export) ─────────────────

/** Shape of individual per-character JSON files in assets/characters/individual/ */
export type CharacterFileEntry = {
  id: string
  team: Team
  edition: string
  current_revision?: string
  revisions?: CharacterRevisionEntry[]
  jinxes?: Array<{ id: string; reason: string }>
  /** Reminder tokens this character places on other players' seats. */
  reminders?: string[]
  /** Reminder tokens available on all seats regardless of assignment. */
  remindersGlobal?: string[]
  /** Whether this character affects game setup (bag composition). From official schema. */
  setup?: boolean
  firstNight?: number
  otherNight?: number
  /** Icon image URL (from BOTC script schema). String or array; normalised to string on import. */
  image?: string | string[]
  /** ST reminder shown during first night. Matches official roles.json field. */
  firstNightReminder?: string
  /** ST reminder shown during other nights. Matches official roles.json field. */
  otherNightReminder?: string
  en?: {
    name?: string
    ability?: string
    /** English flavor text from official roles.json. */
    flavor?: string
    revisions?: Record<string, string>
    firstNightReminder?: string
    otherNightReminder?: string
  }
  zh?: {
    name?: string
    ability?: string
    flavor?: string
    revisions?: Record<string, string>
    firstNightReminder?: string
    otherNightReminder?: string
  }
}

/** A character pack — array of CharacterFileEntry, used for download/upload */
export type CharacterPack = CharacterFileEntry[]

/** localStorage overrides from uploaded character packs */
export type CharacterPackOverrides = Record<string, {
  en?: { name?: string; ability?: string; revisions?: Record<string, string> }
  zh?: { name?: string; ability?: string; revisions?: Record<string, string> }
  current_revision?: string
}>
