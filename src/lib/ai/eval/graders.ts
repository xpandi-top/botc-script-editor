/**
 * Program graders for the AI evaluation cases: phrase checks, characters
 * named in the answer, and validation of generated line-ups and scripts
 * against the catalog and the official player-count table.
 */
import { initialScripts } from '../../../catalog'
import { charactersIn, listLine, poolProblems, setupProblems, teamCounts } from '../answerParse'
import type { Check, EvalCase } from './cases'

export type CheckResult = { label: string; pass: boolean; detail?: string }
export type Grade = { pass: boolean; checks: CheckResult[] }
export { charactersIn, listLine }
export type AnswerUnderTest = { text: string; steps?: Array<{ tool: string; ok: boolean; arguments?: unknown }> }

function checkSetup(check: Extract<Check, { kind: 'setup' }>, answer: AnswerUnderTest): CheckResult {
  const ids = listLine(answer.text, ['在场角色', 'Characters in play'])
  if (!ids) return { label: check.label, pass: false, detail: 'no "在场角色:" line' }
  const problems = setupProblems(ids, initialScripts.find((s) => s.slug === check.script)?.characters ?? [], check.players)
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
  const problems = poolProblems(ids, check)
  const counts = teamCounts(ids)
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
