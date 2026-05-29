import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY } from '../components/StorytellerSub/constants'
import { loadInitialState } from '../components/StorytellerSub/storage'

const LEGACY_V4_KEY = 'botc-storyteller-companion-v4'

function minimalState(overrides: Record<string, unknown> = {}) {
  return {
    selectedDayId: 'legacy-day',
    timerDefaults: {},
    customTagPool: ['Outed Demon'],
    playerNamePool: ['Alice'],
    gameRecords: [],
    days: [{
      id: 'legacy-day',
      day: 1,
      phase: 'skill',
      seats: [{ seat: 1, name: 'Alice', customTags: ['safe'], stTags: ['poisoned'] }],
      skillHistory: [{ actor: 1, targets: [2] }],
      demonBluffs: ['washerwoman', 'chef'],
    }],
    ...overrides,
  }
}

describe('loadInitialState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns a valid fallback when no stored state exists', () => {
    const state = loadInitialState()

    expect(state.days).toHaveLength(1)
    expect(state.days[0].seats).toHaveLength(10)
    expect(state.customTagPool).toEqual(['流放'])
  })

  it('normalizes legacy phase and preserves newer fields', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalState()))

    const state = loadInitialState()

    expect(state.selectedDayId).toBe('legacy-day')
    expect(state.days[0].phase).toBe('public')
    expect(state.days[0].seats[0].name).toBe('Alice')
    expect(state.days[0].skillHistory[0].targetNotes).toEqual({})
    expect(state.days[0].demonBluffs).toEqual(['washerwoman', 'chef'])
  })

  it('falls back to legacy keys when the current key is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{bad json')
    localStorage.setItem(LEGACY_V4_KEY, JSON.stringify(minimalState({ selectedDayId: 'from-v4' })))

    const state = loadInitialState()

    expect(state.selectedDayId).toBe('from-v4')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').selectedDayId).toBe('from-v4')
  })

  it('ignores structurally invalid stored state without throwing', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ days: [] }))

    const state = loadInitialState()

    expect(state.days).toHaveLength(1)
    expect(state.days[0].seats).toHaveLength(10)
  })
})
