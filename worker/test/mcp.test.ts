import { describe, it, expect } from 'vitest'
import app from '../src/index'
import type { Env } from '../src/env'

const env: Env = { APP_URL: 'https://example.test/app/' }
let nextId = 1

async function rpc(method: string, params: Record<string, unknown> = {}) {
  const res = await app.request('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  }, env)
  expect(res.status).toBe(200)
  const body = await res.json() as { result?: any; error?: any }
  if (body.error) throw new Error(JSON.stringify(body.error))
  return body.result
}

const callTool = async (name: string, args: Record<string, unknown>) => {
  const result = await rpc('tools/call', { name, arguments: args })
  const text = result.content[0].text as string
  return { isError: !!result.isError, text, json: result.isError ? undefined : JSON.parse(text) }
}

describe('MCP endpoint', () => {
  it('initializes', async () => {
    const result = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } })
    expect(result.serverInfo.name).toBe('botc-companion')
    expect(result.capabilities).toMatchObject({ tools: {}, resources: {}, prompts: {} })
    expect(result.instructions).toContain('create_script_draft')
  })

  it('lists tools with annotations', async () => {
    const { tools } = await rpc('tools/list')
    const names = tools.map((t: { name: string }) => t.name)
    expect(names).toEqual(expect.arrayContaining(['search_characters', 'get_character', 'get_jinxes', 'get_night_order', 'search_rules', 'list_scripts', 'get_script', 'validate_script', 'analyze_script', 'get_token_manifest', 'create_script_draft']))
    const draft = tools.find((t: { name: string }) => t.name === 'create_script_draft')
    expect(draft.annotations.readOnlyHint).toBe(false)
    expect(draft.inputSchema.required).toEqual(expect.arrayContaining(['name', 'characters']))
  })

  it('runs catalog tools', async () => {
    const search = await callTool('search_characters', { query: '洗衣妇', language: 'en' })
    expect(search.json.items[0]).toMatchObject({ id: 'washerwoman', name: 'Washerwoman' })
    const imp = await callTool('get_character', { id: 'imp', language: 'zh' })
    expect(imp.json.name).toBe('小恶魔')
    const near = await callTool('get_character', { id: 'HighPriestess' })
    expect(near.isError).toBe(true)
    expect(near.text).toContain('high_priestess')
    const rules = await callTool('search_rules', { query: 'drunk poisoned', limit: 2 })
    expect(rules.json).toHaveLength(2)
    expect(rules.json[0]).toEqual(expect.objectContaining({ page: expect.any(String), url: expect.stringContaining('http'), text: expect.any(String) }))
    const order = await callTool('get_night_order', { characters: ['imp', 'poisoner', 'monk'], night: 'other' })
    expect(order.json.map((n: { id: string }) => n.id)).toEqual(['DUSK', 'poisoner', 'monk', 'imp', 'DAWN'])
  })

  it('runs script tools end to end', async () => {
    const scripts = await callTool('list_scripts', {})
    expect(scripts.json.some((s: { slug: string }) => s.slug === 'tb')).toBe(true)
    const analysis = await callTool('analyze_script', { slug: 'tb' })
    expect(analysis.json.analysis.playerCounts.every((p: { dealable: boolean }) => p.dealable)).toBe(true)
    const validation = await callTool('validate_script', { script: JSON.stringify(['imp', 'washerwoman']) })
    expect(validation.json.ok).toBe(true)
    const tokens = await callTool('get_token_manifest', { characters: ['washerwoman', 'imp'] })
    expect(tokens.json.totals.characterTokens).toBe(2)

    const bad = await callTool('create_script_draft', { name: 'Oops', characters: ['imp', 'nobody'] })
    expect(bad.isError).toBe(true)
    expect(bad.text).toContain('"nobody" is not a known character')
    const good = await callTool('create_script_draft', { name: 'Agent Script', characters: ['washerwoman', 'chef', 'poisoner', 'imp'] })
    expect(good.json).toMatchObject({ mode: 'inline' })
    expect(good.json.url).toMatch(/^https:\/\/example\.test\/app\/\?ss=/)
  })

  it('serves resources and prompts', async () => {
    const { resourceTemplates } = await rpc('resources/templates/list')
    expect(resourceTemplates.map((r: { uriTemplate: string }) => r.uriTemplate)).toEqual(expect.arrayContaining(['botc://characters/{id}', 'botc://scripts/{slug}']))
    const read = await rpc('resources/read', { uri: 'botc://characters/imp' })
    expect(JSON.parse(read.contents[0].text).team).toBe('demon')
    const glossary = await rpc('resources/read', { uri: 'botc://glossary' })
    expect(glossary.contents[0].text).toContain('说书人')
    const { prompts } = await rpc('prompts/list')
    expect(prompts.map((p: { name: string }) => p.name)).toEqual(expect.arrayContaining(['design_script', 'design_character', 'translate_ability', 'review_script']))
    const prompt = await rpc('prompts/get', { name: 'review_script', arguments: { slug: 'tb' } })
    expect(prompt.messages[0].content.text).toContain('analyze_script')
  })
})

describe('catalog totals', () => {
  it('pages search results with the true total', async () => {
    const first = await callTool('search_characters', { edition: 'odyssey', limit: 50, language: 'zh' })
    expect(first.json.totalMatches).toBe(119)
    expect(first.json).toMatchObject({ returned: 50, count: 50, offset: 0, nextCursor: '50' })
    const last = await callTool('search_characters', { edition: 'odyssey', limit: 50, cursor: '100', language: 'zh' })
    expect(last.json).toMatchObject({ totalMatches: 119, returned: 19, nextCursor: null })
    const seen = new Set<string>()
    for (let cursor: string | null = '0'; cursor !== null;) {
      const page: any = (await callTool('search_characters', { edition: 'odyssey', limit: 40, cursor })).json
      page.items.forEach((c: { id: string }) => seen.add(c.id))
      cursor = page.nextCursor
    }
    expect(seen.size).toBe(119)
    expect((await callTool('search_characters', { cursor: 'x' })).isError).toBe(true)
  })

  it('lists editions with exact counts', async () => {
    const editions = (await callTool('list_editions', { language: 'zh' })).json
    const odyssey = editions.find((e: { id: string }) => e.id === 'odyssey')
    expect(odyssey.characterCount).toBe(119)
    expect(Object.values(odyssey.teamCounts as Record<string, number>).reduce((a, b) => a + b, 0)).toBe(119)
    expect(editions.find((e: { id: string }) => e.id === 'tb')).toMatchObject({ characterCount: 28, teamCounts: { townsfolk: 13, outsider: 4, minion: 4, demon: 1, traveler: 6 } })
  })
})
