/**
 * Analytics over saved game records — pure functions shared by the
 * Analytics tab (via useMemo hooks in AnalyticsStudio/useStats.ts) and the
 * /v1/me/stats API. Player and character stats read each record's players
 * through the identity history, so they need the catalog's TeamLookup.
 */
import type { GameRecord } from '../types/game'
import type { TeamLookup } from '../engine/alignment'
import { identityForBasis, recordPlayers, type IdentityBasis } from '../engine/identity'

// ── Script stats ─────────────────────────────────────────────────

export type ScriptStat = {
  key: string
  title: string
  total: number
  evil: number
  good: number
  st: number
  totalDays: number
  totalVotes: number
  totalVotePassed: number
  totalNominations: number
  totalSkills: number
  totalDurationMs: number
  durationCount: number
  avgDays: number
  avgVotes: number
  avgNominations: number
  votePassRate: number | null
  avgDurationMin: number | null
  dayHistogram: number[]   // index=day-1, value=count of games that lasted that many days
  // Rating aggregates (1–5 stars, null = no ratings yet)
  ratingCount: number
  avgBalanced: number | null
  avgFunEvil: number | null
  avgFunGood: number | null
  avgReplay: number | null
}

export function computeScriptStats(records: GameRecord[]): ScriptStat[] {
  const map = new Map<string, {
    key: string; title: string; total: number; evil: number; good: number; st: number
    totalDays: number; totalVotes: number; totalVotePassed: number
    totalNominations: number; totalSkills: number
    totalDurationMs: number; durationCount: number
    dayHistogram: number[]
    balancedCount: number; funEvilCount: number; funGoodCount: number; replayCount: number
    ratingCount: number; totalBalanced: number; totalFunEvil: number; totalFunGood: number; totalReplay: number
  }>()

  for (const r of records) {
    const key = r.scriptSlug || r.scriptTitle || 'unknown'
    const entry = map.get(key) ?? {
      key, title: r.scriptTitle || r.scriptSlug || '?',
      total: 0, evil: 0, good: 0, st: 0,
      totalDays: 0, totalVotes: 0, totalVotePassed: 0,
      totalNominations: 0, totalSkills: 0,
      totalDurationMs: 0, durationCount: 0,
      dayHistogram: [],
      balancedCount: 0, funEvilCount: 0, funGoodCount: 0, replayCount: 0,
      ratingCount: 0, totalBalanced: 0, totalFunEvil: 0, totalFunGood: 0, totalReplay: 0,
    }
    entry.total++
    if (r.winner === 'evil') entry.evil++
    else if (r.winner === 'good') entry.good++
    else if (r.winner === 'storyteller') entry.st++
    const dayLen = r.days?.length ?? 0
    entry.totalDays += dayLen
    entry.totalVotes += r.days?.reduce((s, d) => s + (d.votes ?? 0), 0) ?? 0
    entry.totalVotePassed += r.days?.reduce((s, d) => s + (d.votePassed ?? 0), 0) ?? 0
    entry.totalNominations += r.days?.reduce((s, d) => s + (d.nominations ?? 0), 0) ?? 0
    entry.totalSkills += r.days?.reduce((s, d) => s + (d.skills ?? 0), 0) ?? 0
    if (r.durationMs) { entry.totalDurationMs += r.durationMs; entry.durationCount++ }
    if (r.balanced != null || r.funEvil != null || r.funGood != null || r.replay != null) {
      entry.ratingCount++
      if (r.balanced != null) { entry.totalBalanced += r.balanced; entry.balancedCount++ }
      if (r.funEvil != null) { entry.totalFunEvil += r.funEvil; entry.funEvilCount++ }
      if (r.funGood != null) { entry.totalFunGood += r.funGood; entry.funGoodCount++ }
      if (r.replay != null) { entry.totalReplay += r.replay; entry.replayCount++ }
    }
    if (dayLen > 0) {
      entry.dayHistogram[dayLen - 1] = (entry.dayHistogram[dayLen - 1] ?? 0) + 1
    }
    map.set(key, entry)
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .map((s) => ({
      ...s,
      avgDays: s.total ? +(s.totalDays / s.total).toFixed(1) : 0,
      avgVotes: s.total ? +(s.totalVotes / s.total).toFixed(1) : 0,
      avgNominations: s.total ? +(s.totalNominations / s.total).toFixed(1) : 0,
      votePassRate: s.totalVotes ? Math.round((s.totalVotePassed / s.totalVotes) * 100) : null,
      avgDurationMin: s.durationCount ? Math.round(s.totalDurationMs / s.durationCount / 60000) : null,
      avgBalanced: s.balancedCount ? +(s.totalBalanced / s.balancedCount).toFixed(1) : null,
      avgFunEvil: s.funEvilCount ? +(s.totalFunEvil / s.funEvilCount).toFixed(1) : null,
      avgFunGood: s.funGoodCount ? +(s.totalFunGood / s.funGoodCount).toFixed(1) : null,
      avgReplay: s.replayCount ? +(s.totalReplay / s.replayCount).toFixed(1) : null,
    }))
}

// ── Player stats ─────────────────────────────────────────────────

export type CharPlayEntry = { charId: string; total: number; wins: number; decided: number }

export type PlayerStat = {
  name: string
  total: number
  wins: number
  evilGames: number
  goodGames: number
  evilWins: number
  goodWins: number
  mvpCount: number
  /** Games this player ran as storyteller (matched via GameRecord.stName) */
  stGameCount: number
  decided: number
  winRate: number
  evilWinRate: number | null
  goodWinRate: number | null
  /** evilGames / (evilGames + goodGames) * 100 — how often this player is evil */
  evilRate: number | null
  charMap: Map<string, CharPlayEntry>   // charId → {total, wins}
  mostPlayedChar: string | null
  charSet: Set<string>
  teammates: Map<string, number>        // playerName → total games played together
  teammatesGood: Map<string, number>    // playerName → games as good together
  teammatesEvil: Map<string, number>    // playerName → games as evil together
}

export function computePlayerStats(records: GameRecord[], getTeam: TeamLookup, basis: IdentityBasis = 'final'): PlayerStat[] {
  // Build stName → game count map first for cross-referencing
  const stGameCount = new Map<string, number>()
  for (const r of records) {
    const n = r.stName?.trim()
    if (n) stGameCount.set(n, (stGameCount.get(n) ?? 0) + 1)
  }

  const map = new Map<string, {
    name: string; total: number; wins: number; decided: number; evilDecided: number; goodDecided: number
    evilGames: number; goodGames: number; evilWins: number; goodWins: number
    mvpCount: number
    charMap: Map<string, CharPlayEntry>
    teammates: Map<string, number>
    teammatesGood: Map<string, number>
    teammatesEvil: Map<string, number>
  }>()

  for (const r of records) {
    const participants = recordPlayers(r, getTeam)
    if (!participants.length) continue
    const seenNames = new Set<string>()
    // Build name→team lookup for this record
    const nameTeam = new Map<string, 'evil' | 'good' | null>()
    for (const ps of participants) {
      if (ps.name) nameTeam.set(ps.name, identityForBasis(ps, basis).team)
    }
    const gameNames = [...new Set(participants.map((ps) => ps.name).filter(Boolean))]

    for (const ps of participants) {
      if (!ps.name || seenNames.has(ps.name)) continue
      seenNames.add(ps.name)

      const entry = map.get(ps.name) ?? {
        name: ps.name, total: 0, wins: 0, decided: 0, evilDecided: 0, goodDecided: 0,
        evilGames: 0, goodGames: 0, evilWins: 0, goodWins: 0,
        mvpCount: 0,
        charMap: new Map(),
        teammates: new Map(),
        teammatesGood: new Map(),
        teammatesEvil: new Map(),
      }
      entry.total++
      const selected = identityForBasis(ps, basis)
      const decided = !!ps.finalTeam && (r.winner === 'good' || r.winner === 'evil')
      const won = decided && ps.finalTeam === r.winner
      if (decided) entry.decided++
      if (won) entry.wins++
      if (selected.team === 'evil') {
        entry.evilGames++
        if (decided) entry.evilDecided++
        if (won) entry.evilWins++
      } else if (selected.team === 'good') {
        entry.goodGames++
        if (decided) entry.goodDecided++
        if (won) entry.goodWins++
      }
      // mvp tracking (only seat numbers, not 'storyteller')
      if (r.mvp != null && r.mvp !== 'storyteller' && r.mvp === ps.seat) entry.mvpCount++
      // char tracking
      const charId = selected.characterId
      if (charId) {
        const prev = entry.charMap.get(charId) ?? { charId, total: 0, wins: 0, decided: 0 }
        prev.total++
        if (won) prev.wins++
        if (decided) prev.decided++
        entry.charMap.set(charId, prev)
      }
      // teammate tracking — total + per-alignment
      for (const tn of gameNames) {
        if (!tn || tn === ps.name) continue
        entry.teammates.set(tn, (entry.teammates.get(tn) ?? 0) + 1)
        const tmTeam = nameTeam.get(tn)
        if (selected.team === 'good' && tmTeam === 'good') {
          entry.teammatesGood.set(tn, (entry.teammatesGood.get(tn) ?? 0) + 1)
        } else if (selected.team === 'evil' && tmTeam === 'evil') {
          entry.teammatesEvil.set(tn, (entry.teammatesEvil.get(tn) ?? 0) + 1)
        }
      }
      map.set(ps.name, entry)
    }

    // ST-as-MVP: credit mvpCount to the player whose name matches stName
    if (r.mvp === 'storyteller' && r.stName?.trim()) {
      const stEntry = map.get(r.stName.trim())
      if (stEntry) stEntry.mvpCount++
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .map((p) => {
      const mostPlayedChar = p.charMap.size
        ? [...p.charMap.entries()].sort((a, b) => b[1].total - a[1].total)[0][0]
        : null
      return {
        ...p,
        charSet: new Set(p.charMap.keys()),
        mostPlayedChar,
        stGameCount: stGameCount.get(p.name) ?? 0,
        winRate: p.decided ? Math.round((p.wins / p.decided) * 100) : 0,
        evilWinRate: p.evilDecided ? Math.round((p.evilWins / p.evilDecided) * 100) : null,
        goodWinRate: p.goodDecided ? Math.round((p.goodWins / p.goodDecided) * 100) : null,
        evilRate: (p.evilGames + p.goodGames) > 0
          ? Math.round((p.evilGames / (p.evilGames + p.goodGames)) * 100)
          : null,
      }
    })
}

// ── Character stats ───────────────────────────────────────────────

export type CharStat = {
  basis: IdentityBasis
  charId: string
  total: number
  wins: number
  evilGames: number
  goodGames: number
  decided: number
  winRate: number
  evilWinRate: number | null
  goodWinRate: number | null
  topPlayer: string | null
  players: Map<string, number>   // playerName → count
  scripts: Set<string>           // script keys this char appeared in
  bluffCount: number             // how many times used as a demon bluff (not assigned)
}

export function computeCharStats(records: GameRecord[], getTeam: TeamLookup, basis: IdentityBasis = 'final'): CharStat[] {
  const map = new Map<string, {
    charId: string; total: number; wins: number; decided: number; evilDecided: number; goodDecided: number
    evilGames: number; goodGames: number; evilWins: number; goodWins: number
    players: Map<string, number>
    scripts: Set<string>
    bluffCount: number
  }>()

  for (const r of records) {
    const participants = recordPlayers(r, getTeam)
    if (!participants.length) continue
    const scriptKey = r.scriptSlug || r.scriptTitle || 'unknown'

    // Track bluffs — chars used as bluffs but NOT assigned to a seat
    const assignedChars = new Set(participants.map(p => identityForBasis(p, basis).characterId))
    for (const bluffId of (r.setup?.demonBluffs ?? [])) {
      if (!assignedChars.has(bluffId)) {
        const be = map.get(bluffId) ?? {
          charId: bluffId, total: 0, wins: 0, decided: 0, evilDecided: 0, goodDecided: 0, evilGames: 0, goodGames: 0, evilWins: 0, goodWins: 0,
          players: new Map(), scripts: new Set(), bluffCount: 0,
        }
        be.bluffCount++
        map.set(bluffId, be)
      }
    }

    // Count each seat's participation, including duplicate roles in one game.
    for (const ps of participants) {
      const { characterId: charId, team } = identityForBasis(ps, basis)
      const playerName = ps.name
      if (!charId) continue
      const entry = map.get(charId) ?? {
        charId, total: 0, wins: 0, decided: 0, evilDecided: 0, goodDecided: 0, evilGames: 0, goodGames: 0, evilWins: 0, goodWins: 0,
        players: new Map(), scripts: new Set(), bluffCount: 0,
      }
      entry.total++
      entry.scripts.add(scriptKey)
      const decided = !!ps.finalTeam && (r.winner === 'good' || r.winner === 'evil')
      const won = decided && ps.finalTeam === r.winner
      if (decided) entry.decided++
      if (team === 'evil') { entry.evilGames++; if (decided) entry.evilDecided++; if (won) entry.evilWins++ }
      else if (team === 'good') { entry.goodGames++; if (decided) entry.goodDecided++; if (won) entry.goodWins++ }
      if (won) entry.wins++
      if (playerName) entry.players.set(playerName, (entry.players.get(playerName) ?? 0) + 1)
      map.set(charId, entry)
    }
  }

  return Array.from(map.values())
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((c) => {
      const topPlayer = c.players.size
        ? [...c.players.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : null
      const evilWinRate = c.evilDecided ? Math.round((c.evilWins / c.evilDecided) * 100) : null
      const goodWinRate = c.goodDecided ? Math.round((c.goodWins / c.goodDecided) * 100) : null
      return {
        ...c,
        basis,
        topPlayer,
        winRate: c.decided ? Math.round((c.wins / c.decided) * 100) : 0,
        evilWinRate,
        goodWinRate,
      }
    })
}

// ── Storyteller stats ─────────────────────────────────────────────

export type StorytellerStat = {
  name: string
  total: number
  evil: number
  good: number
  st: number
  scripts: Set<string>
  avgBalanced: number | null
  avgFunEvil: number | null
  avgFunGood: number | null
  avgReplay: number | null
  ratingCount: number
}

export function computeStorytellerStats(records: GameRecord[]): StorytellerStat[] {
  const map = new Map<string, {
    name: string; total: number; evil: number; good: number; st: number
    scripts: Set<string>
    balancedCount: number; funEvilCount: number; funGoodCount: number; replayCount: number
    ratingCount: number; totalBalanced: number; totalFunEvil: number; totalFunGood: number; totalReplay: number
  }>()

  for (const r of records) {
    const name = r.stName?.trim()
    if (!name) continue
    const key = name
    const entry = map.get(key) ?? {
      name, total: 0, evil: 0, good: 0, st: 0,
      scripts: new Set<string>(),
      balancedCount: 0, funEvilCount: 0, funGoodCount: 0, replayCount: 0,
      ratingCount: 0, totalBalanced: 0, totalFunEvil: 0, totalFunGood: 0, totalReplay: 0,
    }
    entry.total++
    if (r.winner === 'evil') entry.evil++
    else if (r.winner === 'good') entry.good++
    else if (r.winner === 'storyteller') entry.st++
    const scriptKey = r.scriptSlug || r.scriptTitle
    if (scriptKey) entry.scripts.add(scriptKey)
    if (r.balanced != null || r.funEvil != null || r.funGood != null || r.replay != null) {
      entry.ratingCount++
      if (r.balanced != null) { entry.totalBalanced += r.balanced; entry.balancedCount++ }
      if (r.funEvil != null) { entry.totalFunEvil += r.funEvil; entry.funEvilCount++ }
      if (r.funGood != null) { entry.totalFunGood += r.funGood; entry.funGoodCount++ }
      if (r.replay != null) { entry.totalReplay += r.replay; entry.replayCount++ }
    }
    map.set(key, entry)
  }

  return Array.from(map.values())
    .sort((a, b) => b.total - a.total)
    .map((s) => ({
      ...s,
      avgBalanced: s.balancedCount ? +(s.totalBalanced / s.balancedCount).toFixed(1) : null,
      avgFunEvil: s.funEvilCount ? +(s.totalFunEvil / s.funEvilCount).toFixed(1) : null,
      avgFunGood: s.funGoodCount ? +(s.totalFunGood / s.funGoodCount).toFixed(1) : null,
      avgReplay: s.replayCount ? +(s.totalReplay / s.replayCount).toFixed(1) : null,
    }))
}

// ── KPI summary ───────────────────────────────────────────────────

export type KpiSummary = {
  total: number
  evilWins: number
  goodWins: number
  stWins: number
  evilPct: number
  goodPct: number
  stPct: number
  noResultPct: number
  avgDays: number | null
  avgDurationMin: number | null
  avgPlayers: number | null
  // Rating aggregates across all games
  avgBalanced: number | null
  avgFunEvil: number | null
  avgFunGood: number | null
  avgReplay: number | null
}

export function computeKpiSummary(records: GameRecord[]): KpiSummary {
  const total = records.length
  const empty: KpiSummary = {
    total: 0, evilWins: 0, goodWins: 0, stWins: 0,
    evilPct: 0, goodPct: 0, stPct: 0, noResultPct: 0,
    avgDays: null, avgDurationMin: null, avgPlayers: null,
    avgBalanced: null, avgFunEvil: null, avgFunGood: null, avgReplay: null,
  }
  if (total === 0) return empty

  const evilWins = records.filter((r) => r.winner === 'evil').length
  const goodWins = records.filter((r) => r.winner === 'good').length
  const stWins = records.filter((r) => r.winner === 'storyteller').length

  const totalDays = records.reduce((s, r) => s + (r.days?.length ?? 0), 0)
  const durRecs = records.filter((r) => r.durationMs)
  const totalDurationMs = durRecs.reduce((s, r) => s + (r.durationMs ?? 0), 0)
  const playerRecs = records.filter((r) => r.playerSummaries?.length)
  const totalPlayers = playerRecs.reduce((s, r) => s + (r.playerSummaries?.length ?? 0), 0)

  // Rating aggregates
  let rBalCount = 0, rFunECount = 0, rFunGCount = 0, rRepCount = 0
  let rBal = 0, rFunE = 0, rFunG = 0, rRep = 0
  for (const r of records) {
    if (r.balanced != null || r.funEvil != null || r.funGood != null || r.replay != null) {
      if (r.balanced != null) { rBal += r.balanced; rBalCount++ }
      if (r.funEvil != null) { rFunE += r.funEvil; rFunECount++ }
      if (r.funGood != null) { rFunG += r.funGood; rFunGCount++ }
      if (r.replay != null) { rRep += r.replay; rRepCount++ }
    }
  }

  const pct = (n: number) => Math.round((n / total) * 100)

  return {
    total,
    evilWins, goodWins, stWins,
    evilPct: pct(evilWins),
    goodPct: pct(goodWins),
    stPct: pct(stWins),
    noResultPct: pct(total - evilWins - goodWins - stWins),
    avgDays: total ? +(totalDays / total).toFixed(1) : null,
    avgDurationMin: durRecs.length ? Math.round(totalDurationMs / durRecs.length / 60000) : null,
    avgPlayers: playerRecs.length ? +(totalPlayers / playerRecs.length).toFixed(1) : null,
    avgBalanced: rBalCount ? +(rBal / rBalCount).toFixed(1) : null,
    avgFunEvil: rFunECount ? +(rFunE / rFunECount).toFixed(1) : null,
    avgFunGood: rFunGCount ? +(rFunG / rFunGCount).toFixed(1) : null,
    avgReplay: rRepCount ? +(rRep / rRepCount).toFixed(1) : null,
  }
}
