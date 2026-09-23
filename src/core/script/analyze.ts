/**
 * Deterministic script analysis (no LLM): team make-up against the standard
 * 13/4/4/4 layout, which player counts the script can deal, setup modifiers,
 * night wakers and jinxes. Backs the planned `POST /v1/scripts:analyze` and
 * `analyze_script` MCP tool; an agent adds the judgement on top.
 */
import type { Team } from '../types/catalog'
import { CHARACTER_DISTRIBUTION } from '../engine/setup'

export type AnalyzableCharacter = {
  id: string
  team: Team
  edition?: string
  setup?: boolean
  firstNight?: number
  otherNight?: number
}

export type ScriptAnalysisLookup = {
  getCharacter(id: string): AnalyzableCharacter | undefined
  /** Active jinxes among the given ids. */
  jinxesAmong?(ids: string[]): Array<{ id: string }>
}

export type ScriptAnalysis = {
  characterCount: number
  unknownCharacters: string[]
  teamCounts: Record<Team, number>
  /** Difference from the standard 13 townsfolk / 4 outsiders / 4 minions / 4 demons (positive = more). */
  vsStandard: Record<'townsfolk' | 'outsider' | 'minion' | 'demon', number>
  editions: Record<string, number>
  /** Characters flagged as changing setup (e.g. Baron, Drunk). */
  setupModifiers: string[]
  firstNightWakers: string[]
  otherNightWakers: string[]
  jinxes: string[]
  /** For each official player count, whether every team has enough distinct characters to deal it. */
  playerCounts: Array<{ players: number; dealable: boolean; short: Partial<Record<'townsfolk' | 'outsider' | 'minion' | 'demon', number>> }>
}

export const STANDARD_SCRIPT_LAYOUT = { townsfolk: 13, outsider: 4, minion: 4, demon: 4 } as const

export function analyzeScript(characterIds: string[], lookup: ScriptAnalysisLookup): ScriptAnalysis {
  const teamCounts: Record<Team, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveler: 0, fabled: 0, loric: 0 }
  const editions: Record<string, number> = {}
  const unknownCharacters: string[] = []
  const known: AnalyzableCharacter[] = []
  for (const id of [...new Set(characterIds)]) {
    const character = lookup.getCharacter(id)
    if (!character) { unknownCharacters.push(id); continue }
    known.push(character)
    teamCounts[character.team]++
    if (character.edition) editions[character.edition] = (editions[character.edition] ?? 0) + 1
  }
  const byNight = (key: 'firstNight' | 'otherNight') => known
    .filter((c) => typeof c[key] === 'number')
    .sort((a, b) => (a[key] as number) - (b[key] as number))
    .map((c) => c.id)
  const baseTeams = ['townsfolk', 'outsider', 'minion', 'demon'] as const
  const playerCounts = Object.entries(CHARACTER_DISTRIBUTION).map(([players, dist]) => {
    const short: Partial<Record<(typeof baseTeams)[number], number>> = {}
    for (const team of baseTeams) {
      const missing = dist[team] - teamCounts[team]
      if (missing > 0) short[team] = missing
    }
    return { players: Number(players), dealable: Object.keys(short).length === 0, short }
  })
  return {
    characterCount: known.length + unknownCharacters.length,
    unknownCharacters,
    teamCounts,
    vsStandard: Object.fromEntries(baseTeams.map((t) => [t, teamCounts[t] - STANDARD_SCRIPT_LAYOUT[t]])) as ScriptAnalysis['vsStandard'],
    editions,
    setupModifiers: known.filter((c) => c.setup).map((c) => c.id),
    firstNightWakers: byNight('firstNight'),
    otherNightWakers: byNight('otherNight'),
    jinxes: (lookup.jinxesAmong?.(known.map((c) => c.id)) ?? []).map((j) => j.id),
    playerCounts,
  }
}
