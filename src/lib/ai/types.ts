/**
 * Core AI types shared across lib and component layers.
 */

import type { Language, Team } from '../../types'
import type { DayState } from '../../components/StorytellerSub/types'
import type { EditableScript } from '../../types'

// ── Context ───────────────────────────────────────────────────────────────────

export type AiContextType =
  | 'character'
  | 'script'
  | 'storyteller'
  | 'gamelog'
  | 'analysis'
  | 'general'

export type AiField = {
  key: string
  label: string
  value: unknown
  editable?: boolean
}

export type AiContext = {
  type: AiContextType
  title: string
  language: Language
  fields: AiField[]
  /** Pre-serialized text for prompt injection */
  serialized?: string
}

// ── Response types ────────────────────────────────────────────────────────────

export type FillAction = {
  field: string
  value: unknown
  label?: string
}

export type AgentResponse = {
  message: string
  fills?: FillAction[]
  warning?: string
}

// ── Input types for context builders ─────────────────────────────────────────

export type CharacterInput = {
  id?: string
  nameEn: string
  nameZh?: string
  team: Team
  edition: string
  author: string
  abilityEn: string
  abilityZh?: string
  firstNightReminder?: string
  otherNightReminder?: string
  firstNight?: number
  otherNight?: number
  isNew?: boolean
}

export type StorytellerInput = {
  scriptName: string
  stName?: string
  currentDay: DayState
  days: DayState[]
  language: Language
}

export type GameLogInput = {
  scriptName: string
  stName?: string
  days: DayState[]
  language: Language
}

export type ScriptInput = {
  script: EditableScript
  language: Language
}

export type AnalysisInput = {
  language: Language
  recordCount?: number
  recentScripts?: string[]
}
