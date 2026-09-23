import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecordFormDialog } from '../components/AnalyticsStudio/RecordFormDialog'
import { I18nProvider } from '../context/I18nContext'
import type { GameRecord } from '../components/StorytellerSub/types'

describe('record identity edits', () => {
  it('preserves identity history, seat numbers and original timestamp on metadata-only saves', () => {
    const record: GameRecord = {
      id: 'edit', endedAt: 1780000000123, recordName: 'Identity',
      days: [], playerSummaries: [{
        seat: 4, name: 'Alice', team: 'evil', initialTeam: 'good', finalTeam: 'evil',
        initialCharacterId: 'washerwoman', finalCharacterId: 'imp',
        characterChangeCount: 3, alignmentChangeCount: 1, historyComplete: true,
      }],
      setup: { playerCount: 1, travelerCount: 0, seatNames: { 4: 'Alice' }, assignments: { 4: 'imp' }, userAssignments: {}, seatNotes: {}, specialNote: '', demonBluffs: [] },
    }
    const onSave = vi.fn()
    render(<I18nProvider language="en"><RecordFormDialog existing={record} language="en" onSave={onSave} onClose={() => {}} /></I18nProvider>)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave.mock.calls[0][0].playerSummaries).toEqual(record.playerSummaries)
    expect(onSave.mock.calls[0][0].setup.assignments).toEqual({ 4: 'imp' })
    expect(onSave.mock.calls[0][0].endedAt).toBe(record.endedAt)
  })
})
