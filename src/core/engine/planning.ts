/**
 * Legal game line-ups and script pools, built by program so that AI answers
 * (and the no-model offline answers) start from something that follows the
 * rules: the official in-play counts, setup modifiers, bluffs, and the
 * standard script shapes. A model may explain or adjust them; it does not
 * have to count. Deterministic for a given seed.
 */
import type { Team } from '../types/catalog'
import type { TeamLookup } from './alignment'
import { CHARACTER_DISTRIBUTION, SETUP_OUTSIDER_SHIFTS } from './setup'

type CoreTeam = 'townsfolk' | 'outsider' | 'minion' | 'demon'
const CORE_TEAMS: CoreTeam[] = ['townsfolk', 'outsider', 'minion', 'demon']
export type TeamCounts = Record<CoreTeam, number>

/** Small seeded PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick(from: string[], count: number, first: string[], rng: () => number): string[] {
  const chosen = [...new Set(first)].filter((id) => from.includes(id)).slice(0, count)
  const rest = from.filter((id) => !chosen.includes(id))
  while (chosen.length < count && rest.length) chosen.push(rest.splice(Math.floor(rng() * rest.length), 1)[0])
  return chosen
}

function byTeam(ids: string[], getTeam: TeamLookup): Record<CoreTeam, string[]> {
  const out: Record<CoreTeam, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] }
  for (const id of new Set(ids)) {
    const team = getTeam(id)
    if (team && team in out) out[team as CoreTeam].push(id)
  }
  return out
}

export type SetupPlan = {
  players: number
  counts: TeamCounts
  /** In-play characters, Townsfolk → Demon. */
  inPlay: string[]
  /** 3 good characters not in play for the Demon to bluff as (7+ players), else []. */
  bluffs: string[]
  /** Setup abilities in play and the Outsider shift applied. */
  modifiers: Array<{ id: string; shift: number }>
  /** Requested characters that are not on the script. */
  missing: string[]
}

/** A legal line-up for `players` from the script, keeping `include` in play when possible. */
export function planSetup(opts: { scriptCharacters: string[]; players: number; getTeam: TeamLookup; include?: string[]; seed?: number }): SetupPlan | null {
  const base = CHARACTER_DISTRIBUTION[opts.players]
  if (!base) return null
  const rng = seededRandom(opts.seed ?? 1)
  const pool = byTeam(opts.scriptCharacters, opts.getTeam)
  const include = [...new Set(opts.include ?? [])]
  const missing = include.filter((id) => !opts.scriptCharacters.includes(id))

  const demons = pick(pool.demon, base.demon, include, rng)
  const minions = pick(pool.minion, base.minion, include, rng)
  const modifiers: SetupPlan['modifiers'] = []
  let outsiders = base.outsider
  for (const id of [...minions, ...demons]) {
    const options = SETUP_OUTSIDER_SHIFTS[id]
    if (!options) continue
    const shift = options.find((s) => outsiders + s >= 0 && outsiders + s <= pool.outsider.length && s !== 0) ?? 0
    outsiders += shift
    modifiers.push({ id, shift })
  }
  outsiders = Math.min(outsiders, pool.outsider.length)
  const townsfolk = opts.players - demons.length - minions.length - outsiders
  const chosenOutsiders = pick(pool.outsider, outsiders, include, rng)
  const chosenTownsfolk = pick(pool.townsfolk, townsfolk, include, rng)
  const inPlay = [...chosenTownsfolk, ...chosenOutsiders, ...minions, ...demons]
  const good = [...pool.townsfolk, ...pool.outsider].filter((id) => !inPlay.includes(id))
  const bluffs = opts.players >= 7 ? pick(good, 3, pool.townsfolk.filter((id) => !inPlay.includes(id)).sort(() => rng() - 0.5), rng) : []
  return {
    players: opts.players,
    counts: { townsfolk: chosenTownsfolk.length, outsider: chosenOutsiders.length, minion: minions.length, demon: demons.length },
    inPlay, bluffs, modifiers, missing,
  }
}

/** Common script shapes: a full script, and the small Teensyville shape for 5–6 players. */
export const SCRIPT_SHAPES: Record<'full' | 'teensy', TeamCounts> = {
  full: { townsfolk: 13, outsider: 4, minion: 4, demon: 4 },
  teensy: { townsfolk: 6, outsider: 2, minion: 2, demon: 2 },
}

export type ScriptPool = { characters: string[]; counts: TeamCounts; shape: 'full' | 'teensy'; short: CoreTeam[] }

/**
 * A script (character pool) of the given shape from `candidates`: requested
 * characters first, then preferred ones (e.g. a base script's), then others.
 * Travellers, Fabled and Loric are never added. `short` lists teams that did
 * not have enough candidates.
 */
export function buildScriptPool(opts: {
  candidates: Array<{ id: string; team: Team; edition?: string }>
  shape: 'full' | 'teensy'
  include?: string[]
  prefer?: string[]
  editions?: string[]
  seed?: number
}): ScriptPool {
  const rng = seededRandom(opts.seed ?? 1)
  const allowed = opts.candidates.filter((c) => (CORE_TEAMS as string[]).includes(c.team) && (!opts.editions?.length || opts.editions.includes(c.edition ?? '')))
  const teamOf = new Map(opts.candidates.map((c) => [c.id, c.team]))
  const target = SCRIPT_SHAPES[opts.shape]
  const include = (opts.include ?? []).filter((id) => (CORE_TEAMS as string[]).includes(teamOf.get(id) ?? ''))
  const characters: string[] = []
  const short: CoreTeam[] = []
  for (const team of CORE_TEAMS) {
    const ids = [...new Set([...include.filter((id) => teamOf.get(id) === team), ...allowed.filter((c) => c.team === team).map((c) => c.id)])]
    const preferred = [...include.filter((id) => teamOf.get(id) === team), ...(opts.prefer ?? []).filter((id) => ids.includes(id)).sort(() => rng() - 0.5)]
    const chosen = pick(ids, target[team], preferred, rng)
    if (chosen.length < target[team]) short.push(team)
    characters.push(...chosen)
  }
  const counts = Object.fromEntries(CORE_TEAMS.map((t) => [t, characters.filter((id) => teamOf.get(id) === t).length])) as TeamCounts
  return { characters, counts, shape: opts.shape, short }
}
