/**
 * Pack glossary — the rules vocabulary an edition defines on top of the base
 * game (Odyssey's 审判日, 变量X, 死亡延迟, 旅行者隔绝原则, …).
 */

import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  getAlmanacTerminology,
  getEditionsForCharacters,
  getEditionsWithGlossary,
} from '../catalog'
import { EditionGlossary } from '../components/EditionGlossary'
import { I18nProvider } from '../context/I18nContext'

function renderGlossary(editions: string[], language: 'en' | 'zh' = 'zh') {
  return render(
    <I18nProvider language={language}>
      <EditionGlossary editions={editions} language={language} />
    </I18nProvider>,
  )
}

describe('getEditionsForCharacters', () => {
  it('lists each edition once', () => {
    expect(getEditionsForCharacters(['painter', 'witcher', 'washerwoman', 'chef']))
      .toEqual(['odyssey', 'tb'])
  })

  it('ignores unknown ids', () => {
    expect(getEditionsForCharacters(['nope'])).toEqual([])
  })
})

describe('getEditionsWithGlossary', () => {
  it('keeps only editions that ship an almanac', () => {
    expect(getEditionsWithGlossary(['painter', 'washerwoman'])).toEqual(['odyssey'])
  })

  it('is empty for an all-official roster', () => {
    expect(getEditionsWithGlossary(['washerwoman', 'chef', 'imp'])).toEqual([])
  })
})

describe('getAlmanacTerminology', () => {
  it('returns the Odyssey terms', async () => {
    const terms = await getAlmanacTerminology('odyssey', 'zh')
    expect(Object.keys(terms)).toEqual(expect.arrayContaining([
      'judgment_day', 'variable_x', 'delay', 'attack', 'traveler_isolation', 'vote_token',
    ]))
    expect(terms.judgment_day.title).toContain('审判日')
    expect(terms.judgment_day.text.length).toBeGreaterThan(20)
  })

  it('returns nothing for an edition with no almanac', async () => {
    expect(await getAlmanacTerminology('tb', 'zh')).toEqual({})
  })
})

describe('EditionGlossary', () => {
  it('renders the term titles once loaded', async () => {
    renderGlossary(['odyssey'])
    // Match the accordion headings exactly — the term bodies mention the same
    // words, so a loose regex hits several nodes.
    await waitFor(() => expect(screen.getByText('审判日 Judgment Day')).toBeTruthy())
    expect(screen.getByText('变量 X Variable X')).toBeTruthy()
    expect(screen.getByText('旅行者隔绝原则')).toBeTruthy()
  })

  it('says so when no edition on the roster has a glossary', async () => {
    renderGlossary([])
    await waitFor(() => expect(screen.getByText(/该剧本没有角色包术语/)).toBeTruthy())
  })
})
