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

export type Language = 'en' | 'zh'

export type NightOrderData = {
  first_night?: string[]
  other_nights?: string[]
}
