import { describe, it, expect } from 'vitest'
import { createSeats } from '../core/engine/factories'
import { applySeatEdit, diffSeat, parseSeatTag } from '../core/engine/events'
import type { TeamLookup } from '../core/engine/alignment'
import type { StorytellerSeat } from '../core/types/game'
import { eventFields, presentSeatEvent } from '../utils/eventText'

const TEAMS: Record<string, 'townsfolk' | 'demon' | 'minion'> = { chef: 'townsfolk', imp: 'demon', spy: 'minion' }
const getTeam: TeamLookup = (id) => TEAMS[id]

function seat(overrides: Partial<StorytellerSeat> = {}): StorytellerSeat {
  return { ...createSeats(3)[2], ...overrides }
}

describe('core/engine/events — parseSeatTag', () => {
  it('reads labels and optional source characters', () => {
    expect(parseSeatTag('Drunk', 'public')).toEqual({ label: 'Drunk', sourceCharId: null })
    expect(parseSeatTag('📝Poisoned::poisoner', 'public')).toEqual({ label: 'Poisoned', sourceCharId: 'poisoner' })
    expect(parseSeatTag('Poisoned::poisoner', 'public')).toEqual({ label: 'Poisoned::poisoner', sourceCharId: null })
    expect(parseSeatTag('Poisoned::poisoner', 'st')).toEqual({ label: 'Poisoned', sourceCharId: 'poisoner' })
    expect(parseSeatTag('📝Red herring::', 'st')).toEqual({ label: 'Red herring', sourceCharId: null })
  })
})

describe('core/engine/events — applySeatEdit', () => {
  it('grants a vote token on death', () => {
    expect(applySeatEdit(getTeam, seat(), seat({ alive: false })).voteTokens).toBe(1)
    expect(applySeatEdit(getTeam, seat({ alive: false, voteTokens: 1 }), seat({ alive: true, voteTokens: 1 })).voteTokens).toBe(1)
  })

  it('keeps the alignment when only the character changes', () => {
    const before = seat({ characterId: 'imp', teamTag: null })
    expect(applySeatEdit(getTeam, before, { ...before, characterId: 'chef' }).teamTag).toBe('evil')
    // an explicit team change in the same edit wins
    expect(applySeatEdit(getTeam, before, { ...before, characterId: 'chef', teamTag: 'good' }).teamTag).toBe('good')
  })
})

describe('core/engine/events — diffSeat', () => {
  it('reports every change in log order', () => {
    const before = seat({ characterId: 'chef', teamTag: 'good', customTags: ['old'], stTags: ['📝Drunk::drunk'] })
    const after = seat({
      alive: false, isExecuted: true, isTraveler: true, hasNoVote: true,
      characterId: 'imp', teamTag: 'evil', userCharacterId: 'chef',
      customTags: ['📝Poisoned::poisoner'], stTags: ['Mad'],
    })
    expect(diffSeat(getTeam, before, after).map((e) => e.code)).toEqual([
      'seat.died', 'seat.executed', 'seat.traveler', 'seat.noVote',
      'seat.character', 'seat.alignment', 'seat.perceived',
      'seat.publicTag.added', 'seat.publicTag.removed',
      'seat.stTag.added', 'seat.stTag.removed',
    ])
  })

  it('carries parameters and skips non-changes', () => {
    expect(diffSeat(getTeam, seat(), seat())).toEqual([])
    expect(diffSeat(getTeam, seat({ characterId: null }), seat({ characterId: 'imp' }))).toEqual([
      { code: 'seat.character', params: { seat: 3, from: null, to: 'imp' } },
      { code: 'seat.alignment', params: { seat: 3, from: null, to: 'evil' } },
    ])
  })
})

describe('utils/eventText — presentSeatEvent', () => {
  const show = (events: ReturnType<typeof diffSeat>, lang: 'en' | 'zh') => events.map((e) => presentSeatEvent(e, lang))

  it('renders flags and roles exactly like the legacy log', () => {
    const events = diffSeat(getTeam, seat({ characterId: 'chef' }), seat({ alive: false, hasNoVote: true, characterId: 'imp', teamTag: 'evil' }))
    expect(show(events, 'en')).toEqual([
      { kind: 'stateChange', detail: '#3 died' },
      { kind: 'stateChange', detail: '#3 lost vote token' },
      { kind: 'tagChange', detail: '#3 role changed: Chef → Imp' },
      { kind: 'tagChange', detail: '#3 team: Good → Evil', visibility: 'st-only' },
    ])
    expect(show(events, 'zh').map((e) => e?.detail)).toEqual(['#3 死亡', '#3 失去投票权', expect.stringMatching(/^#3 角色变更: .+ → .+$/), '#3 阵营: 善良 → 邪恶'])
  })

  it('renders assigned, cleared and perceived roles', () => {
    expect(presentSeatEvent({ code: 'seat.character', params: { seat: 2, from: null, to: 'imp' } }, 'en')?.detail).toBe('#2 role assigned: Imp')
    expect(presentSeatEvent({ code: 'seat.character', params: { seat: 2, from: 'imp', to: null } }, 'en')?.detail).toBe('#2 role cleared: Imp')
    expect(presentSeatEvent({ code: 'seat.perceived', params: { seat: 2, from: null, to: 'chef' } }, 'en')).toEqual({ kind: 'tagChange', detail: '#2 Perceived character: — → Chef', visibility: 'st-only' })
  })

  it('renders public and ST tags with character icons', () => {
    const events = diffSeat(getTeam, seat(), seat({ customTags: ['📝Poisoned::poisoner', 'Hmm'], stTags: ['Mad::cerenovus'] }))
    expect(show(events, 'en').map((e) => e?.detail)).toEqual([
      '#3 tagged: [icon:poisoner] Poisoner:Poisoned',
      '#3 tagged: Hmm',
      '#3 tagged: [icon:cerenovus] Mad',
    ])
  })

  it('exposes code and params for the log entry', () => {
    expect(eventFields({ code: 'seat.died', params: { seat: 4 } })).toEqual({ code: 'seat.died', params: { seat: 4 } })
  })
})
