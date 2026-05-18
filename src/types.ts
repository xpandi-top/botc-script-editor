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

export type CharacterSource = Partial<CharacterEntry>

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
  image?: string | string[]
  team?: Team
  edition?: string
  ability?: string
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
}

export type ResolvedScriptCharacter = CharacterEntry & {
  name?: string
  ability?: string
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
  en?: { name?: string; ability?: string; revisions?: Record<string, string> }
  zh?: { name?: string; ability?: string; revisions?: Record<string, string> }
}

/** A character pack — array of CharacterFileEntry, used for download/upload */
export type CharacterPack = CharacterFileEntry[]

/** localStorage overrides from uploaded character packs */
export type CharacterPackOverrides = Record<string, {
  en?: { name?: string; ability?: string; revisions?: Record<string, string> }
  zh?: { name?: string; ability?: string; revisions?: Record<string, string> }
  current_revision?: string
}>
