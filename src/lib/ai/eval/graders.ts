/**
 * Program graders for the AI evaluation cases: phrase checks, characters
 * named in the answer, and validation of generated line-ups and scripts
 * against the catalog and the official player-count table.
 */
import { allCharacterFiles, getDisplayName, initialScripts } from '../../../catalog'
import { CHARACTER_DISTRIBUTION, SETUP_OUTSIDER_SHIFTS } from '../../../core/engine/setup'
import type { Team } from '../../../types'
import type { Check, EvalCase } from './cases'

export type CheckResult = { label: string; pass: boolean; detail?: string }
export type Grade = { pass: boolean; checks: CheckResult[] }
export type AnswerUnderTest = { text: string; steps?: Array<{ tool: string; ok: boolean; arguments?: unknown }> }

const characters = allCharacterFiles.filter((c) => c?.id && c?.team)
const teamOf = new Map(characters.map((c) => [c.id, c.team as Team]))
const editionOf = new Map(characters.map((c) => [c.id, c.edition]))

/** Name / id → character id, longest names first so 小恶魔 wins over shorter matches. */
const aliases: Array<[string, string]> = characters
  .flatMap((c) => [c.id, getDisplayName(c.id, 'en'), getDisplayName(c.id, 'zh')].map((alias) => [alias.trim(), c.id] as [string, string]))
  .filter(([alias]) => alias.length >= 2)
  .sort((a, b) => b[0].length - a[0].length)

const isLatin = (s: string) => /^[\x20-\x7e]+$/.test(s)
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Character ids named anywhere in the text. */
export function charactersIn(text: string): Set<string> {
  let rest = text
  const found = new Set<string>()
  for (const [alias, id] of aliases) {
    const pattern = isLatin(alias) ? new RegExp(`(^|[^A-Za-z0-9_])${escape(alias)}(?=$|[^A-Za-z0-9_])`, 'gi') : new RegExp(escape(alias), 'g')
    if (pattern.test(rest)) {
      found.add(id)
      rest = rest.replace(pattern, (_match, lead: string | undefined) => (typeof lead === 'string' ? lead : '') + ' ')
    }
  }
  return found
}

/** Ids from a final "label: a, b, c" line (ids or display names). */
export function listLine(text: string, labels: string[]): string[] | null {
  const pattern = new RegExp(`(?:${labels.map(escape).join('|')})\\s*[:：]\\s*(.+)$`, 'gim')
  const lines = [...text.matchAll(pattern)]
  if (!lines.length) return null
  // "ids（中文名）" and trailing sentences are not part of the list.
  const raw = lines[lines.length - 1][1].replace(/[（(][^）)]*[）)]/g, '').replace(/[；;。].*$/, '').replace(/[`*]/g, '')
  return raw.split(/[,，、;；]+/).map((token) => token.trim()).filter(Boolean).flatMap((token) => {
    const id = token.toLowerCase().replace(/\s+/g, '_')
    if (teamOf.has(id)) return [id]
    const named = [...charactersIn(token)]
    return named.length ? named : [`?${token}`]
  })
}

function teamCounts(ids: string[]): Record<Team, number> {
  const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveler: 0, fabled: 0, loric: 0 } as Record<Team, number>
  for (const id of ids) {
    const team = teamOf.get(id)
    if (team) counts[team]++
  }
  return counts
}


function checkSetup(check: Extract<Check, { kind: 'setup' }>, answer: AnswerUnderTest): CheckResult {
  const ids = listLine(answer.text, ['在场角色', 'Characters in play'])
  if (!ids) return { label: check.label, pass: false, detail: 'no "在场角色:" line' }
  const unknown = ids.filter((id) => id.startsWith('?'))
  const script = new Set(initialScripts.find((s) => s.slug === check.script)?.characters ?? [])
  const offScript = ids.filter((id) => !id.startsWith('?') && !script.has(id))
  const counts = teamCounts(ids)
  const base = CHARACTER_DISTRIBUTION[check.players]
  const shifts = ids.flatMap((id) => (SETUP_OUTSIDER_SHIFTS[id] ? [SETUP_OUTSIDER_SHIFTS[id]] : []))
  // Every combination of the modifiers' allowed shifts.
  const totals = shifts.reduce<number[]>((acc, options) => acc.flatMap((a) => options.map((o) => a + o)), [0])
  // The Drunk thinks they are a Townsfolk: answers may also list that Townsfolk.
  const townsfolkSlack = ids.includes('drunk') ? [0, 1] : [0]
  const legal = totals.some((shift) => counts.outsider === base.outsider + shift
    && townsfolkSlack.some((extra) => counts.townsfolk === base.townsfolk - shift + extra))
  const problems = [
    ...(unknown.length ? [`unknown ${unknown.join(', ')}`] : []),
    ...(offScript.length ? [`not on the script: ${offScript.join(', ')}`] : []),
    ...(counts.minion !== base.minion ? [`${counts.minion} minions (want ${base.minion})`] : []),
    ...(counts.demon !== base.demon ? [`${counts.demon} demons (want ${base.demon})`] : []),
    ...(!legal ? [`townsfolk/outsiders ${counts.townsfolk}/${counts.outsider} (want ${base.townsfolk}/${base.outsider}${shifts.length ? ' with setup modifiers' : ''})`] : []),
    ...(ids.length !== new Set(ids).size ? ['duplicates'] : []),
  ]
  return { label: check.label, pass: problems.length === 0, detail: problems.join('; ') || `${ids.length} characters` }
}

function scriptIdsOf(answer: AnswerUnderTest): string[] | null {
  const drafted = [...(answer.steps ?? [])].reverse().find((s) => s.tool === 'create_script_draft' && s.ok)
  const args = drafted?.arguments as { characters?: unknown[] } | undefined
  if (args?.characters?.length) return args.characters.filter((c): c is string => typeof c === 'string')
  return listLine(answer.text, ['剧本角色', 'Script characters'])
}

function checkScript(check: Extract<Check, { kind: 'script' }>, answer: AnswerUnderTest): CheckResult {
  const ids = scriptIdsOf(answer)
  if (!ids) return { label: check.label, pass: false, detail: 'no "剧本角色:" line or script draft' }
  const counts = teamCounts(ids)
  const problems = [
    ...ids.filter((id) => id.startsWith('?')).map((id) => `unknown ${id.slice(1)}`),
    ...(check.include ?? []).filter((id) => !ids.includes(id)).map((id) => `missing ${id}`),
    ...(check.noTeams ?? []).filter((team) => counts[team] > 0).map((team) => `has ${team}`),
    ...(check.editions ? ids.filter((id) => !id.startsWith('?') && !check.editions!.includes(editionOf.get(id) ?? '')).map((id) => `${id} is ${editionOf.get(id)}`) : []),
    ...Object.entries(check.counts ?? {}).filter(([team, [min, max]]) => counts[team as Team] < min || counts[team as Team] > max)
      .map(([team, [min, max]]) => `${counts[team as Team]} ${team} (want ${min}–${max})`),
    ...(check.dealable ?? []).filter((n) => {
      const d = CHARACTER_DISTRIBUTION[n]
      return counts.townsfolk < d.townsfolk || counts.outsider < d.outsider || counts.minion < d.minion || counts.demon < d.demon
    }).map((n) => `cannot deal ${n} players`),
    ...(ids.length !== new Set(ids).size ? ['duplicates'] : []),
  ]
  return { label: check.label, pass: problems.length === 0, detail: problems.join('; ') || `${ids.length} characters: ${Object.entries(counts).filter(([, n]) => n).map(([t, n]) => `${t} ${n}`).join(', ')}` }
}

export function gradeCheck(check: Check, answer: AnswerUnderTest): CheckResult {
  const text = answer.text
  switch (check.kind) {
    case 'includes': {
      const hit = check.any.find((p) => new RegExp(p, 'i').test(text))
      return { label: check.label, pass: !!hit }
    }
    case 'excludes': {
      const hit = check.any.find((p) => new RegExp(p, 'i').test(text))
      return { label: check.label, pass: !hit, detail: hit ? `found /${hit}/` : undefined }
    }
    case 'characters': {
      const named = charactersIn(text)
      const missing = (check.include ?? []).filter((id) => !named.has(id))
      const extra = (check.exclude ?? []).filter((id) => named.has(id))
      return { label: check.label, pass: !missing.length && !extra.length, detail: [missing.length ? `missing ${missing.join(', ')}` : '', extra.length ? `should not name ${extra.join(', ')}` : ''].filter(Boolean).join('; ') || undefined }
    }
    case 'setup': return checkSetup(check, answer)
    case 'script': return checkScript(check, answer)
  }
}

export function gradeCase(c: EvalCase, answer: AnswerUnderTest): Grade {
  const checks = c.checks.map((check) => gradeCheck(check, answer))
  return { pass: checks.every((r) => r.pass), checks }
}
