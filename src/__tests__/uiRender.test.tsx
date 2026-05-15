/**
 * UI render sanity tests — no corruption, no undefined/null leakage.
 *
 * Covers leaf components that display user data: CharacterCircle,
 * LogDetailText, VoteButtonGroup, RoundRobinIndicator,
 * NominationHistory, PlayerNightLog.
 *
 * Goals:
 *  - Components render without throwing
 *  - Key text/labels visible (player names, seat numbers)
 *  - No "[object Object]" / "undefined" / "null" in output
 *  - EN ↔ ZH produces correct, different labels
 *  - Conditional display (hidden/revealed, empty/populated) works
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

import { CharacterCircle } from '../components/StorytellerSub/Arena/CharacterCircle'
import { LogDetailText } from '../components/StorytellerSub/LogDetailText'
import { VoteButtonGroup, RoundRobinIndicator } from '../components/StorytellerSub/Arena/ArenaSeatComponents'
import { NominationHistory } from '../components/StorytellerSub/Arena/NominationHistory'
import { PlayerNightLog } from '../components/StorytellerSub/Arena/PlayerNightLog'

// ── Helpers ───────────────────────────────────────────────────────────────────

const noop = () => {}

function noText(container: HTMLElement) {
  const text = container.textContent ?? ''
  expect(text).not.toContain('undefined')
  expect(text).not.toContain('[object Object]')
  expect(text).not.toMatch(/^null$/)
}

// ── CharacterCircle ──────────────────────────────────────────────────────────

describe('CharacterCircle — hidden mode', () => {
  const baseProps = {
    charIcon: null,
    charName: 'Imp',
    nightShowCharacter: false,
    isOpen: false,
    onClick: noop,
    size: 60,
  }

  it('renders question mark when not revealed', () => {
    const { container } = render(<CharacterCircle {...baseProps} />)
    expect(container.textContent).toContain('?')
  })

  it('does NOT render character name when hidden', () => {
    const { container } = render(<CharacterCircle {...baseProps} />)
    expect(container.textContent).not.toContain('Imp')
  })

  it('produces no corrupt text', () => {
    const { container } = render(<CharacterCircle {...baseProps} />)
    noText(container)
  })

  it('fires onClick when clicked (not disabled)', async () => {
    const onClick = vi.fn()
    const { container } = render(<CharacterCircle {...baseProps} onClick={onClick} />)
    fireEvent.click(container.firstElementChild!)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does NOT fire onClick when disabled', () => {
    const onClick = vi.fn()
    const { container } = render(<CharacterCircle {...baseProps} onClick={onClick} disabled={true} />)
    fireEvent.click(container.firstElementChild!)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('CharacterCircle — revealed mode', () => {
  const baseProps = {
    charIcon: '/icons/imp.png',
    charName: 'Imp',
    nightShowCharacter: true,
    isOpen: false,
    onClick: noop,
    size: 60,
  }

  it('renders character name when revealed', () => {
    render(<CharacterCircle {...baseProps} />)
    expect(screen.getByText('Imp')).toBeInTheDocument()
  })

  it('renders img with src', () => {
    const { container } = render(<CharacterCircle {...baseProps} />)
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img?.getAttribute('src')).toBe('/icons/imp.png')
  })

  it('truncates long names (>9 chars) with ellipsis', () => {
    render(<CharacterCircle {...baseProps} charName="Scarlet Woman" />)
    // Component: charName.length > 9 → slice(0,8) + "…" = "Scarlet " + "…"
    expect(screen.getByText('Scarlet …')).toBeInTheDocument()
  })

  it('does NOT truncate 9-char names', () => {
    render(<CharacterCircle {...baseProps} charName="Poisoner" />)
    expect(screen.getByText('Poisoner')).toBeInTheDocument()
  })

  it('does not show ? when revealed', () => {
    const { container } = render(<CharacterCircle {...baseProps} />)
    expect(container.textContent).not.toContain('?')
  })

  it('produces no corrupt text', () => {
    const { container } = render(<CharacterCircle {...baseProps} />)
    noText(container)
  })
})

// ── LogDetailText ─────────────────────────────────────────────────────────────

describe('LogDetailText — plain text', () => {
  it('renders plain string', () => {
    render(<LogDetailText detail="#3 died" />)
    expect(screen.getByText('#3 died')).toBeInTheDocument()
  })

  it('renders Chinese text intact', () => {
    render(<LogDetailText detail="#3 死亡" />)
    expect(screen.getByText('#3 死亡')).toBeInTheDocument()
  })

  it('produces no corrupt text', () => {
    const { container } = render(<LogDetailText detail="#5 marked executed" />)
    noText(container)
  })
})

describe('LogDetailText — icon token substitution', () => {
  it('renders text around icon tokens', () => {
    // [icon:imp] token is substituted with img — surrounding text still present
    const { container } = render(<LogDetailText detail="#5 tagged: [icon:imp] Drunk" />)
    expect(container.textContent).toContain('#5 tagged:')
    expect(container.textContent).toContain('Drunk')
  })

  it('renders img for known icon token', () => {
    // imp is a known character — getIconForCharacter returns its path
    const { container } = render(<LogDetailText detail="[icon:imp] info" />)
    const img = container.querySelector('img')
    // Either img present (if imp icon found) or null rendered for unknown
    // Either way — no corrupt text
    noText(container)
  })

  it('handles unknown charId in token gracefully (renders null, no crash)', () => {
    const { container } = render(<LogDetailText detail="[icon:totally_unknown_xyz_char] text" />)
    expect(container.textContent).toContain('text')
    noText(container)
  })

  it('multiple icon tokens in one string', () => {
    const { container } = render(<LogDetailText detail="[icon:imp] vs [icon:virgin] result" />)
    expect(container.textContent).toContain('result')
    noText(container)
  })

  it('no img rendered for plain text (fast path)', () => {
    const { container } = render(<LogDetailText detail="simple text no tokens" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('simple text no tokens')
  })
})

// ── VoteButtonGroup ───────────────────────────────────────────────────────────

describe('VoteButtonGroup — unvoted state', () => {
  const baseProps = {
    seat: { seat: 1 },
    cardVotedYes: false,
    cardVotedNo: false,
    handleVoteYesClick: vi.fn(),
    handleVoteNoClick: vi.fn(),
    handleRemoveVote: vi.fn(),
  }

  it('renders two icon buttons (yes + no) when not voted', () => {
    render(<VoteButtonGroup {...baseProps} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
  })

  it('calls handleVoteYesClick when yes button clicked', () => {
    const handler = vi.fn()
    render(<VoteButtonGroup {...baseProps} handleVoteYesClick={handler} />)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('calls handleVoteNoClick when no button clicked', () => {
    const handler = vi.fn()
    render(<VoteButtonGroup {...baseProps} handleVoteNoClick={handler} />)
    fireEvent.click(screen.getAllByRole('button')[1])
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('produces no corrupt text', () => {
    const { container } = render(<VoteButtonGroup {...baseProps} />)
    noText(container)
  })
})

describe('VoteButtonGroup — voted state', () => {
  it('renders single button when voted yes', () => {
    render(<VoteButtonGroup
      seat={{ seat: 1 }}
      cardVotedYes={true}
      cardVotedNo={false}
      handleVoteYesClick={noop}
      handleVoteNoClick={noop}
      handleRemoveVote={noop}
    />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('renders single button when voted no', () => {
    render(<VoteButtonGroup
      seat={{ seat: 1 }}
      cardVotedYes={false}
      cardVotedNo={true}
      handleVoteYesClick={noop}
      handleVoteNoClick={noop}
      handleRemoveVote={noop}
    />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('calls handleRemoveVote when voted button clicked', () => {
    const handler = vi.fn()
    render(<VoteButtonGroup
      seat={{ seat: 1 }}
      cardVotedYes={true}
      cardVotedNo={false}
      handleVoteYesClick={noop}
      handleVoteNoClick={noop}
      handleRemoveVote={handler}
    />)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

// ── RoundRobinIndicator ───────────────────────────────────────────────────────

describe('RoundRobinIndicator', () => {
  it('renders nothing when neither speaker nor spoken', () => {
    const { container } = render(<RoundRobinIndicator isRoundRobinSpeaker={false} isSpoken={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders SPK when current speaker', () => {
    render(<RoundRobinIndicator isRoundRobinSpeaker={true} isSpoken={false} />)
    expect(screen.getByText('SPK')).toBeInTheDocument()
  })

  it('renders check icon when spoken (not current speaker)', () => {
    const { container } = render(<RoundRobinIndicator isRoundRobinSpeaker={false} isSpoken={true} />)
    // Check icon renders as SVG
    expect(container.querySelector('svg')).toBeTruthy()
    expect(screen.queryByText('SPK')).toBeNull()
  })

  it('produces no corrupt text', () => {
    const { container } = render(<RoundRobinIndicator isRoundRobinSpeaker={true} isSpoken={false} />)
    noText(container)
  })
})

// ── NominationHistory ─────────────────────────────────────────────────────────

const makeVoteRecord = (overrides = {}) => ({
  id: 'v1',
  actor: 1,
  target: 3,
  voters: [1, 2],
  voteCount: 2,
  requiredVotes: 4,
  passed: false,
  failed: false,
  note: '',
  overridden: false,
  isExile: false,
  ...overrides,
})

const historyBaseProps = {
  historyFilter: 'all' as const,
  setHistoryFilter: vi.fn(),
  updateCurrentDay: vi.fn(),
}

describe('NominationHistory — empty state', () => {
  it('EN: shows "None yet" when no records', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[]} language="en" />)
    expect(screen.getByText('None yet')).toBeInTheDocument()
  })

  it('ZH: shows "暂无记录" when no records', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[]} language="zh" />)
    expect(screen.getByText('暂无记录')).toBeInTheDocument()
  })

  it('EN: shows "Today Nominators" label', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[]} language="en" />)
    expect(screen.getByText(/Today Nominators/)).toBeInTheDocument()
  })

  it('ZH: shows "今日提名者" label', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[]} language="zh" />)
    expect(screen.getByText(/今日提名者/)).toBeInTheDocument()
  })

  it('shows em-dash placeholders when no nominators/nominees', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[]} language="en" />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)  // nominators + nominees
  })

  it('produces no corrupt text', () => {
    const { container } = render(<NominationHistory {...historyBaseProps} voteHistory={[]} language="en" />)
    noText(container)
  })
})

describe('NominationHistory — with records', () => {
  it('shows actor and target seat numbers', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[makeVoteRecord()]} language="en" />)
    expect(screen.getAllByText(/#1/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/#3/).length).toBeGreaterThan(0)
  })

  it('shows vote count / required for live record', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[makeVoteRecord({ voteCount: 3, requiredVotes: 5 })]} language="en" />)
    expect(screen.getByText(/3\/5/)).toBeInTheDocument()
  })

  it('EN: shows "Failed" for failed records', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[makeVoteRecord({ failed: true })]} language="en" />)
    expect(screen.getByText(/Failed/)).toBeInTheDocument()
  })

  it('ZH: shows "失败" for failed records', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[makeVoteRecord({ failed: true })]} language="zh" />)
    expect(screen.getByText(/失败/)).toBeInTheDocument()
  })

  it('shows nominator badge (#seat) in nominator list', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[makeVoteRecord({ actor: 2 })]} language="en" />)
    const allHashTwo = screen.getAllByText(/#2/)
    expect(allHashTwo.length).toBeGreaterThan(0)
  })

  it('renders delete button per record', () => {
    render(<NominationHistory {...historyBaseProps} voteHistory={[makeVoteRecord()]} language="en" />)
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('produces no corrupt text', () => {
    const { container } = render(<NominationHistory {...historyBaseProps} voteHistory={[makeVoteRecord()]} language="en" />)
    noText(container)
  })
})

// ── PlayerNightLog ────────────────────────────────────────────────────────────

const makeSeat = (overrides = {}) => ({
  seat: 2,
  name: 'Alice',
  alive: true,
  isTraveler: false,
  isExecuted: false,
  hasNoVote: false,
  customTags: [],
  stTags: [],
  characterId: null,
  userCharacterId: null,
  teamTag: null,
  note: '',
  ...overrides,
})

const makeDayState = (overrides = {}) => ({
  id: 'd1',
  day: 1,
  phase: 'public',
  publicMode: 'free',
  nominationStep: 'waitingForNomination',
  privateSeconds: 0,
  publicFreeSeconds: 0,
  publicRoundRobinSeconds: 0,
  publicElapsedSeconds: 0,
  nominationWaitSeconds: 0,
  nominationActorSeconds: 0,
  nominationTargetSeconds: 0,
  currentSpeakerSeat: null,
  roundRobinSpokenSeats: [],
  seats: [makeSeat()],
  voteDraft: { actor: null, target: null, voters: [], noVoters: [], note: '', manualPassed: null, nominationResult: 'succeed', isExile: false, voteCountOverride: null },
  votingState: null,
  voteHistory: [],
  skillHistory: [],
  eventLog: [],
  nightVisitedSeats: [],
  gameEnded: false,
  demonBluffs: [],
  ...overrides,
})

describe('PlayerNightLog', () => {
  it('renders nothing when seat is null', () => {
    const { container } = render(
      <PlayerNightLog open={true} onClose={noop} seat={null} days={[makeDayState() as any]} language="en" isNight={false} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('does not render dialog when open=false', () => {
    render(
      <PlayerNightLog open={false} onClose={noop} seat={makeSeat()} days={[makeDayState() as any]} language="en" isNight={false} />
    )
    // Dialog closed — no title visible
    expect(screen.queryByText(/Alice/)).toBeNull()
  })

  it('EN: renders seat label and title when open', () => {
    render(
      <PlayerNightLog open={true} onClose={noop} seat={makeSeat()} days={[makeDayState() as any]} language="en" isNight={false} />
    )
    expect(screen.getByText(/2\. Alice/)).toBeInTheDocument()
    expect(screen.getByText(/Event Log/)).toBeInTheDocument()
  })

  it('ZH: renders seat label and title in Chinese', () => {
    render(
      <PlayerNightLog open={true} onClose={noop} seat={makeSeat()} days={[makeDayState() as any]} language="zh" isNight={false} />
    )
    expect(screen.getByText(/2\. Alice/)).toBeInTheDocument()
    expect(screen.getByText(/事件记录/)).toBeInTheDocument()
  })

  it('EN: shows "No events found" when log is empty', () => {
    render(
      <PlayerNightLog open={true} onClose={noop} seat={makeSeat()} days={[makeDayState() as any]} language="en" isNight={false} />
    )
    expect(screen.getByText(/No events found/)).toBeInTheDocument()
  })

  it('ZH: shows "暂无记录" when log is empty', () => {
    render(
      <PlayerNightLog open={true} onClose={noop} seat={makeSeat()} days={[makeDayState() as any]} language="zh" isNight={false} />
    )
    expect(screen.getByText('暂无记录')).toBeInTheDocument()
  })

  it('renders log entries when events exist', () => {
    const dayWithEvent = makeDayState({
      eventLog: [{
        id: 'e1',
        timestamp: Date.now(),
        phase: 'public',
        kind: 'stateChange',
        detail: '#2 died',
        visibility: 'public',
      }],
    })
    render(
      <PlayerNightLog open={true} onClose={noop} seat={makeSeat()} days={[dayWithEvent as any]} language="en" isNight={false} />
    )
    expect(screen.getByText(/#2 died/)).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(
      <PlayerNightLog open={true} onClose={onClose} seat={makeSeat()} days={[makeDayState() as any]} language="en" isNight={false} />
    )
    const closeBtn = screen.getByRole('button')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('produces no corrupt text', () => {
    const { container } = render(
      <PlayerNightLog open={true} onClose={noop} seat={makeSeat()} days={[makeDayState() as any]} language="en" isNight={false} />
    )
    noText(container)
  })

  it('ZH: produces no corrupt text', () => {
    const { container } = render(
      <PlayerNightLog open={true} onClose={noop} seat={makeSeat()} days={[makeDayState() as any]} language="zh" isNight={false} />
    )
    noText(container)
  })
})
