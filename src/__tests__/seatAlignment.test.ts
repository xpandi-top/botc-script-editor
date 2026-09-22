import { describe, it, expect, vi } from 'vitest'
import { defaultAlignment, seatAlignment, preserveAlignment, canViewSecrets } from '../utils/seatAlignment'
import { createSeats, createDayState, createTimerDefaults } from '../components/StorytellerSub/constants'
import { buildGameActions } from '../hooks/useGameActions'
import { buildPlayerLogEntries } from '../utils/playerLog'
import { buildAggregatedEntries } from '../utils/logFilter'

describe('player alignment', () => {
  it('defaults by actual role, with travellers left for the storyteller', () => {
    expect(defaultAlignment('chef')).toBe('good')
    expect(defaultAlignment('drunk')).toBe('good')
    expect(defaultAlignment('baron')).toBe('evil')
    expect(defaultAlignment('imp')).toBe('evil')
    expect(defaultAlignment('beggar')).toBeNull()
    expect(defaultAlignment(null)).toBeNull()
  })
  it('retains an explicit alignment or freezes a legacy default when changing role', () => {
    const seat = { ...createSeats(1)[0], characterId: 'chef' }
    expect(seatAlignment(preserveAlignment(seat, { ...seat, characterId: 'imp' }))).toBe('good')
    const evilChef = { ...seat, teamTag: 'evil' as const }
    expect(seatAlignment(preserveAlignment(evilChef, { ...evilChef, characterId: 'washerwoman' }))).toBe('evil')
    expect(preserveAlignment(seat, { ...seat, characterId: 'imp', teamTag: 'evil' }).teamTag).toBe('evil')
  })
  it('shows private controls only on revealed nights', () => {
    for (const phase of ['night', 'private', 'public', 'nomination'] as const) {
      expect(canViewSecrets(phase, false)).toBe(false)
      expect(canViewSecrets(phase, true)).toBe(phase === 'night')
    }
  })
  it('changing alignment records a private event and uses the undo checkpoint', () => {
    let day = createDayState(1, [{ ...createSeats(1)[0], characterId: 'baron' }], createTimerDefaults())
    const checkpoint = vi.fn(fn => { day = fn(day) })
    const actions = buildGameActions({
      currentDay: day, language: 'en', updateCurrentDayWithUndo: checkpoint,
      appendEvent: (d: typeof day, kind: string, detail: string, visibility: string) => ({ ...d, eventLog: [...d.eventLog, { id: '1', kind, detail, visibility, phase: d.phase, timestamp: 1 }] }),
    } as any)
    actions.updateSeatWithLog(1, s => ({ ...s, teamTag: 'good' }))
    expect(checkpoint).toHaveBeenCalledOnce()
    expect(day.seats[0].teamTag).toBe('good')
    expect(day.eventLog[0]).toMatchObject({ visibility: 'st-only' })
    expect(day.eventLog[0].detail).toContain('#1 team: Evil → Good')
  })
  it('daytime public abilities remain public in both logs', () => {
    const day = createDayState(1, createSeats(1), createTimerDefaults())
    day.skillHistory = [{ id: '1', actor: 1, targets: [], targetNotes: {}, roleId: 'slayer', statement: 'shot', note: '', result: null, activatedDuringPhase: 'public', visibility: 'public' }]
    expect(buildPlayerLogEntries([day], 1)[0].entries[0].visibility).toBe('public')
    expect(buildAggregatedEntries([day])[0].visibility).toBe('public')
  })
})
