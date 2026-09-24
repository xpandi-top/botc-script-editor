/**
 * The page an evaluation question is asked on: general chat, a bundled
 * script, or a Trouble Brewing game in a known state (built with the same
 * context builders the AI panel uses).
 */
import { initialScripts } from '../../../catalog'
import { createDayState, createSeats, createTimerDefaults } from '../../../components/StorytellerSub/constants'
import type { Language } from '../../../types'
import { buildGeneralContext, buildScriptContext, buildStorytellerContext } from '../context'
import type { AiContext } from '../types'
import type { EvalCase, GameFixtureId } from './cases'

/** seat → [character, alive]; seats are numbered from 1. */
const FIXTURES: Record<GameFixtureId, Array<[string, boolean]>> = {
  // 6 alive: executing the Imp makes the Scarlet Woman the Demon.
  'scarlet-woman-6-alive': [['imp', true], ['scarletwoman', true], ['washerwoman', true], ['empath', true], ['chef', true], ['butler', true], ['monk', false]],
  // 3 alive with the Mayor: no execution today means good wins.
  'mayor-3-alive': [['imp', true], ['mayor', true], ['empath', true], ['poisoner', false], ['chef', false], ['butler', false], ['monk', false]],
  // 4 alive: one execution and one night kill leave 2 → evil wins.
  'four-alive-evil-close': [['imp', true], ['empath', true], ['chef', true], ['washerwoman', true], ['poisoner', false], ['butler', false], ['monk', false]],
}

function gameContext(fixture: GameFixtureId, language: Language): AiContext {
  const layout = FIXTURES[fixture]
  const seats = createSeats(layout.length).map((seat, i) => ({ ...seat, name: `P${i + 1}`, characterId: layout[i][0], alive: layout[i][1] }))
  const day = { ...createDayState(3, seats, createTimerDefaults(), `eval-${fixture}`), phase: 'public' as const }
  const tb = initialScripts.find((s) => s.slug === 'tb')!
  return buildStorytellerContext({ scriptName: language === 'zh' ? '暗流涌动' : 'Trouble Brewing', currentDay: day, days: [day], language, scriptCharacters: tb.characters })
}

export function evalContext(c: EvalCase): AiContext {
  switch (c.context.kind) {
    case 'general': return buildGeneralContext(c.language)
    case 'script': {
      const slug = c.context.slug
      return buildScriptContext({ script: initialScripts.find((s) => s.slug === slug)!, language: c.language })
    }
    case 'game': return gameContext(c.context.fixture, c.language)
  }
}
