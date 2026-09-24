/**
 * Settings → API & MCP: the API client (tokens, cloud library upload/import)
 * and the section itself. The section only renders when VITE_API_URL is set.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CUSTOM_CHARACTERS_KEY } from '../catalog'
import { STORAGE_KEY, USER_SCRIPTS_KEY } from '../components/StorytellerSub/constants'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))

const API = 'https://api.test'

/** A tiny in-memory stand-in for the worker's /v1/me routes. */
function fakeApi() {
  const docs: Record<string, Map<string, { id: string; data: unknown; updatedAt: number; deleted: boolean }>> = { scripts: new Map(), characters: new Map(), records: new Map() }
  const tokens: Array<{ id: string; name: string; createdAt: number; lastUsedAt: null }> = []
  const calls: string[] = []
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = url.replace(API, '')
    const method = init.method ?? 'GET'
    calls.push(`${method} ${path}`)
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer google-access')
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
    if (path === '/v1/me/tokens' && method === 'GET') return json({ items: tokens })
    if (path === '/v1/me/tokens' && method === 'POST') {
      const token = { id: `t${tokens.length + 1}`, name: JSON.parse(String(init.body)).name, createdAt: 1, lastUsedAt: null }
      tokens.push(token)
      return json({ ...token, token: 'botc_pat_secret' }, 201)
    }
    const m = path.match(/^\/v1\/me\/(scripts|characters|records)(?:\/(.+))?$/)
    if (m) {
      const [, kind, id] = m
      if (method === 'GET') return json({ items: [...docs[kind].values()] })
      if (method === 'PUT') {
        const body = JSON.parse(String(init.body))
        docs[kind].set(decodeURIComponent(id), { id: decodeURIComponent(id), data: body.data, updatedAt: body.updatedAt, deleted: false })
        return json(docs[kind].get(decodeURIComponent(id)))
      }
    }
    return json({ error: { message: 'nope' } }, 404)
  })
  return { docs, tokens, calls, fetchMock }
}

const script = (slug: string) => ({ slug, title: slug, titleZh: slug, author: '', edition: 'custom', characters: ['imp'], meta: { id: '_meta', name: slug }, customCharacters: [], sourceFile: `${slug}.json` })

describe('apiClient', () => {
  let api: ReturnType<typeof fakeApi>

  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
    vi.stubEnv('VITE_API_URL', `${API}/`)
    localStorage.setItem('BOTC_GOOGLE_TOKENS', JSON.stringify({ access_token: 'google-access', refresh_token: 'r', expires_at: Date.now() + 3_600_000 }))
    api = fakeApi()
    vi.stubGlobal('fetch', api.fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('uses VITE_API_URL, the public API when it is empty, and none when it is "off"', async () => {
    const client = await import('../lib/apiClient')
    expect(client.getApiUrl()).toBe(API)
    expect(client.isApiConfigured()).toBe(true)
    vi.stubEnv('VITE_API_URL', '')
    expect(client.getApiUrl()).toBe('https://botc-api.xpandi-top.workers.dev')
    vi.stubEnv('VITE_API_URL', 'off')
    expect(client.isApiConfigured()).toBe(false)
  })

  it('uploads local data and imports only what is missing', async () => {
    localStorage.setItem(USER_SCRIPTS_KEY, JSON.stringify([script('mine')]))
    localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify([{ id: 'custom_a', nameEn: 'A', abilityEn: 'x', team: 'townsfolk', author: 'me', edition: 'Custom', createdAt: 1, updatedAt: 5 }]))
    const client = await import('../lib/apiClient')

    expect(await client.uploadLibrary(1000)).toEqual({ scripts: 1, characters: 1, records: 0 })
    expect(api.calls).toEqual(['PUT /v1/me/scripts/mine', 'PUT /v1/me/characters/custom_a'])

    // Something saved in the cloud by an agent / another device
    api.docs.scripts.set('agent', { id: 'agent', data: script('agent'), updatedAt: 2000, deleted: false })
    api.docs.scripts.set('gone', { id: 'gone', data: null, updatedAt: 2000, deleted: true })
    api.docs.records.set('r1', { id: 'r1', data: { id: 'r1', endedAt: 1, days: [] }, updatedAt: 2000, deleted: false })

    expect(await client.importLibrary()).toEqual({ scripts: 1, characters: 0, records: 1 })
    const scripts = JSON.parse(localStorage.getItem(USER_SCRIPTS_KEY)!)
    expect(scripts.map((s: { slug: string }) => s.slug)).toEqual(['mine', 'agent'])
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(state.gameRecords.map((r: { id: string }) => r.id)).toEqual(['r1'])
    expect(state.days.length).toBeGreaterThan(0) // a complete storyteller state was written

    // importing again adds nothing
    expect(await client.importLibrary()).toEqual({ scripts: 0, characters: 0, records: 0 })
  })

  it('creates and lists tokens', async () => {
    const client = await import('../lib/apiClient')
    expect((await client.createToken('Claude')).token).toBe('botc_pat_secret')
    expect(await client.listTokens()).toEqual([expect.objectContaining({ name: 'Claude' })])
  })

  it('reports API errors and missing sign-in', async () => {
    const client = await import('../lib/apiClient')
    await expect(client.revokeToken('x')).rejects.toThrow('nope')
    localStorage.removeItem('BOTC_GOOGLE_TOKENS')
    await expect(client.listTokens()).rejects.toThrow('Not signed in')
  })

  it('renders the settings section and creates a token', async () => {
    const { ApiAccessSection } = await import('../components/settings/ApiAccessSection')
    const { I18nProvider } = await import('../context/I18nContext')
    const cloud = { connected: true } as Parameters<typeof ApiAccessSection>[0]['cloud']
    render(<I18nProvider language="en"><ApiAccessSection cloud={cloud} language="en" /></I18nProvider>)
    expect(screen.getByDisplayValue(`${API}/mcp`)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('No active tokens.')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Token name'), { target: { value: 'Claude' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create token' }))
    await waitFor(() => expect(screen.getByDisplayValue('botc_pat_secret')).toBeInTheDocument())
    expect(screen.getByText('Claude')).toBeInTheDocument()
  }, 15_000) // renders the full settings section; slow under a loaded parallel run

  it('asks to connect Google first', async () => {
    const { ApiAccessSection } = await import('../components/settings/ApiAccessSection')
    const { I18nProvider } = await import('../context/I18nContext')
    const cloud = { connected: false } as Parameters<typeof ApiAccessSection>[0]['cloud']
    render(<I18nProvider language="zh"><ApiAccessSection cloud={cloud} language="zh" /></I18nProvider>)
    expect(screen.getByText('请先在上方连接 Google Drive 同步，才能管理访问令牌和云端库。')).toBeInTheDocument()
    expect(api.fetchMock).not.toHaveBeenCalled()
  })
})
