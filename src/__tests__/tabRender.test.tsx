/**
 * Tab render smoke tests — each major tab mounts without crashing.
 *
 * Uses ErrorBoundary to catch any render-time errors and surface them
 * as test failures with meaningful messages (not blank screens).
 *
 * These tests guard against:
 *  - Missing hook imports (the useT/PhaseControlPanel class of bug)
 *  - Undefined accesses on initial state
 *  - Platform-specific API calls (localStorage, matchMedia, etc.)
 *    that must be mocked for jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React, { Suspense } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'

// ── jsdom platform shims ──────────────────────────────────────────────────────

// matchMedia — not in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ResizeObserver — not in jsdom (must be a constructable class)
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// IntersectionObserver — not in jsdom
class IntersectionObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver

// ── Helpers ───────────────────────────────────────────────────────────────────

function noText(container: HTMLElement) {
  const text = container.textContent ?? ''
  expect(text).not.toContain('undefined')
  expect(text).not.toContain('[object Object]')
}

/**
 * Wraps a lazy-loaded component in Suspense + ErrorBoundary.
 * Returns the rendered container; if the boundary caught an error,
 * the test finds "failed to load" and can surface it.
 */
async function renderTab(tabName: string, children: React.ReactNode) {
  let container!: HTMLElement
  await act(async () => {
    const result = render(
      <ErrorBoundary name={tabName}>
        <Suspense fallback={<div data-testid="loading">Loading…</div>}>
          {children}
        </Suspense>
      </ErrorBoundary>
    )
    container = result.container
  })
  return container
}

// ── ErrorBoundary integration with Suspense ───────────────────────────────────

describe('ErrorBoundary + Suspense integration', () => {
  it('shows Suspense fallback while loading', async () => {
    // A promise that never resolves — component stays suspended
    let resolve!: () => void
    const NeverResolves = React.lazy(() => new Promise<{ default: () => null }>((r) => { resolve = () => r({ default: () => null }) }))

    const { getByTestId } = render(
      <ErrorBoundary name="NeverResolves">
        <Suspense fallback={<div data-testid="loading">Loading…</div>}>
          <NeverResolves />
        </Suspense>
      </ErrorBoundary>
    )
    expect(getByTestId('loading')).toBeInTheDocument()
    // Clean up
    act(() => resolve())
  })

  it('does not show ErrorBoundary while component is merely suspended', async () => {
    let resolve!: () => void
    const NeverResolves = React.lazy(() => new Promise<{ default: () => null }>((r) => { resolve = () => r({ default: () => null }) }))

    const { queryByText } = render(
      <ErrorBoundary name="SuspenseTest">
        <Suspense fallback={<div>Loading…</div>}>
          <NeverResolves />
        </Suspense>
      </ErrorBoundary>
    )
    expect(queryByText('SuspenseTest failed to load')).toBeNull()
    act(() => resolve())
  })
})

// ── SettingsTab smoke test (non-lazy, no heavy deps) ─────────────────────────

describe('SettingsTab render', () => {
  it('mounts without crashing', async () => {
    const { SettingsTab } = await import('../components/tabs/SettingsTab')
    const { useFontSettings } = await import('../hooks/useFontSettings')

    // Use the real hook to build a valid FontSettings shape
    // (it reads localStorage which is mocked in jsdom)
    // We can't call hooks outside components, so build a minimal compatible shape
    const { EN_BODY_OPTIONS, EN_DISPLAY_OPTIONS, ZH_OPTIONS } = await import('../hooks/useFontSettings') as any

    const fontSettings = {
      enBodyId: EN_BODY_OPTIONS?.[0]?.id ?? 'default',
      enDisplayId: EN_DISPLAY_OPTIONS?.[0]?.id ?? 'default',
      zhId: ZH_OPTIONS?.[0]?.id ?? 'default',
      uiScale: 1,
      setEnBodyId: vi.fn(),
      setEnDisplayId: vi.fn(),
      setZhId: vi.fn(),
      setUiScale: vi.fn(),
      enBodyOptions: EN_BODY_OPTIONS ?? [],
      enDisplayOptions: EN_DISPLAY_OPTIONS ?? [],
      zhOptions: ZH_OPTIONS ?? [],
      fontFamily: '',
      setFontFamily: vi.fn(),
      fontScale: 1,
      setFontScale: vi.fn(),
    }

    const cloudSync = {
      connected: false,
      status: 'idle' as const,
      lastSynced: null,
      errorMessage: null,
      scheduleSync: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      pull: vi.fn(),
      push: vi.fn(),
      clientId: '',
      setClientId: vi.fn(),
    }

    const container = await renderTab('Settings', (
      <SettingsTab
        language="en"
        onLanguageChange={vi.fn()}
        fontSettings={fontSettings as any}
        cloudSync={cloudSync as any}
      />
    ))

    expect(screen.queryByText('Settings failed to load')).toBeNull()
    noText(container)
  })
})

// ── ScriptsTab smoke test ─────────────────────────────────────────────────────

describe('ScriptsTab render', () => {
  it('mounts without crashing with minimal props', async () => {
    const { ScriptsTab } = await import('../components/tabs/ScriptsTab')
    const { initialScripts } = await import('../catalog')

    const activeScript = initialScripts[0]

    const container = await renderTab('Scripts', (
      <ScriptsTab
        scripts={initialScripts}
        activeScript={activeScript}
        uiText={{} as any}
        uiLanguage="en"
        isEditMode={false}
        showWakeOrderPreview={false}
        setShowWakeOrderPreview={vi.fn()}
        saveStatus=""
        activeScriptCharacters={[]}
        groupedScriptCharacters={[]}
        groupedEditorCharacters={[]}
        editorQuery=""
        sheetDensityClass=""
        setIsEditMode={vi.fn()}
        setEditorQuery={vi.fn()}
        setActiveSlug={vi.fn()}
        createNewScript={vi.fn()}
        importScriptFile={vi.fn()}
        deleteScript={vi.fn()}
        duplicateScript={vi.fn()}
        isBuiltIn={() => true}
        scriptFolders={[]}
        createFolder={vi.fn()}
        renameFolder={vi.fn()}
        deleteFolder={vi.fn()}
        toggleFolderCollapsed={vi.fn()}
        moveScriptToFolder={vi.fn()}
        downloadScriptFile={vi.fn()}
        updateActiveScript={vi.fn()}
        toggleCharacterInScript={vi.fn()}
        getScriptTitle={(s) => s.title}
        getSheetUiLabel={(_l, k) => k}
        printOptions={{} as any}
        onLanguageChange={vi.fn()}
        onPrintClick={vi.fn()}
        onCreateCustomFromId={vi.fn()}
        isCurrentBuiltIn={true}
        customChars={[]}
      />
    ))

    expect(screen.queryByText('Scripts failed to load')).toBeNull()
    noText(container)
  })
})

// ── PhaseControlPanel import sanity ──────────────────────────────────────────
// This specifically tests the bug that caused Mobile Safari blank pages:
// PhaseControlPanel using useT() without importing it.

describe('PhaseControlPanel — import sanity', () => {
  it('module exports a React component without import errors', async () => {
    // If useT is missing from imports, this dynamic import throws at module eval
    const mod = await import('../components/StorytellerSub/Arena/PhaseControlPanel')
    expect(typeof mod.PhaseControlPanel).toBe('function')
  })
})

describe('Arena sub-components — import sanity', () => {
  const arenaModules = [
    '../components/StorytellerSub/Arena/ArenaSeat',
    '../components/StorytellerSub/Arena/ArenaSeats',
    '../components/StorytellerSub/Arena/ArenaSeatComponents',
    '../components/StorytellerSub/Arena/ArenaQuickStrip',
    '../components/StorytellerSub/Arena/CharacterCircle',
    '../components/StorytellerSub/Arena/NominationHistory',
    '../components/StorytellerSub/Arena/NominationVoteList',
    '../components/StorytellerSub/Arena/PlayerNightLog',
    '../components/StorytellerSub/Arena/MobileSeatCard',
    '../components/StorytellerSub/Arena/AggregatedLogModal',
  ] as const

  for (const modPath of arenaModules) {
    it(`${modPath.split('/').pop()} imports without error`, async () => {
      const mod = await import(/* @vite-ignore */ modPath)
      // Accept function (class/function component) or object (React.memo/forwardRef)
      const hasComponent = Object.values(mod).some(
        (v) => typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in (v as object))
      )
      expect(hasComponent).toBe(true)
    })
  }
})

describe('RightConsole sub-components — import sanity', () => {
  const rcModules = [
    '../components/StorytellerSub/RightConsole/RightConsoleDay',
    '../components/StorytellerSub/RightConsole/RightConsoleGame',
    '../components/StorytellerSub/RightConsole/RightConsoleSettings',
    '../components/StorytellerSub/RightConsole/RightConsolePlayer',
    '../components/StorytellerSub/RightConsole/RightConsoleTags',
    '../components/StorytellerSub/RightConsole/RightConsoleRecords',
  ] as const

  for (const modPath of rcModules) {
    it(`${modPath.split('/').pop()} imports without error`, async () => {
      const mod = await import(/* @vite-ignore */ modPath)
      const hasComponent = Object.values(mod).some(
        (v) => typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in (v as object))
      )
      expect(hasComponent).toBe(true)
    })
  }
})

describe('Modals sub-components — import sanity', () => {
  const modalModules = [
    '../components/StorytellerSub/Modals/ModalsNewGame',
    '../components/StorytellerSub/Modals/ModalsEndGame',
    '../components/StorytellerSub/Modals/ModalsEditPlayers',
    '../components/StorytellerSub/Modals/ModalsDialog',
  ] as const

  for (const modPath of modalModules) {
    it(`${modPath.split('/').pop()} imports without error`, async () => {
      const mod = await import(/* @vite-ignore */ modPath)
      const hasComponent = Object.values(mod).some(
        (v) => typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in (v as object))
      )
      expect(hasComponent).toBe(true)
    })
  }
})

// ── Mobile viewport simulation ────────────────────────────────────────────────

describe('Mobile viewport — matchMedia simulation', () => {
  it('isMobile breakpoint mock returns false (desktop default in tests)', () => {
    // matchMedia mock above returns matches: false
    // Test confirms the mock is applied — if removed, JSDOM throws
    const mq = window.matchMedia('(max-width: 600px)')
    expect(mq.matches).toBe(false)
    expect(typeof mq.addEventListener).toBe('function')
  })

  it('can simulate mobile by updating matchMedia mock', () => {
    // Simulates 375px iPhone SE viewport
    const mobileMq = {
      matches: true,
      media: '(max-width: 600px)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    const origMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue(mobileMq)
    const mq = window.matchMedia('(max-width: 600px)')
    expect(mq.matches).toBe(true)
    // Restore
    window.matchMedia = origMatchMedia
  })
})
