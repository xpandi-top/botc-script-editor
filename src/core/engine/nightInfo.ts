/**
 * Legal night information for information characters (P4, AI storyteller).
 *
 * Given the grimoire, lists what a seat may truthfully be shown, including
 * the Recluse / Spy "might register as" wiggle room, and flags drunk or
 * poisoned seats (their information may be anything). The storyteller —
 * human or agent — picks one option; nothing here invents information.
 *
 * Covers the Trouble Brewing information roles; other roles return
 * `kind: 'unsupported'` so the caller falls back to the reminder text.
 */
import type { Team } from '../types/catalog'
import type { DayState, StorytellerSeat } from '../types/game'
import { seatAlignmentWith, type TeamLookup } from './alignment'
import { impairmentsOf } from './nightScript'
import { parseSeatTag } from './events'

export type PairOption = { character: string; seat: number; otherSeats: number[] }

export type NightInfo =
  | { kind: 'pair'; team: Team; options: PairOption[]; noneInPlay: boolean }
  | { kind: 'number'; values: number[]; truth: number }
  | { kind: 'yesno'; values: boolean[]; truth: boolean }
  | { kind: 'character'; seat: number; values: string[]; truth: string | null }
  | { kind: 'needs_targets'; count: number }
  | { kind: 'unsupported' }

export type NightInfoSuggestion = {
  seat: number
  /** The role the player acts as (what they believe they are). */
  role: string | null
  /** False when drunk, poisoned or not really this role: any answer is allowed. */
  truthful: boolean
  impaired: Array<'drunk' | 'poisoned'>
  info: NightInfo
  notes: string[]
}

type Registration = { alignments: Set<'good' | 'evil'>; teams: Set<Team> }

/** How a seat can register: its real team, plus the Recluse / Spy misregistration. */
function registrationOf(seat: StorytellerSeat, getTeam: TeamLookup): Registration {
  const team = seat.characterId ? getTeam(seat.characterId) : undefined
  const alignment = seatAlignmentWith(getTeam, seat)
  const reg: Registration = { alignments: new Set(alignment ? [alignment] : []), teams: new Set(team ? [team] : []) }
  if (seat.characterId === 'recluse') {
    reg.alignments.add('evil')
    reg.teams.add('minion').add('demon')
  }
  if (seat.characterId === 'spy') {
    reg.alignments.add('good')
    reg.teams.add('townsfolk').add('outsider')
  }
  return reg
}

const definitelyEvil = (r: Registration) => r.alignments.size === 1 && r.alignments.has('evil')
const maybeEvil = (r: Registration) => r.alignments.has('evil')

function range(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

/** Seats clockwise around the table (by seat number), as a circle. */
function circle(day: Pick<DayState, 'seats'>): StorytellerSeat[] {
  return [...day.seats].sort((a, b) => a.seat - b.seat)
}

/** The nearest living neighbour in each direction (skipping the dead). */
function livingNeighbours(day: Pick<DayState, 'seats'>, seat: number): StorytellerSeat[] {
  const ring = circle(day)
  const i = ring.findIndex((s) => s.seat === seat)
  const found: StorytellerSeat[] = []
  for (const dir of [-1, 1]) {
    for (let step = 1; step < ring.length; step++) {
      const s = ring[(i + dir * step + ring.length) % ring.length]
      if (s.seat === seat) break
      if (s.alive) { if (!found.includes(s)) found.push(s); break }
    }
  }
  return found
}

function pairInfo(day: Pick<DayState, 'seats'>, self: number, team: Team, getTeam: TeamLookup): NightInfo {
  const others = day.seats.filter((s) => s.seat !== self)
  const options: PairOption[] = []
  for (const s of others) {
    const reg = registrationOf(s, getTeam)
    if (!reg.teams.has(team) || !s.characterId) continue
    // The shown character must be one of `team`; a misregistering Spy/Recluse is shown as some other character.
    const shown = getTeam(s.characterId) === team ? s.characterId : `any-${team}`
    options.push({ character: shown, seat: s.seat, otherSeats: others.filter((o) => o.seat !== s.seat).map((o) => o.seat) })
  }
  const noneInPlay = !others.some((s) => s.characterId && getTeam(s.characterId) === team)
  return { kind: 'pair', team, options, noneInPlay }
}

export type NightInfoOptions = {
  /** Players the role chose (Fortune Teller: 2; Ravenkeeper: 1). */
  targets?: number[]
  /**
   * Seat executed today, for the Undertaker; null = nobody. When omitted, the
   * first seat marked executed on the given day is used.
   */
  executedSeat?: number | null
}

export function suggestNightInfo(day: Pick<DayState, 'seats'>, seatNumber: number, getTeam: TeamLookup, opts: NightInfoOptions = {}): NightInfoSuggestion | null {
  const seat = day.seats.find((s) => s.seat === seatNumber)
  if (!seat) return null
  const role = seat.userCharacterId ?? seat.characterId
  const impaired = impairmentsOf(seat)
  const believesOtherRole = !!seat.userCharacterId && seat.userCharacterId !== seat.characterId
  const truthful = impaired.length === 0 && !believesOtherRole
  const notes: string[] = []
  if (!truthful) notes.push(`Seat ${seatNumber} is ${[...impaired, ...(believesOtherRole ? [`really the ${seat.characterId}`] : [])].join(' and ')}: any information may be given; the options below are the true ones.`)
  const misregistering = day.seats.filter((s) => s.seat !== seatNumber && (s.characterId === 'recluse' || s.characterId === 'spy'))
  if (misregistering.length) notes.push(`May register falsely: ${misregistering.map((s) => `#${s.seat} (${s.characterId})`).join(', ')}. The options include those possibilities.`)

  const base = { seat: seatNumber, role, truthful, impaired, notes }

  switch (role) {
    case 'washerwoman': return { ...base, info: pairInfo(day, seatNumber, 'townsfolk', getTeam) }
    case 'librarian': {
      const info = pairInfo(day, seatNumber, 'outsider', getTeam)
      if (info.kind === 'pair' && info.noneInPlay) notes.push('No Outsiders in play: the Librarian may learn that there are 0 Outsiders (unless showing a misregistering Spy).')
      return { ...base, info }
    }
    case 'investigator': return { ...base, info: pairInfo(day, seatNumber, 'minion', getTeam) }
    case 'chef': {
      const ring = circle(day)
      let min = 0
      let max = 0
      for (let i = 0; i < ring.length; i++) {
        const a = registrationOf(ring[i], getTeam)
        const b = registrationOf(ring[(i + 1) % ring.length], getTeam)
        if (ring.length < 2) break
        if (definitelyEvil(a) && definitelyEvil(b)) min++
        if (maybeEvil(a) && maybeEvil(b)) max++
      }
      const truth = ring.reduce((n, s, i) => n + (seatAlignmentWith(getTeam, s) === 'evil' && seatAlignmentWith(getTeam, ring[(i + 1) % ring.length]) === 'evil' ? 1 : 0), 0)
      return { ...base, info: { kind: 'number', values: range(min, max), truth } }
    }
    case 'empath': {
      const neighbours = livingNeighbours(day, seatNumber)
      const regs = neighbours.map((s) => registrationOf(s, getTeam))
      const truth = neighbours.filter((s) => seatAlignmentWith(getTeam, s) === 'evil').length
      notes.push(`Living neighbours: ${neighbours.map((s) => `#${s.seat}`).join(' and ') || 'none'}.`)
      return { ...base, info: { kind: 'number', values: range(regs.filter(definitelyEvil).length, regs.filter(maybeEvil).length), truth } }
    }
    case 'fortuneteller': {
      const targets = opts.targets ?? []
      if (targets.length !== 2) return { ...base, info: { kind: 'needs_targets', count: 2 } }
      const chosen = day.seats.filter((s) => targets.includes(s.seat))
      const herring = (s: StorytellerSeat) => (s.stTags ?? []).some((t) => /red herring|红鲱鱼|干扰项/i.test(parseSeatTag(t, 'st').label))
      const truth = chosen.some((s) => (s.characterId ? getTeam(s.characterId) === 'demon' : false) || herring(s))
      const possibleYes = truth || chosen.some((s) => registrationOf(s, getTeam).teams.has('demon'))
      if (!day.seats.some(herring)) notes.push('No Red Herring is marked: tag one good player with "Red herring" (ST tag).')
      return { ...base, info: { kind: 'yesno', values: possibleYes && !truth ? [false, true] : [truth], truth } }
    }
    case 'undertaker':
    case 'ravenkeeper': {
      const target = role === 'undertaker'
        ? (opts.executedSeat !== undefined ? opts.executedSeat : day.seats.find((s) => s.isExecuted)?.seat ?? null)
        : opts.targets?.[0] ?? null
      if (target === null || target === undefined) {
        return role === 'undertaker'
          ? { ...base, info: { kind: 'character', seat: 0, values: [], truth: null }, notes: [...notes, 'Nobody was executed today: the Undertaker does not wake.'] }
          : { ...base, info: { kind: 'needs_targets', count: 1 } }
      }
      const t = day.seats.find((s) => s.seat === target)
      const truth = t?.characterId ?? null
      const values = truth ? [truth] : []
      if (t?.characterId === 'recluse') notes.push(`#${target} is the Recluse and may be shown as any Minion or Demon instead.`)
      if (t?.characterId === 'spy') notes.push(`#${target} is the Spy and may be shown as any Townsfolk or Outsider instead.`)
      return { ...base, info: { kind: 'character', seat: target, values, truth } }
    }
    default:
      return { ...base, info: { kind: 'unsupported' } }
  }
}
