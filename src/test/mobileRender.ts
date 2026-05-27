/**
 * Mobile-aware render helpers for Vitest + jsdom.
 *
 * jsdom has no real layout engine, so breakpoint hooks driven by
 * window.matchMedia always return false unless we mock them.
 *
 * Usage:
 *   import { setupMobileViewport, renderMobile, renderDesktop } from '../test/mobileRender'
 *
 *   beforeEach(() => setupMobileViewport())  // 393px — isMobile = true
 *   // or
 *   beforeEach(() => setupDesktopViewport()) // 1280px — isDesktop = true
 *
 *   renderMobile(<MyComponent />)  // convenience: setup + render
 *   renderDesktop(<MyComponent />) // convenience: setup + render
 *
 * How breakpoints map to matchMedia queries (MUI defaults):
 *   isMobile  = matches '(max-width:599.95px)'
 *   isTablet  = matches '(min-width:600px) and (max-width:1199.95px)'
 *   isDesktop = matches '(min-width:1200px)'
 */

import { vi } from 'vitest'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import React from 'react'

// ── matchMedia mock factory ───────────────────────────────────────────────────

/**
 * Returns true if a CSS media query matches given a viewport width.
 * Handles: max-width, min-width, and combinations (and).
 */
function queryMatches(query: string, width: number): boolean {
  // Normalise whitespace
  const q = query.toLowerCase().replace(/\s+/g, ' ').trim()

  // Split 'and' clauses
  const clauses = q.split(' and ')

  return clauses.every((clause) => {
    const maxW = clause.match(/max-width:\s*([\d.]+)px/)
    const minW = clause.match(/min-width:\s*([\d.]+)px/)
    if (maxW) return width <= parseFloat(maxW[1])
    if (minW) return width >= parseFloat(minW[1])
    // Unrecognised clause — don't block
    return true
  })
}

function makeMatchMedia(viewportWidth: number) {
  return vi.fn().mockImplementation((query: string) => {
    const matches = queryMatches(query, viewportWidth)
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
  })
}

// ── Standard shims needed for jsdom ──────────────────────────────────────────

function installCommonShims() {
  if (!global.ResizeObserver) {
    class ResizeObserverMock {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
  }
  if (!global.IntersectionObserver) {
    class IntersectionObserverMock {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver
  }
}

// ── Viewport setup helpers ────────────────────────────────────────────────────

/** Simulate a 393px mobile screen (e.g. Android Pixel 7 / iPhone 14). */
export function setupMobileViewport(width = 393) {
  installCommonShims()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: makeMatchMedia(width),
  })
  // Set innerWidth so any code using window.innerWidth also sees mobile
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

/** Simulate a 1280px desktop screen. */
export function setupDesktopViewport(width = 1280) {
  installCommonShims()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: makeMatchMedia(width),
  })
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

/** Simulate an arbitrary viewport width. */
export function setupViewport(width: number) {
  installCommonShims()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: makeMatchMedia(width),
  })
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

// ── Convenience render wrappers ───────────────────────────────────────────────

/**
 * Set up 393px mobile viewport then render component.
 * Returns the same result as @testing-library/react render().
 */
export function renderMobile(
  ui: React.ReactElement,
  options?: RenderOptions,
): RenderResult {
  setupMobileViewport()
  return render(ui, options)
}

/**
 * Set up 1280px desktop viewport then render component.
 */
export function renderDesktop(
  ui: React.ReactElement,
  options?: RenderOptions,
): RenderResult {
  setupDesktopViewport()
  return render(ui, options)
}

// ── Assertion helpers ─────────────────────────────────────────────────────────

/**
 * Assert element has no overflow-inducing inline style.
 * Useful for checking that a component doesn't set width > viewport.
 */
export function assertNoHorizontalOverflow(container: HTMLElement, viewportWidth = 393) {
  const allElements = container.querySelectorAll('[style]')
  allElements.forEach((el) => {
    const w = (el as HTMLElement).style?.width
    if (w && w.endsWith('px')) {
      const px = parseFloat(w)
      if (px > viewportWidth) {
        throw new Error(`Element ${el.tagName} has width:${w} > viewport ${viewportWidth}px`)
      }
    }
  })
}

/**
 * Verify container text has no corruption artifacts.
 */
export function assertNoCorruptText(container: HTMLElement) {
  const text = container.textContent ?? ''
  if (text.includes('undefined')) throw new Error('Text contains "undefined"')
  if (text.includes('[object Object]')) throw new Error('Text contains "[object Object]"')
  if (/^null$/.test(text.trim())) throw new Error('Text is literal "null"')
}
