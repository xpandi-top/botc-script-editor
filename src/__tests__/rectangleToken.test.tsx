/**
 * Rectangle token render tests — Print Studio.
 *
 * Covers:
 *  - SingleToken renders SVG without crash for rectangle shape
 *  - Icon position: left and right
 *  - EN-only / ZH-only / both name display modes
 *  - No corrupt text in any configuration
 *  - Mobile (393px) + desktop (1280px) viewports for TokenOptionsPanel
 *  - TokenOptionsPanel shows rectangle-specific sliders when shape=rectangle
 *  - TokenOptionsPanel hides diameter slider for rectangle shape
 *
 * Static top-level imports used throughout to avoid async import timeout
 * that affects certain catalog-dependent modules in the jsdom test runner.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import {
  setupMobileViewport,
  setupDesktopViewport,
  assertNoCorruptText,
} from '../test/mobileRender'
import { SingleToken } from '../components/PrintStudio/SingleToken'
import { TokenOptionsPanel } from '../components/PrintStudio/TokenOptionsPanel'
import { DEFAULT_TOKEN_OPTIONS } from '../components/PrintStudio/types'
import type { TokenPrintOptions } from '../components/PrintStudio/types'
import { I18nProvider } from '../context/I18nContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

const noop = () => {}

function makeOpts(overrides: Partial<TokenPrintOptions> = {}): TokenPrintOptions {
  return { ...DEFAULT_TOKEN_OPTIONS, shape: 'rectangle', ...overrides }
}

/** Pixels for an 80×30mm card at 96 dpi (3.7795 px/mm). */
const RECT_W = Math.round(80 * 3.7795)  // ~302
const RECT_H = Math.round(30 * 3.7795)  // ~113

function renderToken(overrides: Partial<TokenPrintOptions> = {}, extra: Record<string, unknown> = {}) {
  return render(
    <SingleToken
      nameEn="Imp"
      nameZh="恶魔"
      abilityEn="Each night*, choose a player: they die."
      abilityZh="每个夜晚*，选择一名玩家：他们死亡。"
      opts={makeOpts(overrides)}
      diamPx={113}
      rectWidthPx={RECT_W}
      rectHeightPx={RECT_H}
      {...extra}
    />,
  )
}

// ── Import sanity (static) ────────────────────────────────────────────────────

describe('Rectangle token — import sanity', () => {
  it('SingleToken is a function', () => {
    expect(typeof SingleToken).toBe('function')
  })

  it('TokenOptionsPanel is a function', () => {
    expect(typeof TokenOptionsPanel).toBe('function')
  })
})

// ── SingleToken — rectangle shape ────────────────────────────────────────────

describe('SingleToken — rectangle shape', () => {
  beforeEach(() => setupDesktopViewport())

  it('renders an SVG element', () => {
    const { container } = renderToken()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('SVG has correct width and height attributes', () => {
    const { container } = renderToken()
    const svg = container.querySelector('svg')!
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(RECT_W, -1)
    expect(Number(svg.getAttribute('height'))).toBeCloseTo(RECT_H, -1)
  })

  it('renders no corrupt text', () => {
    const { container } = renderToken()
    assertNoCorruptText(container)
  })

  it('shows EN character name (nameDisplay=en)', () => {
    const { container } = renderToken({ nameDisplay: 'en' })
    expect(container.textContent).toContain('Imp')
  })

  it('shows ZH character name (nameDisplay=zh)', () => {
    const { container } = renderToken({ nameDisplay: 'zh' })
    expect(container.textContent).toContain('恶魔')
  })

  it('shows both names (nameDisplay=both)', () => {
    const { container } = renderToken({ nameDisplay: 'both' })
    expect(container.textContent).toContain('Imp')
    expect(container.textContent).toContain('恶魔')
  })

  it('icon on left — rectIconPosition=left renders without crash', () => {
    const { container } = renderToken({ rectIconPosition: 'left' })
    expect(container.querySelector('svg')).toBeTruthy()
    assertNoCorruptText(container)
  })

  it('icon on right — rectIconPosition=right renders without crash', () => {
    const { container } = renderToken({ rectIconPosition: 'right' })
    expect(container.querySelector('svg')).toBeTruthy()
    assertNoCorruptText(container)
  })

  it('renders with iconSrc provided', () => {
    const { container } = renderToken({}, { iconSrc: '/icons/imp.png' })
    expect(container.querySelector('svg')).toBeTruthy()
    assertNoCorruptText(container)
  })

  it('renders without iconSrc (no image)', () => {
    const { container } = renderToken({}, { iconSrc: undefined })
    expect(container.querySelector('svg')).toBeTruthy()
    assertNoCorruptText(container)
  })

  it('hidden ability (abilityDisplay=hidden) renders without crash', () => {
    const { container } = renderToken({ abilityDisplay: 'hidden' })
    expect(container.querySelector('svg')).toBeTruthy()
    assertNoCorruptText(container)
  })

  it('ZH ability display renders without crash', () => {
    const { container } = renderToken({ abilityDisplay: 'zh' })
    expect(container.textContent).toContain('恶魔')
    assertNoCorruptText(container)
  })

  it('black-and-white mode renders without crash', () => {
    const { container } = renderToken({ blackAndWhite: true })
    expect(container.querySelector('svg')).toBeTruthy()
    assertNoCorruptText(container)
  })

  it('border renders without crash (borderWidth > 0)', () => {
    const { container } = renderToken({ borderWidth: 3, borderColor: '#000000' })
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('overrideLabel substitutes character name', () => {
    const { container } = render(
      <SingleToken
        nameEn="Imp"
        nameZh="恶魔"
        abilityEn="text"
        abilityZh="文字"
        opts={makeOpts()}
        diamPx={113}
        rectWidthPx={RECT_W}
        rectHeightPx={RECT_H}
        overrideLabel="Custom Label"
      />,
    )
    expect(container.textContent).toContain('Custom Label')
  })

  it('small card (40×20mm equivalent) renders', () => {
    const { container } = render(
      <SingleToken
        nameEn="Imp"
        nameZh="恶魔"
        abilityEn="ability"
        abilityZh="能力"
        opts={makeOpts({ rectWidthMm: 40, rectHeightMm: 20 })}
        diamPx={75}
        rectWidthPx={Math.round(40 * 3.7795)}
        rectHeightPx={Math.round(20 * 3.7795)}
      />,
    )
    expect(container.querySelector('svg')).toBeTruthy()
    assertNoCorruptText(container)
  })

  it('large card (150×80mm equivalent) renders', () => {
    const { container } = render(
      <SingleToken
        nameEn="Imp"
        nameZh="恶魔"
        abilityEn="ability"
        abilityZh="能力"
        opts={makeOpts({ rectWidthMm: 150, rectHeightMm: 80 })}
        diamPx={302}
        rectWidthPx={Math.round(150 * 3.7795)}
        rectHeightPx={Math.round(80 * 3.7795)}
      />,
    )
    expect(container.querySelector('svg')).toBeTruthy()
    assertNoCorruptText(container)
  })
})

// ── SingleToken — non-rectangle falls through normally ────────────────────────

describe('SingleToken — non-rectangle shapes still work', () => {
  it('circle shape renders SVG (baseline)', () => {
    const { container } = render(
      <SingleToken
        nameEn="Imp" nameZh="恶魔"
        abilityEn="text" abilityZh="文字"
        opts={{ ...DEFAULT_TOKEN_OPTIONS, shape: 'circle' }}
        diamPx={170}
      />,
    )
    expect(container.querySelector('svg')).toBeTruthy()
  })
})

// ── TokenOptionsPanel — desktop ───────────────────────────────────────────────

describe('TokenOptionsPanel — desktop (1280px)', () => {
  beforeEach(() => setupDesktopViewport())

  it('renders without crash for rectangle shape', () => {
    const { container } = render(
      <I18nProvider language="en">
        <TokenOptionsPanel
          opts={makeOpts()}
          onChange={noop as any}
          language="en"
          scriptCharacters={[]}
        />
      </I18nProvider>,
    )
    assertNoCorruptText(container)
  })

  it('shows width and height sliders for rectangle shape', () => {
    render(
      <I18nProvider language="en">
        <TokenOptionsPanel
          opts={makeOpts()}
          onChange={noop as any}
          language="en"
          scriptCharacters={[]}
        />
      </I18nProvider>,
    )
    expect(screen.getAllByText(/Width/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Height/i).length).toBeGreaterThan(0)
  })

  it('rectangle shape selected in shape toggle', () => {
    render(
      <I18nProvider language="en">
        <TokenOptionsPanel
          opts={makeOpts()}
          onChange={noop as any}
          language="en"
          scriptCharacters={[]}
        />
      </I18nProvider>,
    )
    expect(screen.getByText(/rect/i)).toBeInTheDocument()
  })

  it('circle shape shows diameter slider, not width/height', () => {
    render(
      <I18nProvider language="en">
        <TokenOptionsPanel
          opts={{ ...DEFAULT_TOKEN_OPTIONS, shape: 'circle' }}
          onChange={noop as any}
          language="en"
          scriptCharacters={[]}
        />
      </I18nProvider>,
    )
    expect(screen.getByText(/Diameter/i)).toBeInTheDocument()
    expect(screen.queryByText(/^Width$/i)).toBeNull()
  })

  it('produces no corrupt text', () => {
    const { container } = render(
      <I18nProvider language="en">
        <TokenOptionsPanel
          opts={makeOpts()}
          onChange={noop as any}
          language="en"
          scriptCharacters={[]}
        />
      </I18nProvider>,
    )
    assertNoCorruptText(container)
  })
})

// ── TokenOptionsPanel — mobile ────────────────────────────────────────────────

describe('TokenOptionsPanel — mobile (393px)', () => {
  beforeEach(() => setupMobileViewport())

  it('renders without crash on mobile', () => {
    const { container } = render(
      <I18nProvider language="en">
        <TokenOptionsPanel
          opts={makeOpts()}
          onChange={noop as any}
          language="en"
          scriptCharacters={[]}
        />
      </I18nProvider>,
    )
    assertNoCorruptText(container)
  })

  it('shows rect width/height sliders on mobile', () => {
    render(
      <I18nProvider language="en">
        <TokenOptionsPanel
          opts={makeOpts()}
          onChange={noop as any}
          language="en"
          scriptCharacters={[]}
        />
      </I18nProvider>,
    )
    expect(screen.getAllByText(/Width/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Height/i).length).toBeGreaterThan(0)
  })
})
