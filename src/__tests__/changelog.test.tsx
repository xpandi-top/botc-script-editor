import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { I18nProvider } from '../context/I18nContext'
import { ThemeModeProvider } from '../context/ThemeMode'
import { TUTORIAL_KEY } from '../components/Tutorial/tutorialSteps'
import { CHANGELOG_SEEN_KEY, getLatestChangelogReleaseId, parseChangelog } from '../lib/changelog'
import { ChangelogPage } from '../components/ChangelogPage'
// @ts-ignore — Vite ?raw import
import raw from '../../docs/CHANGELOG.md?raw'
import type React from 'react'

vi.mock('../hooks/useCloudSync', () => ({
  useCloudSync: () => ({
    connected: false,
    status: 'idle',
    lastSynced: null,
    errorMessage: null,
    scheduleSync: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    pull: vi.fn(),
    push: vi.fn(),
  }),
}))

vi.mock('../hooks/useShareParam', () => ({
  useShareParam: () => ({
    activeTab: 'scripts',
    setActiveTab: vi.fn(),
    sharedAnalyticsRecords: null,
    shareDecodeError: null,
    clearSharedRecords: vi.fn(),
    dealSessionId: null,
    initialScriptSlug: null,
    sharedScript: null,
    sharedScriptError: null,
    clearSharedScript: vi.fn(),
    scriptLinkPending: false,
  }),
  updateUrlParams: vi.fn(),
}))

vi.mock('../components/tabs/ScriptsTab', () => ({
  ScriptsTab: () => <div>Scripts ready</div>,
}))

vi.mock('../components/tabs/SettingsTab', () => ({
  SettingsTab: () => <div>Settings ready</div>,
}))

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

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
window.scrollTo = vi.fn()

function renderChangelog() {
  return render(
    <I18nProvider language="en">
      <ChangelogPage onClose={vi.fn()} language="en" />
    </I18nProvider>,
  )
}

function renderApp(node: React.ReactNode) {
  return render(<ThemeModeProvider>{node}</ThemeModeProvider>)
}

describe('changelog helpers', () => {
  it('extracts dated releases in descending document order', () => {
    const parsed = parseChangelog(raw as string)
    expect(parsed.releases.length).toBeGreaterThan(3)
    expect(parsed.releases[0].date).toBe('2026-08-30')
    expect(parsed.releases[0].title).toContain('Odyssey Character Pack')
    expect(parsed.releases[1].date).toBe('2026-05-30')
  })

  it('uses the first release heading as the latest release id', () => {
    const first = '## 2030-01-01 — Future\n\n### Added\n- A\n\n## 2029-01-01\n- B'
    const second = '## 2030-02-01 — Newer\n\n### Added\n- A\n\n## 2030-01-01 — Future\n- B'
    expect(getLatestChangelogReleaseId(first)).not.toBe(getLatestChangelogReleaseId(second))
    expect(getLatestChangelogReleaseId(second)).toBe('2030-02-01 — newer')
  })

  it('keeps category and bullet lines in the matching release', () => {
    const parsed = parseChangelog('## 2026-01-01 — One\n\n### Added\n- **Feature** — detail\n\n## 2025-01-01\n- Old')
    expect(parsed.releases[0].lines).toContain('### Added')
    expect(parsed.releases[0].lines).toContain('- **Feature** — detail')
    expect(parsed.releases[1].lines).toContain('- Old')
  })
})

describe('ChangelogPage', () => {
  it('renders the latest release expanded and older releases collapsed', () => {
    renderChangelog()
    expect(screen.getByRole('button', { name: /2026-08-30.*Odyssey Character Pack/s })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/119 custom characters imported/i)).toBeInTheDocument()

    const older = screen.getByRole('button', { name: /^2026-05-28.*Communication Board/s })
    expect(older).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/new fullscreen dialog accessible/i)).not.toBeInTheDocument()
  })

  it('expands and collapses a release date when clicked', () => {
    renderChangelog()
    const older = screen.getByRole('button', { name: /^2026-05-28.*Communication Board/s })
    fireEvent.click(older)
    expect(older).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/new fullscreen dialog accessible/i)).toBeInTheDocument()
    fireEvent.click(older)
    expect(older).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('header changelog notification', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(TUTORIAL_KEY, '1')
    localStorage.setItem('botc-ui-language', 'en')
  })

  it('shows New until the latest changelog has been opened', async () => {
    const { default: App } = await import('../App')
    renderApp(<App />)

    const button = await screen.findByRole('button', { name: 'View changelog' })
    expect(button).toHaveTextContent('New')
    fireEvent.click(button)

    expect(localStorage.getItem(CHANGELOG_SEEN_KEY)).toBe(getLatestChangelogReleaseId(raw as string))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'View changelog' })).not.toBeInTheDocument())
    expect(screen.getAllByText('Changelog').length).toBeGreaterThan(0)
  })

  it('does not show New when the latest release is already seen', async () => {
    localStorage.setItem(CHANGELOG_SEEN_KEY, getLatestChangelogReleaseId(raw as string) ?? '')
    const { default: App } = await import('../App')
    renderApp(<App />)

    expect(screen.queryByRole('button', { name: 'View changelog' })).not.toBeInTheDocument()
  })
})
