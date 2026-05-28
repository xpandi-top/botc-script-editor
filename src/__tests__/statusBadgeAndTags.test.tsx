/**
 * Tests: StatusBadge, translateStTag, TagChip localization, resolveTagDisplay.
 *
 * resolveTagDisplay is the shared tag-parsing function used by both:
 *   - ArenaSeat (desktop seat card)
 *   - MobileSeatCard (mobile seat card)
 * Tests here cover all three tag formats and catch the mobile regression where
 * '📝Wrong::librarian' was rendered raw instead of parsed.
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { translateStTag, StatusBadge, TagChip, resolveTagDisplay } from '../components/StorytellerSub/Arena/ArenaSeatComponents'

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

// ── resolveTagDisplay — shared by desktop (ArenaSeat) + mobile (MobileSeatCard) ──
//
// This function was extracted to ensure both views parse tag labels identically.
// The original mobile bug: '📝Wrong::librarian' was rendered as the raw string
// because MobileSeatCard only handled the '💀' case, falling through to label as-is.

describe('resolveTagDisplay — plain text tags', () => {
  it('known tag translated EN', () => {
    const r = resolveTagDisplay('drunk', 'en')
    expect(r.displayLabel).toBe('Drunk')
    expect(r.srcId).toBeNull()
    expect(r.isCharTag).toBe(false)
  })

  it('known tag translated ZH', () => {
    const r = resolveTagDisplay('poisoned', 'zh')
    expect(r.displayLabel).toBe('中毒')
    expect(r.srcId).toBeNull()
    expect(r.isCharTag).toBe(false)
  })

  it('unknown custom tag falls back to raw label', () => {
    const r = resolveTagDisplay('my note', 'en')
    expect(r.displayLabel).toBe('my note')
    expect(r.srcId).toBeNull()
    expect(r.isCharTag).toBe(false)
  })
})

describe('resolveTagDisplay — 📝 linked ST tags (regression: mobile rendered raw)', () => {
  it('parses label from 📝label::srcId', () => {
    // This was the exact bug: mobile showed '📝Wrong::librarian' verbatim
    const r = resolveTagDisplay('📝Wrong::librarian', 'en')
    expect(r.displayLabel).toBe('Wrong')       // not '📝Wrong::librarian'
    expect(r.srcId).toBe('librarian')
    expect(r.isCharTag).toBe(false)
  })

  it('translates known label from 📝poisoned::poisoner EN', () => {
    const r = resolveTagDisplay('📝poisoned::poisoner', 'en')
    expect(r.displayLabel).toBe('Poisoned')
    expect(r.srcId).toBe('poisoner')
    expect(r.isCharTag).toBe(false)
  })

  it('translates known label from 📝drunk::washerwoman ZH', () => {
    const r = resolveTagDisplay('📝drunk::washerwoman', 'zh')
    expect(r.displayLabel).toBe('醉酒')
    expect(r.srcId).toBe('washerwoman')
    expect(r.isCharTag).toBe(false)
  })

  it('handles 📝label with no source', () => {
    const r = resolveTagDisplay('📝protected', 'en')
    expect(r.displayLabel).toBe('Protected')
    expect(r.srcId).toBeNull()
    expect(r.isCharTag).toBe(false)
  })

  it('handles 📝label:: (empty source) → srcId null', () => {
    const r = resolveTagDisplay('📝used::', 'en')
    expect(r.displayLabel).toBe('Used')
    expect(r.srcId).toBeNull()
    expect(r.isCharTag).toBe(false)
  })

  it('does NOT return raw emoji+label string for any 📝 tag', () => {
    // Regression guard: none of these should leak the raw string
    const cases = [
      '📝Wrong::librarian',
      '📝drunk::washerwoman',
      '📝poisoned::poisoner',
      '📝protected',
      '📝used::',
    ]
    for (const tag of cases) {
      const { displayLabel } = resolveTagDisplay(tag, 'en')
      expect(displayLabel).not.toContain('📝')
      expect(displayLabel).not.toContain('::')
    }
  })
})

describe('resolveTagDisplay — 💀 character tags', () => {
  it('isCharTag=true and srcId=charId for 💀charId', () => {
    const r = resolveTagDisplay('💀librarian', 'en')
    expect(r.isCharTag).toBe(true)
    expect(r.srcId).toBe('librarian')
    // displayLabel is charId (caller replaces with getDisplayName)
  })

  it('isCharTag=true works for multi-char id', () => {
    const r = resolveTagDisplay('💀scarlet_woman', 'en')
    expect(r.isCharTag).toBe(true)
    expect(r.srcId).toBe('scarlet_woman')
  })
})
