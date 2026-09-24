/** The evaluation graders themselves must be right, or the scores mean nothing. */
import { describe, it, expect } from 'vitest'
import { charactersIn, gradeCase, gradeCheck, listLine } from '../lib/ai/eval/graders'
import { EVAL_CASES } from '../lib/ai/eval/cases'
import { evalContext } from '../lib/ai/eval/contexts'

const setup7 = { kind: 'setup' as const, script: 'tb', players: 7, label: 'setup' }

describe('eval graders', () => {
  it('finds characters by Chinese name, English name or id, longest name first', () => {
    expect([...charactersIn('小恶魔、投毒者 and the Scarlet Woman; also baron')].sort()).toEqual(['baron', 'imp', 'poisoner', 'scarletwoman'])
    expect(charactersIn('这是恶魔阵营').size).toBe(0)
    expect(charactersIn('Important impact').has('imp')).toBe(false)
  })

  it('reads the final list line with ids or names', () => {
    expect(listLine('说明……\n在场角色: washerwoman, 共情者, poisoner，小恶魔', ['在场角色'])).toEqual(['washerwoman', 'empath', 'poisoner', 'imp'])
    expect(listLine('**在场角色：** chef、nobody', ['在场角色'])).toEqual(['chef', '?nobody'])
    expect(listLine('no line', ['在场角色'])).toBeNull()
  })

  it('accepts a legal 7-player line-up and the Baron shift, rejects wrong counts', () => {
    const ok = '在场角色: washerwoman, librarian, investigator, chef, empath, poisoner, imp'
    expect(gradeCheck(setup7, { text: ok }).pass).toBe(true)
    const baron = '在场角色: washerwoman, librarian, investigator, butler, drunk, baron, imp'
    expect(gradeCheck(setup7, { text: baron }).pass).toBe(true)
    const twoMinions = '在场角色: washerwoman, librarian, investigator, chef, poisoner, spy, imp'
    expect(gradeCheck(setup7, { text: twoMinions })).toMatchObject({ pass: false, detail: expect.stringContaining('2 minions') })
    const offScript = '在场角色: washerwoman, librarian, investigator, chef, clockmaker, poisoner, imp'
    expect(gradeCheck(setup7, { text: offScript }).detail).toContain('not on the script: clockmaker')
  })

  it('validates a generated script from the list line or a create_script_draft call', () => {
    const check = { kind: 'script' as const, label: 's', include: ['imp'], noTeams: ['traveler' as const], counts: { demon: [1, 4] as [number, number] }, dealable: [7] }
    const tb = 'washerwoman, librarian, investigator, chef, empath, fortuneteller, undertaker, monk, ravenkeeper, virgin, slayer, soldier, mayor, butler, drunk, recluse, saint, poisoner, spy, scarletwoman, baron, imp'
    expect(gradeCheck(check, { text: `剧本角色: ${tb}` }).pass).toBe(true)
    expect(gradeCheck(check, { text: '', steps: [{ tool: 'create_script_draft', ok: true, arguments: { characters: tb.split(', ') } }] }).pass).toBe(true)
    expect(gradeCheck(check, { text: '剧本角色: washerwoman, imp, beggar' }).detail).toMatch(/has traveler.*cannot deal 7/)
  })

  it('every case has checks and a context the panel can build', () => {
    for (const c of EVAL_CASES) {
      expect(c.checks.length, c.id).toBeGreaterThan(0)
      expect(evalContext(c).language).toBe(c.language)
    }
    expect(new Set(EVAL_CASES.map((c) => c.id)).size).toBe(EVAL_CASES.length)
    const game = evalContext(EVAL_CASES.find((c) => c.id === 'situation-scarlet-woman')!)
    expect(game.serialized).toContain('红唇女郎')
  })

  it('grades a whole case', () => {
    const c = EVAL_CASES.find((x) => x.id === 'rules-execution-threshold')!
    expect(gradeCase(c, { text: '6 人存活时需要 3 票（至少半数）。' }).pass).toBe(true)
    expect(gradeCase(c, { text: '需要超过半数，也就是 4 票。' }).pass).toBe(false)
  })
})
