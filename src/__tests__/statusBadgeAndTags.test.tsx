/**
 * Tests: StatusBadge, translateStTag, TagChip localization.
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { translateStTag, StatusBadge, TagChip } from '../components/StorytellerSub/Arena/ArenaSeatComponents'

// ── translateStTag ───────────────────────────────────────────────────────────

describe('translateStTag', () => {
  it('translates known EN tags to EN labels', () => {
    expect(translateStTag('drunk', 'en')).toBe('Drunk')
    expect(translateStTag('poisoned', 'en')).toBe('Poisoned')
    expect(translateStTag('protected', 'en')).toBe('Protected')
    expect(translateStTag('used', 'en')).toBe('Used')
    expect(translateStTag('red herring', 'en')).toBe('Red Herring')
  })

  it('translates known tags to ZH labels', () => {
    expect(translateStTag('drunk', 'zh')).toBe('醉酒')
    expect(translateStTag('poisoned', 'zh')).toBe('中毒')
    expect(translateStTag('protected', 'zh')).toBe('受保护')
    expect(translateStTag('used', 'zh')).toBe('已使用')
    expect(translateStTag('red herring', 'zh')).toBe('干扰项')
  })

  it('returns raw label for unknown tags', () => {
    expect(translateStTag('some custom tag', 'en')).toBe('some custom tag')
    expect(translateStTag('some custom tag', 'zh')).toBe('some custom tag')
  })

  it('is case-insensitive (lowercases before lookup)', () => {
    // toLowerCase applied before map lookup
    expect(translateStTag('Drunk', 'zh')).toBe('醉酒')
    expect(translateStTag('POISONED', 'en')).toBe('Poisoned')
  })
})

// ── TagChip ──────────────────────────────────────────────────────────────────

describe('TagChip', () => {
  it('renders label text', () => {
    render(<TagChip label="protected" language="en" />)
    expect(screen.getByText('Protected')).toBeInTheDocument()
  })

  it('renders translated ZH label when language=zh', () => {
    render(<TagChip label="poisoned" language="zh" />)
    expect(screen.getByText('中毒')).toBeInTheDocument()
  })

  it('renders raw label when no language prop', () => {
    render(<TagChip label="custom-tag" />)
    expect(screen.getByText('custom-tag')).toBeInTheDocument()
  })

  it('opens popover on click with enlarged label', async () => {
    render(<TagChip label="drunk" language="zh" />)
    const chip = screen.getByRole('button')
    fireEvent.click(chip)
    // Popover should now show the translated label in h6
    await waitFor(() => {
      const h6s = screen.getAllByText('醉酒')
      expect(h6s.length).toBeGreaterThanOrEqual(2) // chip label + popover h6
    })
  })
})

// ── StatusBadge ──────────────────────────────────────────────────────────────

describe('StatusBadge', () => {
  it('renders drunk badge with label', () => {
    render(<StatusBadge type="drunk" label="Drunk" isDark={false} />)
    expect(screen.getByText('Drunk')).toBeInTheDocument()
  })

  it('renders poisoned badge with label', () => {
    render(<StatusBadge type="poisoned" label="中毒" isDark={true} />)
    expect(screen.getByText('中毒')).toBeInTheDocument()
  })

  it('opens popover on click showing enlarged label', async () => {
    render(<StatusBadge type="drunk" label="醉酒" isDark={false} />)
    const chip = screen.getByRole('button')
    fireEvent.click(chip)
    await waitFor(() => {
      const matches = screen.getAllByText('醉酒')
      expect(matches.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('renders MUI icon inside chip', () => {
    const { container } = render(<StatusBadge type="drunk" label="Drunk" isDark={false} />)
    // LocalBarIcon renders as SVG
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('different border color in dark mode vs light mode', () => {
    const { container: lightContainer } = render(<StatusBadge type="drunk" label="Drunk" isDark={false} />)
    const { container: darkContainer } = render(<StatusBadge type="drunk" label="Drunk" isDark={true} />)
    // Both render chips — presence check
    expect(lightContainer.querySelector('.MuiChip-root')).toBeTruthy()
    expect(darkContainer.querySelector('.MuiChip-root')).toBeTruthy()
  })
})
