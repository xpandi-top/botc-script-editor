/**
 * Switching the storyteller's script (bug: once a game had started there was
 * no way to pick another script — the only picker sat in Player Assignment
 * and only while a new-game draft was open). The New Game dialog now starts
 * with the script, and Player Assignment switches a running game's script.
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { ModalsNewGame } from '../components/StorytellerSub/Modals/ModalsNewGame'
import { withScript } from '../components/StorytellerSub/Modals/ModalsNewGameHelpers'
import { I18nProvider } from '../context/I18nContext'
import type { NewGameConfig } from '../components/StorytellerSub/types'
import type { StorytellerContext } from '../components/StorytellerSub/useStoryteller'

const draft = (patch: Partial<NewGameConfig> = {}): NewGameConfig => ({
  playerCount: 5, travelerCount: 0, scriptSlug: 'tb', seatNames: {}, assignments: { 1: 'chef' },
  userAssignments: { 1: null }, travelerAssignments: {}, seatNotes: { 1: '靠窗' }, specialNote: '',
  demonBluffs: ['monk'], charPool: ['chef'], ...patch,
})

describe('withScript', () => {
  it('clears what came from the old script in a new-game draft', () => {
    const next = withScript(draft(), 'bmr')
    expect(next).toMatchObject({ scriptSlug: 'bmr', assignments: {}, userAssignments: {}, demonBluffs: [], charPool: [] })
    expect(next.seatNotes).toEqual({ 1: '靠窗' })
    expect(withScript(draft(), 'tb')).toEqual(draft())
  })

  it('keeps the seats when editing a running game', () => {
    expect(withScript(draft({ editMode: true }), 'bmr')).toMatchObject({ scriptSlug: 'bmr', assignments: { 1: 'chef' } })
  })
})

describe('New Game dialog', () => {
  it('lets the storyteller pick the script', () => {
    const scriptOptions = [
      { slug: 'tb', title: 'Trouble Brewing', titleZh: '暗流涌动', characters: ['chef'] },
      { slug: 'bmr', title: 'Bad Moon Rising', titleZh: '黯月初升', characters: ['sailor'] },
    ]
    let latest: NewGameConfig | null = null
    function Harness() {
      const [panel, setPanel] = useState<NewGameConfig | null>(draft())
      latest = panel
      const ctx = {
        playerNamePool: [], setPlayerNamePool: vi.fn(), language: 'zh',
        text: { cancelNewGame: '取消', startNewGame: '开始新游戏' },
        newGamePanel: panel, setNewGamePanel: setPanel, setShowNewGamePanel: vi.fn(),
        startNewGame: vi.fn(), applyGameChanges: vi.fn(), days: [], stName: '', setStName: vi.fn(),
        scriptOptions,
      } as unknown as StorytellerContext
      return <ModalsNewGame ctx={ctx} />
    }
    render(<I18nProvider language="zh"><Harness /></I18nProvider>)
    // The first field in the dialog is the script.
    const picker = screen.getAllByRole('combobox')[0]
    expect(picker.textContent).toBe('暗流涌动')
    fireEvent.mouseDown(picker)
    fireEvent.click(within(screen.getByRole('listbox')).getByText('黯月初升'))
    expect(latest!.scriptSlug).toBe('bmr')
    expect(latest!.assignments).toEqual({})
  })
})
