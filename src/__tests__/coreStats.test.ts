import { describe, it, expect } from 'vitest'
import {
  computeCharStats,
  computeKpiSummary,
  computePlayerStats,
  computeScriptStats,
  computeStorytellerStats,
} from '../core/stats/records'
import type { GameRecord } from '../core/types/game'
import type { TeamLookup } from '../core/engine/alignment'

const getTeam: TeamLookup = (id) => ({ imp: 'demon', washerwoman: 'townsfolk', chef: 'townsfolk' } as const)[id as 'imp']

const day = (votes: number, votePassed: number, nominations = votes, skills = 0) => ({ day: 1, votes, votePassed, skills, nominations })

const records: GameRecord[] = [
  {
    id: 'g1',
    endedAt: 1,
    durationMs: 60 * 60000,
    scriptSlug: 'tb',
    scriptTitle: 'Trouble Brewing',
    winner: 'good',
    stName: 'Alice',
    mvp: 1,
    balanced: 4,
    funEvil: 3,
    funGood: 5,
    replay: 4,
    days: [day(2, 1), day(1, 0)],
    playerSummaries: [
      { seat: 1, name: 'Bob', team: 'good' },
      { seat: 2, name: 'Cara', team: 'good' },
      { seat: 3, name: 'Dan', team: 'evil' },
    ],
    setup: {
      playerCount: 3, travelerCount: 0, seatNames: {}, userAssignments: {}, seatNotes: {}, specialNote: '',
      assignments: { 1: 'washerwoman', 2: 'chef', 3: 'imp' },
      demonBluffs: ['empath', 'chef'],
    },
  },
  {
    id: 'g2',
    endedAt: 2,
    durationMs: 30 * 60000,
    scriptSlug: 'tb',
    scriptTitle: 'Trouble Brewing',
    winner: 'evil',
    stName: 'Alice',
    mvp: 'storyteller',
    days: [day(3, 1)],
    playerSummaries: [
      { seat: 1, name: 'Bob', team: 'evil' },
      { seat: 2, name: 'Alice', team: 'good' },
    ],
    setup: {
      playerCount: 2, travelerCount: 0, seatNames: {}, userAssignments: {}, seatNotes: {}, specialNote: '',
      assignments: { 1: 'imp', 2: 'chef' },
      demonBluffs: [],
    },
  },
  {
    id: 'g3',
    endedAt: 3,
    scriptTitle: 'Custom Fun',
    winner: null,
    days: [],
  },
]

describe('core/stats — computeScriptStats', () => {
  it('groups by slug (falling back to title) and sorts by games played', () => {
    const stats = computeScriptStats(records)
    expect(stats.map((s) => s.key)).toEqual(['tb', 'Custom Fun'])
    const tb = stats[0]
    expect(tb).toMatchObject({ total: 2, good: 1, evil: 1, st: 0, totalVotes: 6, totalVotePassed: 2, avgDays: 1.5, avgDurationMin: 45 })
    expect(tb.votePassRate).toBe(33)
    expect(tb.dayHistogram).toEqual([1, 1])
    expect(tb.ratingCount).toBe(1)
    expect(tb.avgBalanced).toBe(4)
  })

  it('reports null rates when there is nothing to average', () => {
    const custom = computeScriptStats(records).find((s) => s.key === 'Custom Fun')!
    expect(custom.votePassRate).toBeNull()
    expect(custom.avgDurationMin).toBeNull()
    expect(custom.avgBalanced).toBeNull()
  })
})

describe('core/stats — computePlayerStats', () => {
  it('computes per-alignment win rates, characters and teammates', () => {
    const bob = computePlayerStats(records, getTeam).find((p) => p.name === 'Bob')!
    expect(bob).toMatchObject({ total: 2, wins: 2, goodGames: 1, evilGames: 1, winRate: 100, evilRate: 50, mvpCount: 1 })
    expect(bob.charMap.get('imp')).toEqual({ charId: 'imp', total: 1, wins: 1, decided: 1 })
    expect(bob.teammates.get('Cara')).toBe(1)
    expect(bob.teammatesGood.get('Cara')).toBe(1)
    expect(bob.teammatesEvil.size).toBe(0)
  })

  it('credits storyteller MVPs and counts games run as storyteller', () => {
    const alice = computePlayerStats(records, getTeam).find((p) => p.name === 'Alice')!
    expect(alice.mvpCount).toBe(1)
    expect(alice.stGameCount).toBe(2)
  })
})

describe('core/stats — computeCharStats', () => {
  it('counts plays, wins and unassigned demon bluffs', () => {
    const stats = computeCharStats(records, getTeam)
    const imp = stats.find((c) => c.charId === 'imp')!
    expect(imp).toMatchObject({ total: 2, wins: 1, evilGames: 2, winRate: 50, evilWinRate: 50 })
    // empath was only ever a bluff, so it is filtered out of the play list
    expect(stats.find((c) => c.charId === 'empath')).toBeUndefined()
    // chef was a bluff in g1 but also assigned, so the bluff is not counted
    expect(stats.find((c) => c.charId === 'chef')!.bluffCount).toBe(0)
  })
})

describe('core/stats — computeStorytellerStats', () => {
  it('aggregates results and ratings per storyteller', () => {
    expect(computeStorytellerStats(records)).toEqual([
      expect.objectContaining({ name: 'Alice', total: 2, good: 1, evil: 1, ratingCount: 1, avgFunGood: 5 }),
    ])
  })
})

describe('core/stats — computeKpiSummary', () => {
  it('returns zeros for no records', () => {
    expect(computeKpiSummary([])).toMatchObject({ total: 0, evilPct: 0, avgDays: null })
  })

  it('computes win split and averages', () => {
    expect(computeKpiSummary(records)).toMatchObject({
      total: 3, goodWins: 1, evilWins: 1, stWins: 0,
      goodPct: 33, evilPct: 33, noResultPct: 33,
      avgDays: 1, avgDurationMin: 45, avgPlayers: 2.5, avgReplay: 4,
    })
  })
})
