/**
 * Reading character lists out of AI answers, and checking them: shared by
 * the answer check in the AI panel (answerCheck.ts) and the evaluation
 * graders.
 */
import { allCharacterFiles, getAbilityText, getDisplayName } from '../../catalog'
import { CHARACTER_DISTRIBUTION, SETUP_OUTSIDER_SHIFTS } from '../../core/engine/setup'
import type { Team } from '../../types'

const characters = allCharacterFiles.filter((c) => c?.id && c?.team)
const teamOf = new Map(characters.map((c) => [c.id, c.team as Team]))
export const editionOf = new Map(characters.map((c) => [c.id, c.edition]))

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

export function teamCounts(ids: string[]): Record<Team, number> {
  const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveler: 0, fabled: 0, loric: 0 } as Record<Team, number>
  for (const id of ids) {
    const team = teamOf.get(id)
    if (team) counts[team]++
  }
  return counts
}


const TEAM_ZH: Record<string, string> = { townsfolk: '镇民', outsider: '外来者', minion: '爪牙', demon: '恶魔', traveler: '旅行者' }

/** Why `ids` is not a legal line-up for `players` from `script` ([] when it is). */
export function setupProblems(ids: string[], script: string[], players: number, language: 'en' | 'zh' = 'en'): string[] {
  const zh = language === 'zh'
  const base = CHARACTER_DISTRIBUTION[players]
  if (!base) return [`no official counts for ${players} players`]
  const unknown = ids.filter((id) => id.startsWith('?'))
  const scriptSet = new Set(script)
  const offScript = ids.filter((id) => !id.startsWith('?') && !scriptSet.has(id))
  const counts = teamCounts(ids)
  const shifts = ids.flatMap((id) => (SETUP_OUTSIDER_SHIFTS[id] ? [SETUP_OUTSIDER_SHIFTS[id]] : []))
  // Every combination of the modifiers' allowed shifts.
  const totals = shifts.reduce<number[]>((acc, options) => acc.flatMap((a) => options.map((o) => a + o)), [0])
  // The Drunk thinks they are a Townsfolk: answers may also list that Townsfolk.
  const townsfolkSlack = ids.includes('drunk') ? [0, 1] : [0]
  const legal = totals.some((shift) => counts.outsider === base.outsider + shift
    && townsfolkSlack.some((extra) => counts.townsfolk === base.townsfolk - shift + extra))
  const wanted = totals.map((shift) => `${base.townsfolk - shift}/${base.outsider + shift}`).join(' or ')
  return [
    ...(unknown.length ? [zh ? `未知角色 ${unknown.map((id) => id.slice(1)).join('、')}` : `unknown ${unknown.map((id) => id.slice(1)).join(', ')}`] : []),
    ...(offScript.length ? [zh ? `不在剧本上：${offScript.join('、')}` : `not on the script: ${offScript.join(', ')}`] : []),
    ...(counts.minion !== base.minion ? [zh ? `爪牙 ${counts.minion} 个（应为 ${base.minion}）` : `${counts.minion} minions (want ${base.minion})`] : []),
    ...(counts.demon !== base.demon ? [zh ? `恶魔 ${counts.demon} 个（应为 ${base.demon}）` : `${counts.demon} demons (want ${base.demon})`] : []),
    ...(!legal ? [zh ? `镇民/外来者 ${counts.townsfolk}/${counts.outsider}（应为 ${wanted}）` : `townsfolk/outsiders ${counts.townsfolk}/${counts.outsider} (want ${wanted})`] : []),
    ...(ids.length !== new Set(ids).size ? [zh ? '有重复角色' : 'duplicates'] : []),
  ]
}

export type PoolRequirements = {
  include?: string[]
  noTeams?: Team[]
  editions?: string[]
  /** Inclusive ranges per team. */
  counts?: Partial<Record<Team, [number, number]>>
  /** Player counts the pool must be able to deal. */
  dealable?: number[]
}

/** Why `ids` does not meet the script requirements ([] when it does). */
export function poolProblems(ids: string[], req: PoolRequirements, language: 'en' | 'zh' = 'en'): string[] {
  const zh = language === 'zh'
  const counts = teamCounts(ids)
  return [
    ...ids.filter((id) => id.startsWith('?')).map((id) => (zh ? `未知角色 ${id.slice(1)}` : `unknown ${id.slice(1)}`)),
    ...(req.include ?? []).filter((id) => !ids.includes(id)).map((id) => (zh ? `缺少 ${getDisplayName(id, 'zh')}` : `missing ${id}`)),
    ...(req.noTeams ?? []).filter((team) => counts[team] > 0).map((team) => (zh ? `包含${TEAM_ZH[team] ?? team}` : `has ${team}`)),
    ...(req.editions ? ids.filter((id) => !id.startsWith('?') && !req.editions!.includes(editionOf.get(id) ?? '')).map((id) => (zh ? `${getDisplayName(id, 'zh')} 不属于要求的角色包` : `${id} is ${editionOf.get(id)}`)) : []),
    ...Object.entries(req.counts ?? {}).filter(([team, [min, max]]) => counts[team as Team] < min || counts[team as Team] > max)
      .map(([team, [min, max]]) => (zh ? `${TEAM_ZH[team] ?? team} ${counts[team as Team]} 个（应为 ${min}–${max}）` : `${counts[team as Team]} ${team} (want ${min}–${max})`)),
    ...(req.dealable ?? []).filter((n) => {
      const d = CHARACTER_DISTRIBUTION[n]
      return counts.townsfolk < d.townsfolk || counts.outsider < d.outsider || counts.minion < d.minion || counts.demon < d.demon
    }).map((n) => (zh ? `无法支持 ${n} 人局` : `cannot deal ${n} players`)),
    ...(ids.length !== new Set(ids).size ? [zh ? '有重复角色' : 'duplicates'] : []),
  ]
}

// ── Ability descriptions ─────────────────────────────────────────────────────

// A description of what a character does, as opposed to advice about it.
const DESCRIBES_ABILITY = /你|每个?夜晚|每晚|首个夜晚|\byou\b|\beach night\b|\bonce per game\b/i

/**
 * "Name（名字）：description" lines whose description reads like an ability:
 * the head names exactly one character, the rest speaks to the player.
 */
export function abilityClaims(text: string): Array<{ id: string; claim: string }> {
  const lines = text.split('\n').map((line) => line.replace(/[*_`]/g, '').replace(/^\s*(?:[-•+]|\d+[.)、])?\s*/, '').trim()).filter(Boolean)
  return lines.flatMap((line, i) => {
    const m = line.match(/^([^：:]{2,40})[：:]\s*(.*)$/)
    if (!m) return []
    // "Name：" with the description on the next (nested) line.
    const claim = m[2].trim() || (lines[i + 1] && !/[：:]\s*$/.test(lines[i + 1]) ? lines[i + 1] : '')
    if (claim.length < 6 || !DESCRIBES_ABILITY.test(claim)) return []
    const named = [...charactersIn(m[1])]
    return named.length === 1 ? [{ id: named[0], claim }] : []
  })
}

const bigrams = (s: string) => {
  const t = s.toLowerCase().replace(/<[^>]+>|[\s\p{P}\p{S}]/gu, '')
  return new Set(Array.from({ length: Math.max(0, t.length - 1) }, (_, i) => t.slice(i, i + 2)))
}

// Rare character pairs carry the meaning; "每个夜晚" / "each night" do not.
let idf: Map<string, number> | null = null
function weightOf(pair: string): number {
  if (!idf) {
    const texts = characters.flatMap((c) => [getAbilityText(c.id, 'en'), getAbilityText(c.id, 'zh')]).filter((t): t is string => !!t)
    const df = new Map<string, number>()
    for (const text of texts) for (const p of bigrams(text)) df.set(p, (df.get(p) ?? 0) + 1)
    idf = new Map([...df].map(([p, n]) => [p, Math.log(texts.length / n)]))
  }
  return idf.get(pair) ?? Math.log(characters.length * 2)
}

/** Similarity of two texts' character pairs, weighted by rarity across all abilities, 0–1. */
export function textSimilarity(a: string, b: string): number {
  const x = bigrams(a), y = bigrams(b)
  if (!x.size || !y.size) return 0
  const total = (set: Set<string>) => [...set].reduce((sum, p) => sum + weightOf(p), 0)
  let shared = 0
  for (const pair of x) if (y.has(pair)) shared += weightOf(pair)
  return (2 * shared) / (total(x) + total(y))
}

/**
 * Characters whose ability the answer describes in words that share little
 * with the real text: made-up abilities rather than paraphrases.
 */
export function misdescribedAbilities(text: string, threshold = 0.25): string[] {
  const wrong = abilityClaims(text).filter(({ id, claim }) => {
    const lang = /[\u3400-\u9fff]/.test(claim) ? 'zh' : 'en'
    const real = getAbilityText(id, lang) ?? ''
    return real && textSimilarity(claim, real) < threshold
  })
  return [...new Set(wrong.map(({ id }) => id))]
}

