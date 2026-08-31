/**
 * Attribution required by a character pack's terms.
 *
 * Odyssey is free to use but only on condition that the script names it, so the
 * credit line is driven by the characters actually on the sheet and is not
 * behind a print option — these tests pin both halves of that.
 */

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  getEditionCredit,
  getEditionCreditAuthor,
  getEditionCreditName,
  getEditionTerms,
  getRequiredAttributions,
} from '../catalog'
import { SheetArticle } from '../components/SheetArticle'
import type { EditableScript, ResolvedScriptCharacter, ResolvedScriptCharacterGroup } from '../types'

const ODYSSEY_CHAR: ResolvedScriptCharacter = { id: 'painter', team: 'townsfolk', edition: 'odyssey' }
const OFFICIAL_CHAR: ResolvedScriptCharacter = { id: 'washerwoman', team: 'townsfolk', edition: 'tb' }

function makeScript(characters: string[]): EditableScript {
  return {
    slug: 'test',
    title: 'Test Script',
    titleZh: '测试剧本',
    author: 'Author',
    edition: 'custom',
    characters,
    meta: { id: '_meta', name: 'Test Script' },
    customCharacters: [],
    sourceFile: 'test.json',
  }
}

function renderSheet(chars: ResolvedScriptCharacter[], language: 'en' | 'zh' = 'en') {
  const grouped: ResolvedScriptCharacterGroup[] = [{ team: 'townsfolk', characters: chars }]
  return render(
    <SheetArticle
      activeScript={makeScript(chars.map((c) => c.id))}
      activeScriptCharacters={chars}
      groupedScriptCharacters={grouped}
      bootleggerRulesLabel="Special Rules"
      jinxesLabel="Jinxes"
      isEditMode={false}
      onRemoveCharacter={() => {}}
      language={language}
    />,
  )
}

describe('getRequiredAttributions', () => {
  it('reports Odyssey when the script uses an Odyssey character', () => {
    expect(getRequiredAttributions(['painter']).map((c) => c.id)).toEqual(['odyssey'])
  })

  it('reports nothing for official characters', () => {
    expect(getRequiredAttributions(['washerwoman', 'chef', 'imp'])).toEqual([])
  })

  it('reports each pack once regardless of how many of its characters are used', () => {
    expect(getRequiredAttributions(['painter', 'witcher', 'puck', 'washerwoman']).map((c) => c.id))
      .toEqual(['odyssey'])
  })

  it('ignores unknown character ids', () => {
    expect(getRequiredAttributions(['definitely-not-a-character'])).toEqual([])
  })
})

describe('edition credit copy', () => {
  const credit = getEditionCredit('odyssey')!

  it('has the fields the credit line needs', () => {
    expect(credit).toBeDefined()
    expect(credit.requiresAttribution).toBe(true)
    expect(credit.source).toMatch(/^https:\/\//)
  })

  it('localizes the pack name, author and terms', () => {
    expect(getEditionCreditName(credit, 'zh')).toContain('奥德赛')
    expect(getEditionCreditName(credit, 'en')).toBe('Odyssey')
    expect(getEditionCreditAuthor(credit, 'zh')).toBe('太一')
    expect(getEditionTerms(credit, 'zh')).toContain('奥德赛')
    expect(getEditionTerms(credit, 'en')).toBeTruthy()
  })

  it('has no credit for official editions', () => {
    expect(getEditionCredit('tb')).toBeUndefined()
  })
})

describe('SheetArticle attribution footer', () => {
  it('credits Odyssey when the sheet contains an Odyssey character', () => {
    renderSheet([ODYSSEY_CHAR])
    expect(screen.getByText(/Characters from Odyssey/)).toBeTruthy()
    expect(screen.getByText(/yuque\.com\/u48069482\/taiyi/)).toBeTruthy()
  })

  it('uses the Chinese credit line in Chinese', () => {
    renderSheet([ODYSSEY_CHAR], 'zh')
    expect(screen.getByText(/角色来自《奥德赛 Odyssey》/)).toBeTruthy()
  })

  it('renders no credit when the sheet has no character that requires one', () => {
    renderSheet([OFFICIAL_CHAR])
    expect(screen.queryByText(/Characters from/)).toBeNull()
    expect(screen.queryByText(/角色来自/)).toBeNull()
  })

  it('credits Odyssey on a mixed sheet', () => {
    renderSheet([OFFICIAL_CHAR, ODYSSEY_CHAR])
    expect(screen.getByText(/Characters from Odyssey/)).toBeTruthy()
  })
})
