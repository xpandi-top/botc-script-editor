import type { Language } from '../../types'
import type { Phase, SkillDraft } from '../../core/types/game'

// Game-domain types (seats, days, votes, records, persisted state) live in
// src/core/types/game.ts; re-exported here so existing imports keep working.
export * from '../../core/types/game'

// ── UI types ───────────────────────────────────────────────────

export type PickerMode =
  | 'none'
  | 'speaker'
  | 'nominator'
  | 'nominee'
  | 'skillActor'
  | 'skillTarget'

export type LogFilterState = {
  types: Set<string>
  dayFilter: number | 'all'
  sortAsc: boolean
  visibility: 'all' | 'public' | 'st-only'
}

export type AggregatedLogEntry = {
  id: string
  day: number
  phase: string
  timestamp: number
  type: 'vote' | 'skill' | 'event'
  visibility: 'public' | 'st-only'
  detail: string
}

export type ExportConfig = {
  includeSeats: boolean
  includeVotes: boolean
  includeSkills: boolean
  includeEvents: boolean
  includeStNotes: boolean
  dayFilter: 'all' | number[]
}

export type ConsoleSection = 'game' | 'day' | 'player' | 'settings' | 'tags' | 'records'

export type ScriptOption = { slug: string; title: string; titleZh?: string; version?: string; characters: string[]; pinnedRevisions?: Record<string, string> }

export type AudioTrack = { name: string; src: string; type?: 'audio' | 'youtube'; embedSrc?: string }

export type SkillOverlayState = {
  pausedPhase: Phase
  wasTimerRunning: boolean
  draft: SkillDraft
  phaseContext: string
  visibility: 'public' | 'st-only'
}

export type DialogState =
  | { kind: 'voteResult'; nextValue: boolean | null; systemValue: boolean }
  | { kind: 'restartGame' }
  | { kind: 'endGame' }
  | { kind: 'deleteDay'; dayId: string; dayNum: number }
  | null

export type StorytellerHelperProps = {
  activeScriptSlug?: string
  activeScriptTitle?: string
  language: Language
  onLanguageChange?: (lang: Language) => void
  onSelectScript?: (slug: string) => void
  scriptOptions: ScriptOption[]
  onSwitchTab?: (tab: string) => void
  onAiContextChange?: (ctx: import('../../lib/ai').AiContext | undefined) => void
}
