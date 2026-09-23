import { useMemo } from 'react'
import type { GameRecord } from '../StorytellerSub/types'
import type { Language } from '../../types'
import {
  computeCharStats,
  computeKpiSummary,
  computePlayerStats,
  computeScriptStats,
  computeStorytellerStats,
  type CharStat,
  type KpiSummary,
  type PlayerStat,
  type ScriptStat,
  type StorytellerStat,
} from '../../core/stats/records'

// The computations live in src/core/stats (framework-free, reused by the API);
// these hooks only memoize them per records array.
export type { CharPlayEntry, CharStat, KpiSummary, PlayerStat, ScriptStat, StorytellerStat } from '../../core/stats/records'

export function useScriptStats(records: GameRecord[]): ScriptStat[] {
  return useMemo(() => computeScriptStats(records), [records])
}

export function usePlayerStats(records: GameRecord[]): PlayerStat[] {
  return useMemo(() => computePlayerStats(records), [records])
}

export function useCharStats(records: GameRecord[], language: Language): CharStat[] {
  // language is kept as a dependency so the list refreshes on a language switch,
  // matching the previous behavior; the computation itself is language-neutral.
  return useMemo(() => computeCharStats(records), [records, language])
}

export function useStorytellerStats(records: GameRecord[]): StorytellerStat[] {
  return useMemo(() => computeStorytellerStats(records), [records])
}

export function useKpiSummary(records: GameRecord[]): KpiSummary {
  return useMemo(() => computeKpiSummary(records), [records])
}
