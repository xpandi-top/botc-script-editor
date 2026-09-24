#!/usr/bin/env node
/**
 * Smoke test for a running BOTC API worker: the REST API with plain fetch and
 * the MCP server through the official MCP client (the same protocol Claude,
 * Cursor and other agents use).
 *
 *   cd worker && npm run smoke                          # production worker
 *   npm run smoke -- --url http://localhost:8787        # local `npm run dev`
 *   npm run smoke -- --no-games                         # skip creating a throwaway cloud game
 *   npm run smoke -- --chat                             # also send one hosted-AI chat (uses 1 of today's requests)
 *   npm run smoke -- --no-ai                            # skip the hosted-AI checks
 *   BOTC_TOKEN=botc_pat_… npm run smoke                 # also check the signed-in cloud library
 *
 * Read-only apart from the throwaway game (and nothing is written to the
 * library). The AI checks refresh the character embeddings if the deployed
 * catalog changed, then require none to be stale. Exits 1 if any check fails.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const args = process.argv.slice(2)
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const base = (flag('--url') ?? process.env.BOTC_API_URL ?? 'https://botc-api.xpandi-top.workers.dev').replace(/\/+$/, '')
const token = process.env.BOTC_TOKEN
const withGames = !args.includes('--no-games')
const withAi = !args.includes('--no-ai')
const withChat = args.includes('--chat')

let failures = 0
let passed = 0
let skipped = 0

class Skip extends Error {}

async function check(name, run) {
  try {
    const detail = await run()
    passed++
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`)
  } catch (e) {
    if (e instanceof Skip) {
      skipped++
      console.log(`  – ${name} — skipped: ${e.message}`)
      return
    }
    failures++
    console.log(`  ✗ ${name} — ${e instanceof Error ? e.message : e}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function http(method, path, body, headers = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { /* not JSON */ }
  return { status: res.status, json, text }
}

async function connect(headers) {
  const client = new Client({ name: 'botc-smoke', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: headers ?? {} } }))
  return client
}

/** Call a tool and parse its JSON text result; throws on tool errors. */
async function tool(client, name, args) {
  const result = await client.callTool({ name, arguments: args })
  const text = result.content?.[0]?.text ?? ''
  if (result.isError) throw new Error(`${name} failed: ${text}`)
  return JSON.parse(text)
}

console.log(`BOTC API smoke test → ${base}\n`)

console.log('REST')
await check('service info', async () => {
  const { status, json } = await http('GET', '/')
  assert(status === 200 && json?.mcp === `${base}/mcp`, `unexpected ${status} ${JSON.stringify(json)}`)
  return `app ${json.app}`
})
await check('health', async () => {
  const { json } = await http('GET', '/v1/health')
  assert(json?.ok && json.characters > 300, JSON.stringify(json))
  return `${json.characters} characters`
})
await check('character search (zh)', async () => {
  const { json } = await http('GET', '/v1/characters?q=washerwoman&lang=zh&limit=1')
  assert(json?.items?.[0]?.name === '洗衣妇', JSON.stringify(json))
  return json.items[0].name
})
await check('bundled script', async () => {
  const { json } = await http('GET', '/v1/scripts/tb?lang=en')
  assert(json?.characters?.length === 22, `got ${json?.characters?.length}`)
  return `${json.title}, ${json.characters.length} characters`
})
await check('script validation', async () => {
  const { json } = await http('POST', '/v1/scripts/validate', { script: ['imp', 'highpriestess', 'washerwoman'] })
  const issue = json?.issues?.find((i) => i.code === 'unknown_character')
  assert(json?.ok === false && issue?.suggestion === 'high_priestess', JSON.stringify(json))
  return 'unknown id caught, suggests high_priestess'
})
await check('script analysis', async () => {
  const { json } = await http('POST', '/v1/scripts/analyze', { slug: 'tb' })
  assert(json?.analysis?.teamCounts?.townsfolk === 13, JSON.stringify(json?.analysis?.teamCounts))
  return `dealable for ${json.analysis.playerCounts.filter((p) => p.dealable).length}/11 player counts`
})
await check('script draft link', async () => {
  const { status, json } = await http('POST', '/v1/scripts/drafts', { name: 'Smoke Test', characters: ['washerwoman', 'chef', 'poisoner', 'imp'] })
  assert(status === 201 && json?.url?.includes('?ss='), `${status} ${JSON.stringify(json)}`)
  return `${json.mode} link to ${new URL(json.url).origin}${new URL(json.url).pathname}`
})
await check('OpenAPI + llms.txt', async () => {
  const [openapi, llms] = await Promise.all([http('GET', '/openapi.json'), http('GET', '/llms.txt')])
  assert(openapi.json?.openapi?.startsWith('3.') && llms.text.includes('/mcp'), 'missing docs')
  return `${Object.keys(openapi.json.paths).length} documented paths`
})
await check('cloud library requires sign-in', async () => {
  const { status } = await http('GET', '/v1/me')
  assert(status === 401, `expected 401, got ${status}`)
  return '401 without a token'
})

let aiEnabled = false
if (withAi) {
  console.log('\nHosted AI')
  await check('status', async () => {
    const { status, json } = await http('GET', '/v1/ai/status')
    if (status === 404) throw new Skip('this deployment has no /v1/ai routes yet')
    assert(status === 200, `${status} ${JSON.stringify(json)}`)
    if (!json.chat?.available) throw new Skip('no Workers AI binding')
    aiEnabled = true
    const limits = json.chat.dailyLimits
    const used = json.chat.usedToday ?? { requests: 0, neurons: 0 }
    return `${json.chat.model}; today ${used.requests}/${limits.global ?? '∞'} requests, ${used.neurons}/${limits.neurons ?? '∞'} neurons; ${limits.perIp ?? '∞'} per IP / ${limits.perUser ?? '∞'} per user`
  })
  if (aiEnabled) {
    await check('semantic search (zh)', async () => {
      const q = encodeURIComponent('每晚选择一名玩家，他死亡')
      const { status, json } = await http('GET', `/v1/characters/similar?q=${q}&team=demon&limit=3&lang=zh`)
      assert(status === 200 && json.items?.length === 3 && json.items.every((c) => c.team === 'demon'), `${status} ${JSON.stringify(json).slice(0, 300)}`)
      return json.items.map((c) => `${c.name} ${c.score}`).join(', ')
    })
    await check('embeddings match the deployed catalog', async () => {
      const { json } = await http('GET', '/v1/ai/status')
      const e = json.embeddings
      assert(e?.available && e.stale === 0 && e.embedded === e.total, JSON.stringify(e))
      return `${e.embedded}/${e.total} characters (${e.model})`
    })
    if (withChat) {
      await check('chat with MCP tools', async () => {
        const { status, json } = await http('POST', '/v1/ai/chat', { messages: [{ role: 'user', content: 'What is the exact ability text of the Imp? Look it up.' }] })
        assert(status === 200 && json.text?.length > 0, `${status} ${JSON.stringify(json).slice(0, 300)}`)
        return `${json.steps.map((st) => st.tool).join(' → ') || 'no tools'}; ${json.usage?.promptTokens ?? '?'} prompt tokens, ${json.usage?.neurons ?? '?'} neurons; ${json.remaining ?? '∞'} requests left today`
      })
    }
  }
}

console.log('\nMCP (official client, Streamable HTTP)')
let client
await check('connect', async () => {
  client = await connect()
  const info = client.getServerVersion()
  assert(info?.name === 'botc-companion', JSON.stringify(info))
  return `${info.name} ${info.version}`
})
if (client) {
  await check('tools/list', async () => {
    const { tools } = await client.listTools()
    const names = tools.map((t) => t.name)
    for (const expected of ['search_characters', 'validate_script', 'create_script_draft', 'create_game', 'suggest_night_info', ...(aiEnabled ? ['find_similar_characters'] : [])]) {
      assert(names.includes(expected), `missing ${expected}`)
    }
    return `${tools.length} tools`
  })
  await check('search_characters', async () => {
    const result = await tool(client, 'search_characters', { query: 'imp', language: 'en', limit: 3 })
    assert(result.items?.[0]?.id === 'imp', JSON.stringify(result))
    return result.items[0].ability.slice(0, 60) + '…'
  })
  await check('validate_script', async () => {
    const result = await tool(client, 'validate_script', { slug: 'tb' })
    assert(result.ok === true, JSON.stringify(result.issues))
    return `ok, ${result.applicableJinxes.length} jinxes`
  })
  await check('create_script_draft', async () => {
    const result = await tool(client, 'create_script_draft', { name: 'Agent Smoke', characters: ['washerwoman', 'empath', 'poisoner', 'imp'] })
    assert(result.url?.includes('?ss='), JSON.stringify(result))
    return `${result.mode} import link`
  })
  await check('search_rules', async () => {
    const result = await tool(client, 'search_rules', { query: 'drunk poisoned', limit: 1 })
    assert(result[0]?.url?.startsWith('http'), JSON.stringify(result))
    return `${result[0].page} › ${result[0].heading}`
  })
  await check('prompts', async () => {
    const { prompts } = await client.listPrompts()
    const prompt = await client.getPrompt({ name: 'review_script', arguments: { slug: 'tb' } })
    assert(prompt.messages[0].content.text.includes('analyze_script'), 'unexpected prompt text')
    return prompts.map((p) => p.name).join(', ')
  })
  await check('resources', async () => {
    const res = await client.readResource({ uri: 'botc://characters/imp' })
    assert(JSON.parse(res.contents[0].text).team === 'demon', 'imp is not a demon?')
    return 'botc://characters/imp'
  })

  if (withGames) {
    await check('cloud game (storyteller flow)', async () => {
      const created = await tool(client, 'create_game', { script_slug: 'tb', player_count: 7, assignments: 'random', seat_names: ['Smoke'] })
      const { game_id, host_token } = created
      const night = await tool(client, 'get_night_script', { game_id, host_token, night: 'first' })
      const infoRole = created.grimoire.seats.find((s) => ['washerwoman', 'librarian', 'investigator', 'chef', 'empath'].includes(s.believes ?? s.character))
      if (infoRole) await tool(client, 'suggest_night_info', { game_id, host_token, seat: infoRole.seat })
      const ran = await tool(client, 'run_commands', { game_id, host_token, commands: [{ type: 'phase.set', phase: 'nomination' }, { type: 'nomination.set', actor: 1, target: 2 }] })
      const pub = await tool(client, 'get_game', { game_id, view: 'public' })
      const leaked = created.grimoire.seats.some((s) => s.character && JSON.stringify(pub).includes(`"${s.character}"`))
      assert(ran.version === 2 && pub.day.phase === 'nomination' && !leaked, `version ${ran.version}, phase ${pub.day.phase}, leaked ${leaked}`)
      return `game ${game_id}: ${night.length} night steps, public view hides roles`
    })
  }
  await client.close()
}

if (token) {
  console.log('\nCloud library (BOTC_TOKEN)')
  await check('whoami', async () => {
    const { status, json } = await http('GET', '/v1/me', undefined, { authorization: `Bearer ${token}` })
    assert(status === 200, `${status} ${JSON.stringify(json)}`)
    return `${json.userId} via ${json.via}`
  })
  await check('MCP library tools', async () => {
    const signedIn = await connect({ Authorization: `Bearer ${token}` })
    const { tools } = await signedIn.listTools()
    assert(tools.some((t) => t.name === 'list_my_scripts'), 'library tools missing')
    const scripts = await tool(signedIn, 'list_my_scripts', {})
    await signedIn.close()
    return `${scripts.length} scripts in the library`
  })
}

console.log(`\n${failures === 0 ? '✓' : '✗'} ${passed} passed, ${failures} failed${skipped ? `, ${skipped} skipped` : ''}`)
process.exit(failures === 0 ? 0 : 1)
