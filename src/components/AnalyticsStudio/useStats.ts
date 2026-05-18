import { useMemo } from 'react'
import type { GameRecord } from '../StorytellerSub/types'
import type { Language } from '../../types'
// catalog helpers used in consuming components, not here

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

export function useScriptStats(records: GameRecord[]): ScriptStat[] {
  return useMemo(() => {
    const map = new Map<string, {
      key: string; title: string; total: number; evil: number; good: number; st: number
      totalDays: number; totalVotes: number; totalVotePassed: number
      totalNominations: number; totalSkills: number
      totalDurationMs: number; durationCount: number
      dayHistogram: number[]
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
        if (r.balanced != null) entry.totalBalanced += r.balanced
        if (r.funEvil != null) entry.totalFunEvil += r.funEvil
        if (r.funGood != null) entry.totalFunGood += r.funGood
        if (r.replay != null) entry.totalReplay += r.replay
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
        avgBalanced: s.ratingCount ? +(s.totalBalanced / s.ratingCount).toFixed(1) : null,
        avgFunEvil: s.ratingCount ? +(s.totalFunEvil / s.ratingCount).toFixed(1) : null,
        avgFunGood: s.ratingCount ? +(s.totalFunGood / s.ratingCount).toFixed(1) : null,
        avgReplay: s.ratingCount ? +(s.totalReplay / s.ratingCount).toFixed(1) : null,
      }))
  }, [records])
}

// ── Player stats ─────────────────────────────────────────────────

export type CharPlayEntry = { charId: string; total: number; wins: number }

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

export function usePlayerStats(records: GameRecord[]): PlayerStat[] {
  return useMemo(() => {
    // Build stName → game count map first for cross-referencing
    const stGameCount = new Map<string, number>()
    for (const r of records) {
      const n = r.stName?.trim()
      if (n) stGameCount.set(n, (stGameCount.get(n) ?? 0) + 1)
    }

    const map = new Map<string, {
      name: string; total: number; wins: number
      evilGames: number; goodGames: number; evilWins: number; goodWins: number
      mvpCount: number
      charMap: Map<string, CharPlayEntry>
      teammates: Map<string, number>
      teammatesGood: Map<string, number>
      teammatesEvil: Map<string, number>
    }>()

    for (const r of records) {
      if (!r.playerSummaries) continue
      const seenNames = new Set<string>()
      // Build name→team lookup for this record
      const nameTeam = new Map<string, 'evil' | 'good' | null>()
      for (const ps of r.playerSummaries) {
        if (ps.name) nameTeam.set(ps.name, ps.team)
      }
      const gameNames = r.playerSummaries.map((ps) => ps.name).filter(Boolean) as string[]

      for (const ps of r.playerSummaries) {
        if (!ps.name || seenNames.has(ps.name)) continue
        seenNames.add(ps.name)

        const entry = map.get(ps.name) ?? {
          name: ps.name, total: 0, wins: 0,
          evilGames: 0, goodGames: 0, evilWins: 0, goodWins: 0,
          mvpCount: 0,
          charMap: new Map(),
          teammates: new Map(),
          teammatesGood: new Map(),
          teammatesEvil: new Map(),
        }
        entry.total++
        if (ps.team === 'evil') {
          entry.evilGames++
          if (r.winner === 'evil') { entry.wins++; entry.evilWins++ }
        } else if (ps.team === 'good') {
          entry.goodGames++
          if (r.winner === 'good') { entry.wins++; entry.goodWins++ }
        }
        // mvp tracking (only seat numbers, not 'storyteller')
        if (r.mvp != null && r.mvp !== 'storyteller' && r.mvp === ps.seat) entry.mvpCount++
        // char tracking
        const charId = r.setup?.assignments?.[ps.seat]
        if (charId) {
          const prev = entry.charMap.get(charId) ?? { charId, total: 0, wins: 0 }
          prev.total++
          if ((ps.team === 'evil' && r.winner === 'evil') || (ps.team === 'good' && r.winner === 'good')) prev.wins++
          entry.charMap.set(charId, prev)
        }
        // teammate tracking — total + per-alignment
        for (const tn of gameNames) {
          if (!tn || tn === ps.name) continue
          entry.teammates.set(tn, (entry.teammates.get(tn) ?? 0) + 1)
          const tmTeam = nameTeam.get(tn)
          if (ps.team === 'good' && tmTeam === 'good') {
            entry.teammatesGood.set(tn, (entry.teammatesGood.get(tn) ?? 0) + 1)
          } else if (ps.team === 'evil' && tmTeam === 'evil') {
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
          winRate: p.total ? Math.round((p.wins / p.total) * 100) : 0,
          evilWinRate: p.evilGames ? Math.round((p.evilWins / p.evilGames) * 100) : null,
          goodWinRate: p.goodGames ? Math.round((p.goodWins / p.goodGames) * 100) : null,
          evilRate: (p.evilGames + p.goodGames) > 0
            ? Math.round((p.evilGames / (p.evilGames + p.goodGames)) * 100)
            : null,
        }
      })
  }, [records])
}

// ── Character stats ───────────────────────────────────────────────

export type CharStat = {
  charId: string
  total: number
  wins: number
  evilGames: number
  goodGames: number
  winRate: number
  evilWinRate: number | null
  goodWinRate: number | null
  topPlayer: string | null
  players: Map<string, number>   // playerName → count
  scripts: Set<string>           // script keys this char appeared in
  bluffCount: number             // how many times used as a demon bluff (not assigned)
}

export function useCharStats(records: GameRecord[], language: Language): CharStat[] {
  return useMemo(() => {
    const map = new Map<string, {
      charId: string; total: number; wins: number
      evilGames: number; goodGames: number; evilWins: number; goodWins: number
      players: Map<string, number>
      scripts: Set<string>
      bluffCount: number
    }>()

    for (const r of records) {
      if (!r.setup?.assignments || !r.playerSummaries) continue
      const scriptKey = r.scriptSlug || r.scriptTitle || 'unknown'

      // Track bluffs — chars used as bluffs but NOT assigned to a seat
      const assignedChars = new Set(Object.values(r.setup.assignments))
      for (const bluffId of (r.setup.demonBluffs ?? [])) {
        if (!assignedChars.has(bluffId)) {
          const be = map.get(bluffId) ?? {
            charId: bluffId, total: 0, wins: 0, evilGames: 0, goodGames: 0, evilWins: 0, goodWins: 0,
            players: new Map(), scripts: new Set(), bluffCount: 0,
          }
          be.bluffCount++
          map.set(bluffId, be)
        }
      }

      // Track per-game unique char→{team, player}
      const perGame = new Map<string, { team: 'evil' | 'good' | null; playerName: string }>()
      for (const ps of r.playerSummaries) {
        const charId = r.setup.assignments[ps.seat]
        if (!charId) continue
        const prev = perGame.get(charId)
        if (prev === undefined) perGame.set(charId, { team: ps.team, playerName: ps.name })
        else if (ps.team === 'evil' && prev.team !== 'evil') perGame.set(charId, { team: 'evil', playerName: ps.name })
      }

      for (const [charId, { team, playerName }] of perGame) {
        const entry = map.get(charId) ?? {
          charId, total: 0, wins: 0, evilGames: 0, goodGames: 0, evilWins: 0, goodWins: 0,
          players: new Map(), scripts: new Set(), bluffCount: 0,
        }
        entry.total++
        entry.scripts.add(scriptKey)
        const won = (team === 'evil' && r.winner === 'evil') || (team === 'good' && r.winner === 'good')
        if (team === 'evil') { entry.evilGames++; if (won) entry.evilWins++ }
        else if (team === 'good') { entry.goodGames++; if (won) entry.goodWins++ }
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
        const evilWinRate = c.evilGames ? Math.round((c.evilWins / c.evilGames) * 100) : null
        const goodWinRate = c.goodGames ? Math.round((c.goodWins / c.goodGames) * 100) : null
        return {
          ...c,
          topPlayer,
          winRate: c.total ? Math.round((c.wins / c.total) * 100) : 0,
          evilWinRate,
          goodWinRate,
        }
      })
  }, [records, language])
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

export function useStorytellerStats(records: GameRecord[]): StorytellerStat[] {
  return useMemo(() => {
    const map = new Map<string, {
      name: string; total: number; evil: number; good: number; st: number
      scripts: Set<string>
      ratingCount: number; totalBalanced: number; totalFunEvil: number; totalFunGood: number; totalReplay: number
    }>()

    for (const r of records) {
      const name = r.stName?.trim()
      if (!name) continue
      const key = name
      const entry = map.get(key) ?? {
        name, total: 0, evil: 0, good: 0, st: 0,
        scripts: new Set<string>(),
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
        if (r.balanced != null) entry.totalBalanced += r.balanced
        if (r.funEvil != null) entry.totalFunEvil += r.funEvil
        if (r.funGood != null) entry.totalFunGood += r.funGood
        if (r.replay != null) entry.totalReplay += r.replay
      }
      map.set(key, entry)
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((s) => ({
        ...s,
        avgBalanced: s.ratingCount ? +(s.totalBalanced / s.ratingCount).toFixed(1) : null,
        avgFunEvil: s.ratingCount ? +(s.totalFunEvil / s.ratingCount).toFixed(1) : null,
        avgFunGood: s.ratingCount ? +(s.totalFunGood / s.ratingCount).toFixed(1) : null,
        avgReplay: s.ratingCount ? +(s.totalReplay / s.ratingCount).toFixed(1) : null,
      }))
  }, [records])
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

export function useKpiSummary(records: GameRecord[]): KpiSummary {
  return useMemo(() => {
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
    let rCount = 0, rBal = 0, rFunE = 0, rFunG = 0, rRep = 0
    for (const r of records) {
      if (r.balanced != null || r.funEvil != null || r.funGood != null || r.replay != null) {
        rCount++
        if (r.balanced != null) rBal += r.balanced
        if (r.funEvil != null) rFunE += r.funEvil
        if (r.funGood != null) rFunG += r.funGood
        if (r.replay != null) rRep += r.replay
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
      avgBalanced: rCount ? +(rBal / rCount).toFixed(1) : null,
      avgFunEvil: rCount ? +(rFunE / rCount).toFixed(1) : null,
      avgFunGood: rCount ? +(rFunG / rCount).toFixed(1) : null,
      avgReplay: rCount ? +(rRep / rCount).toFixed(1) : null,
    }
  }, [records])
}
