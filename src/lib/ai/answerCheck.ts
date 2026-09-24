/**
 * Check a model's answer before showing it (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md
 * §5 "验证并展示"): when the question asked for a game line-up or a script,
 * the characters the answer gives are checked against the rules. If they are
 * missing or not legal, the program's legal line-up / script is appended with
 * the reason — models explain well but often miscount. Ability descriptions
 * whose wording is far from the real text get the real text appended: models
 * also make up abilities ("镇长：投票权增加 2 票").
 */
import { getAbilityText, getDisplayName } from '../../catalog'
import { charactersIn, listLine, misdescribedAbilities, poolProblems, setupProblems } from './answerParse'
import { aliveCount, headlineScript, mostNamedScript, planRequest } from './ruleFacts'
import type { AiContext } from './types'

/** `notes`: what was appended — lineup, script, votes, ability (for answer traces). */
export type CheckedAnswer = { text: string; corrected: boolean; notes?: string[] }

const names = (ids: string[], zh: boolean) => `${ids.join(', ')}（${ids.map((id) => getDisplayName(id, zh ? 'zh' : 'en')).join(zh ? '、' : ', ')}）`

type CheckContext = Pick<AiContext, 'language' | 'characterIds' | 'seats'>

export function checkAnswer(ctx: CheckContext, query: string, text: string, previousQueries: string[] = [], lastAnswer?: string): CheckedAnswer {
  const zh = ctx.language === 'zh'
  const checked = checkLineUp(ctx, query, text, previousQueries, lastAnswer)
  const kinds = checked.notes ?? []
  const notes: string[] = []
  const votes = voteProblem(query, text, zh)
  if (votes) { notes.push(`**${zh ? '程序校验' : 'Program check'}**：${votes}`); kinds.push('votes') }
  // Only the model's own words: not the program's line-up just appended.
  const ids = misdescribedAbilities(text)
  if (ids.length) {
    const lines = ids.map((id) => `- ${getDisplayName(id, ctx.language)}：${getAbilityText(id, ctx.language) ?? ''}`).join('\n')
    notes.push(`**${zh ? '能力原文' : 'Ability text'}**：${zh ? '以下角色能力的描述与原文措辞差异较大，请以原文为准：' : 'these descriptions differ a lot from the official wording; the official text is:'}\n${lines}`)
    kinds.push('ability')
  }
  if (!notes.length) return checked
  return { corrected: true, text: `${checked.text}${notes.map((note) => `\n\n---\n${note}`).join('')}`, notes: kinds }
}

const ZH_NUMBERS: Record<string, number> = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }

/** "N 名存活玩家时处决需要几票": the answer's vote numbers must include the right one. */
function voteProblem(query: string, text: string, zh: boolean): string | null {
  const alive = aliveCount(query)
  if (!alive || !/票|vote/i.test(query)) return null
  const need = Math.ceil(alive / 2)
  const numbers = [...text.matchAll(/(\d+|[一两二三四五六七八九十])\s*(?:张)?\s*(?:票|votes?)/gi)].map((m) => ZH_NUMBERS[m[1]] ?? Number(m[1]))
  if (!numbers.length || numbers.includes(need)) return null
  return zh
    ? `${alive} 名存活玩家时，处决至少需要 ${need} 票（存活人数的一半，向上取整），且票数要多于当天其他被提名者。`
    : `With ${alive} players alive, an execution needs at least ${need} votes (half the alive players, rounded up) and more than any other nominee today.`
}

function checkLineUp(ctx: CheckContext, query: string, text: string, previousQueries: string[], lastAnswer?: string): CheckedAnswer {
  const request = planRequest(query, { ...ctx, previousQueries, lastAnswer })
  if (!request) return { text, corrected: false }
  const zh = ctx.language === 'zh'
  const label = zh ? '程序校验' : 'Program check'

  if (request.kind === 'setup') {
    const { plan, script, players } = request
    if (!plan || plan.inPlay.length !== players) return { text, corrected: false }
    // Read the line-up against the question's script, and against the script
    // the answer itself is about (a follow-up on a recommended script).
    // An explicit list line; else the program's line-up if the answer names all
    // of it (it may mention other characters in passing); else exactly the
    // script characters the answer names.
    const listed = listLine(text, ['在场角色', 'Characters in play'])
    const lineUpFor = (candidate: string[]) => {
      const named = [...charactersIn(text)].filter((id) => candidate.includes(id))
      const adopted = candidate === script && plan.inPlay.every((id) => named.includes(id)) ? plan.inPlay : null
      return listed ?? adopted ?? (named.length === players ? named : null)
    }
    const aboutScript = mostNamedScript(text)
    // A line-up must also belong to the script the answer's heading names:
    // "暗流涌动 7 人配置" listing another script's characters is wrong even
    // when those characters make a legal line-up for that other script.
    const headline = headlineScript(text)
    const offHeadline = (lineUp: string[]) => headline ? lineUp.filter((id) => !headline.includes(id)) : []
    for (const candidate of [script, ...(aboutScript && aboutScript !== script ? [aboutScript] : [])]) {
      const lineUp = lineUpFor(candidate)
      if (lineUp && !setupProblems(lineUp, candidate, players).length && !offHeadline(lineUp).length) return { text, corrected: false }
    }
    const ids = lineUpFor(script) ?? (headline && headline !== script ? lineUpFor(headline) : null)
    const outside = ids ? offHeadline(ids) : []
    const problems = [
      ...(ids ? setupProblems(ids, script, players, ctx.language) : []),
      ...(outside.length ? [zh ? `${outside.map((id) => getDisplayName(id, 'zh')).join('、')} 不在回答所说的剧本里` : `${outside.map((id) => getDisplayName(id, 'en')).join(', ')} not on the script the answer names`] : []),
    ]
    const why = ids
      ? (zh ? `回答里的配置不符合规则（${problems.join('；')}）` : `the line-up in the answer breaks the rules (${problems.join('; ')})`)
      : (zh ? '回答里没有完整的在场角色名单' : 'the answer has no complete list of characters in play')
    const bluffs = plan.bluffs.length ? `\n${zh ? '恶魔伪装' : 'Demon bluffs'}: ${names(plan.bluffs, zh)}` : ''
    return {
      corrected: true,
      notes: ['lineup'],
      text: `${text}\n\n---\n**${label}**：${why}。${zh ? '以下是程序生成的一套合法配置：' : 'A legal line-up generated by program:'}\n${zh ? '在场角色' : 'Characters in play'}: ${names(plan.inPlay, zh)}${bluffs}`,
    }
  }

  const { pool, requirements } = request
  const named = charactersIn(text)
  const ids = listLine(text, ['剧本角色', 'Script characters']) ?? (pool.characters.every((id) => named.has(id)) ? pool.characters : null)
  const problems = ids ? poolProblems(ids, requirements, ctx.language) : []
  if (ids && !problems.length) return { text, corrected: false }
  const why = ids
    ? (zh ? `回答里的剧本不符合要求（${problems.join('；')}）` : `the script in the answer does not meet the request (${problems.join('; ')})`)
    : (zh ? '回答里没有完整的剧本角色名单' : 'the answer has no complete list of script characters')
  return {
    corrected: true,
    notes: ['script'],
    text: `${text}\n\n---\n**${label}**：${why}。${zh ? '以下是程序按要求组出的合法剧本（角色池）：' : 'A legal script (character pool) built by program:'}\n${zh ? '剧本角色' : 'Script characters'}: ${names(pool.characters, zh)}`,
  }
}
