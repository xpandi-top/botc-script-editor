import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NominationVoteList } from '../components/StorytellerSub/Arena/NominationVoteList'

function makeProps(overrides: Partial<Parameters<typeof NominationVoteList>[0]> = {}) {
  return {
    seats: [
      { seat: 1, name: 'Alice', alive: true,  hasNoVote: false },
      { seat: 2, name: 'Bob',   alive: false, hasNoVote: false },
      { seat: 3, name: 'Carol', alive: true,  hasNoVote: true  },
    ],
    voteDraft: { voters: [], noVoters: [], isExile: false, voteCountOverride: null },
    votingState: null,
    effectiveRequiredVotes: 4,
    yesCount: 0,
    votingYesCount: 0,
    handleVoteToggle: vi.fn(),
    updateCurrentDay: vi.fn(),
    language: 'en',
    ...overrides,
  }
}

describe('NominationVoteList', () => {
  it('renders a chip for each seat', () => {
    render(<NominationVoteList {...makeProps()} />)
    expect(screen.getByText(/1\. Alice/)).toBeInTheDocument()
    expect(screen.getByText(/2\. Bob/)).toBeInTheDocument()
    expect(screen.getByText(/3\. Carol/)).toBeInTheDocument()
  })

  it('shows dead marker (†) for dead players', () => {
    render(<NominationVoteList {...makeProps()} />)
    const bobChip = screen.getByText(/Bob/)
    expect(bobChip.textContent).toContain('†')
  })

  it('does NOT show dead marker for alive players', () => {
    render(<NominationVoteList {...makeProps()} />)
    const aliceChip = screen.getByText(/Alice/)
    expect(aliceChip.textContent).not.toContain('†')
  })

  it('shows NoVote tag for players with hasNoVote', () => {
    render(<NominationVoteList {...makeProps()} />)
    const carolChip = screen.getByText(/Carol/)
    expect(carolChip.textContent).toContain('NoVote')
  })

  it('calls handleVoteToggle with seat number on click', async () => {
    const handleVoteToggle = vi.fn()
    render(<NominationVoteList {...makeProps({ handleVoteToggle })} />)
    await userEvent.click(screen.getByText(/1\. Alice/))
    expect(handleVoteToggle).toHaveBeenCalledWith(1)
  })

  it('marks chip as checked when seat is in voteDraft.voters', () => {
    const props = makeProps({ voteDraft: { voters: [1], noVoters: [], isExile: false, voteCountOverride: null } })
    const { container } = render(<NominationVoteList {...props} />)
    // MUI filled chip gets class MuiChip-filled — check aria or color via role
    const chips = container.querySelectorAll('[class*="MuiChip-filled"]')
    expect(chips.length).toBeGreaterThan(0)
  })

  it('displays yes count and required votes', () => {
    render(<NominationVoteList {...makeProps({ yesCount: 2, effectiveRequiredVotes: 5 })} />)
    // The yes count appears inside <strong> and required votes as plain text "/ 5"
    expect(screen.getAllByText(/2/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Yes/)).toBeInTheDocument()
    expect(screen.getAllByText(/5/).length).toBeGreaterThan(0)
  })

  it('shows Exile chip when isExile is true', () => {
    const props = makeProps({ voteDraft: { voters: [], noVoters: [], isExile: true, voteCountOverride: null } })
    render(<NominationVoteList {...props} />)
    expect(screen.getByText('Exile')).toBeInTheDocument()
  })

  it('renders override controls (+ / − buttons)', () => {
    render(<NominationVoteList {...makeProps()} />)
    expect(screen.getByText('−')).toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('shows Chinese labels when language is zh', () => {
    render(<NominationVoteList {...makeProps({ language: 'zh' })} />)
    expect(screen.getByText(/投票/)).toBeInTheDocument()
  })
})
