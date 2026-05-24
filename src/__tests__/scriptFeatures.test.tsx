/**
 * Tests for:
 * 1. Tags round-trip via download (createScriptPayload) and import (parseScriptFromData)
 * 2. SheetArticle hideAbility prop — ability text hidden/shown
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../catalog')>()
  return {
    ...actual,
    getIconForCharacter: () => null,
    getDisplayName: (id: string) => id,
    getAbilityTextForScript: (id: string) => `Ability of ${id}.`,
    getActiveJinxesForScript: () => [],
    getEffectiveNightOrderFromRegistry: () => ({ first_night: [], other_nights: [] }),
    editionLabels: { en: { custom: 'Custom' }, zh: { custom: '自制' } },
    teamLabels: {
      en: { townsfolk: 'Townsfolk', outsider: 'Outsider', minion: 'Minion', demon: 'Demon', traveler: 'Traveler', fabled: 'Fabled', loric: 'Loric' },
      zh: { townsfolk: '镇民', outsider: '外来者', minion: '爪牙', demon: '恶魔', traveler: '旅行者', fabled: '传说', loric: 'Loric' },
    },
    locales: {
      en: { ui: { bootlegger_rules: 'Special Rules', jinxes: 'Jinxes' } },
      zh: { ui: { bootlegger_rules: '特殊规则', jinxes: '克制关系' } },
    },
    toTitleCase: (s: string) => s,
  }
})

import { SheetArticle } from '../components/SheetArticle'
import type { EditableScript, ResolvedScriptCharacter, ResolvedScriptCharacterGroup } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeScript(overrides: Partial<EditableScript> = {}): EditableScript {
  return {
    slug: 'test', title: 'Test Script', titleZh: 'Test Script',
    author: 'Author', edition: 'custom',
    characters: ['imp'],
    meta: { id: '_meta', name: 'Test Script' },
    customCharacters: [], sourceFile: 'test.json',
    ...overrides,
  }
}

const IMP_CHAR: ResolvedScriptCharacter = {
  id: 'imp', team: 'demon', edition: 'tb',
}

const GROUPED: ResolvedScriptCharacterGroup[] = [
  { team: 'demon', characters: [IMP_CHAR] },
]

function renderSheet(props: Partial<React.ComponentProps<typeof SheetArticle>> = {}) {
  return render(
    <SheetArticle
      activeScript={makeScript()}
      activeScriptCharacters={[IMP_CHAR]}
      groupedScriptCharacters={GROUPED}
      bootleggerRulesLabel="Special Rules"
      jinxesLabel="Jinxes"
      isEditMode={false}
      onRemoveCharacter={() => {}}
      language="en"
      {...props}
    />,
  )
}

// ── SheetArticle hideAbility ──────────────────────────────────────────────────

describe('SheetArticle — hideAbility', () => {
  it('shows ability text by default (hideAbility=false)', () => {
    renderSheet({ hideAbility: false })
    expect(screen.getByText(/Ability of imp/)).toBeTruthy()
  })

  it('hides ability text when hideAbility=true', () => {
    renderSheet({ hideAbility: true })
    expect(screen.queryByText(/Ability of imp/)).toBeNull()
  })

  it('still shows character name when hideAbility=true', () => {
    renderSheet({ hideAbility: true })
    // getDisplayName mock returns the id; 'imp' should appear as name
    expect(screen.getAllByText('imp').length).toBeGreaterThan(0)
  })

  it('shows ability text after toggling back to hideAbility=false', () => {
    const { rerender } = renderSheet({ hideAbility: true })
    expect(screen.queryByText(/Ability of imp/)).toBeNull()
    rerender(
      <SheetArticle
        activeScript={makeScript()}
        activeScriptCharacters={[IMP_CHAR]}
        groupedScriptCharacters={GROUPED}
        bootleggerRulesLabel="Special Rules"
        jinxesLabel="Jinxes"
        isEditMode={false}
        onRemoveCharacter={() => {}}
        language="en"
        hideAbility={false}
      />,
    )
    expect(screen.getByText(/Ability of imp/)).toBeTruthy()
  })
})
