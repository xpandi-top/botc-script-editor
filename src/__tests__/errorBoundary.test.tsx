/**
 * ErrorBoundary tests — verifies crash recovery UI works correctly
 * and that components display an error message instead of a blank page.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Component that throws on render */
function BombComponent({ message }: { message?: string }) {
  throw new Error(message ?? 'Test error')
}

/** Component that renders normally */
function SafeComponent() {
  return <div>Safe content rendered</div>
}

/** Component that conditionally throws */
function ConditionalBomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Conditional error')
  return <div>No crash</div>
}

// Silence React's expected error output in tests
let consoleError: typeof console.error
beforeEach(() => {
  consoleError = console.error
  console.error = vi.fn()
})
afterEach(() => {
  console.error = consoleError
})

// ── Core boundary behavior ────────────────────────────────────────────────────

describe('ErrorBoundary — renders children normally', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary name="Test">
        <SafeComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Safe content rendered')).toBeInTheDocument()
  })

  it('does NOT show error UI when no error', () => {
    render(
      <ErrorBoundary name="Test">
        <SafeComponent />
      </ErrorBoundary>
    )
    expect(screen.queryByText(/failed to load/i)).toBeNull()
  })
})

describe('ErrorBoundary — catches thrown error', () => {
  it('shows error heading with component name', () => {
    render(
      <ErrorBoundary name="Storyteller">
        <BombComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Storyteller failed to load')).toBeInTheDocument()
  })

  it('shows the error message text', () => {
    render(
      <ErrorBoundary name="Test">
        <BombComponent message="Something went very wrong" />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went very wrong')).toBeInTheDocument()
  })

  it('uses default name when name prop omitted', () => {
    render(
      <ErrorBoundary>
        <BombComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('This section failed to load')).toBeInTheDocument()
  })

  it('renders Retry button', () => {
    render(
      <ErrorBoundary name="Test">
        <BombComponent />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('does NOT render children content when crashed', () => {
    render(
      <ErrorBoundary name="Test">
        <BombComponent message="crash" />
        <div>This should not appear</div>
      </ErrorBoundary>
    )
    expect(screen.queryByText('This should not appear')).toBeNull()
  })
})

describe('ErrorBoundary — retry resets error state', () => {
  it('shows Retry button and boundary re-mounts children on click', () => {
    // AlwaysBomb — always throws so we can control via a ref flag
    let shouldFail = true

    function MaybeThrow() {
      if (shouldFail) throw new Error('controlled error')
      return <div>Recovered</div>
    }

    render(
      <ErrorBoundary name="Toggle">
        <MaybeThrow />
      </ErrorBoundary>
    )

    // Should show error UI with Retry
    expect(screen.getByText('Toggle failed to load')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /retry/i })
    expect(retryBtn).toBeInTheDocument()

    // Stop throwing, click retry
    shouldFail = false
    fireEvent.click(retryBtn)

    // Boundary cleared — child renders successfully
    expect(screen.getByText('Recovered')).toBeInTheDocument()
    expect(screen.queryByText('Toggle failed to load')).toBeNull()
  })
})

describe('ErrorBoundary — custom fallback', () => {
  it('renders custom fallback instead of default error UI', () => {
    render(
      <ErrorBoundary name="Test" fallback={<div>Custom fallback</div>}>
        <BombComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
    expect(screen.queryByText(/failed to load/i)).toBeNull()
  })
})

describe('ErrorBoundary — nested boundaries', () => {
  it('inner boundary catches its own error, outer stays healthy', () => {
    render(
      <ErrorBoundary name="Outer">
        <div>Outer content</div>
        <ErrorBoundary name="Inner">
          <BombComponent message="inner crash" />
        </ErrorBoundary>
      </ErrorBoundary>
    )
    expect(screen.getByText('Outer content')).toBeInTheDocument()
    expect(screen.getByText('Inner failed to load')).toBeInTheDocument()
    expect(screen.queryByText('Outer failed to load')).toBeNull()
  })

  it('error propagates to outer if inner boundary is absent', () => {
    render(
      <ErrorBoundary name="Outer">
        <BombComponent message="no inner boundary" />
      </ErrorBoundary>
    )
    expect(screen.getByText('Outer failed to load')).toBeInTheDocument()
  })
})

describe('ErrorBoundary — no corrupt output', () => {
  it('error UI contains no undefined/null/object text', () => {
    const { container } = render(
      <ErrorBoundary name="Analytics">
        <BombComponent message="TypeError: cannot read undefined" />
      </ErrorBoundary>
    )
    const text = container.textContent ?? ''
    expect(text).not.toContain('[object Object]')
    expect(text).not.toMatch(/^\s*null\s*$/)
    expect(text).toContain('Analytics failed to load')
    expect(text).toContain('TypeError: cannot read undefined')
  })
})
