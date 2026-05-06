import { useMemo, useState } from 'react'
import type { GameRecord } from '../StorytellerSub/types'

export type FilterState = {
  scriptSlugs: string[]   // empty = all
  dateFrom: string        // YYYY-MM-DD or ''
  dateTo: string          // YYYY-MM-DD or ''
  winners: Array<'evil' | 'good' | 'storyteller'>  // empty = all
}

export const FILTER_DEFAULTS: FilterState = {
  scriptSlugs: [],
  dateFrom: '',
  dateTo: '',
  winners: [],
}

export function useAnalyticsFilter(records: GameRecord[]) {
  const [filter, setFilter] = useState<FilterState>(FILTER_DEFAULTS)

  const filtered = useMemo(() => {
    let list = records
    if (filter.scriptSlugs.length > 0) {
      const slugSet = new Set(filter.scriptSlugs)
      list = list.filter((r) => {
        const key = r.scriptSlug || r.scriptTitle || 'unknown'
        return slugSet.has(key)
      })
    }
    if (filter.dateFrom) {
      const from = new Date(filter.dateFrom).getTime()
      list = list.filter((r) => r.endedAt >= from)
    }
    if (filter.dateTo) {
      const to = new Date(filter.dateTo + 'T23:59:59').getTime()
      list = list.filter((r) => r.endedAt <= to)
    }
    if (filter.winners.length > 0) {
      const wSet = new Set(filter.winners)
      list = list.filter((r) => r.winner && wSet.has(r.winner))
    }
    return list
  }, [records, filter])

  const activeCount =
    filter.scriptSlugs.length +
    (filter.dateFrom ? 1 : 0) +
    (filter.dateTo ? 1 : 0) +
    filter.winners.length

  const resetFilter = () => setFilter(FILTER_DEFAULTS)

  // All unique script keys from records
  const allScriptOptions = useMemo(() => {
    const seen = new Map<string, string>() // key → label
    for (const r of records) {
      const key = r.scriptSlug || r.scriptTitle || 'unknown'
      if (!seen.has(key)) seen.set(key, r.scriptTitle || r.scriptSlug || key)
    }
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }))
  }, [records])

  return { filter, setFilter, filtered, activeCount, resetFilter, allScriptOptions }
}
