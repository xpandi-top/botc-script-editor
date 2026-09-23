import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKpiSummary, useScriptStats, useStorytellerStats } from '../components/AnalyticsStudio/useStats'
import type { GameRecord } from '../components/StorytellerSub/types'

const records = [
  { scriptSlug: 'tb', stName: 'Alice', balanced: 4, funEvil: 5 },
  { scriptSlug: 'tb', stName: 'Alice', balanced: 2, replay: 3 },
  { scriptSlug: 'tb', stName: 'Alice' },
] as GameRecord[]

describe('analytics rating averages', () => {
  it('excludes missing ratings independently in overview, script and storyteller summaries', () => {
    const { result } = renderHook(() => ({
      overview: useKpiSummary(records),
      script: useScriptStats(records)[0],
      storyteller: useStorytellerStats(records)[0],
    }))
    for (const summary of Object.values(result.current)) {
      expect(summary.avgBalanced).toBe(3)
      expect(summary.avgFunEvil).toBe(5)
      expect(summary.avgFunGood).toBeNull()
      expect(summary.avgReplay).toBe(3)
    }
  })
  it('keeps missing averages empty when no ratings exist', () => {
    const { result } = renderHook(() => useKpiSummary([records[2]]))
    expect(result.current.avgBalanced).toBeNull()
    expect(result.current.avgReplay).toBeNull()
  })
})
