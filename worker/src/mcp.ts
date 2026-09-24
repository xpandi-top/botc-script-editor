/**
 * MCP server (Streamable HTTP, stateless). Tools are thin wrappers over the
 * same core functions as the REST API; the calling agent supplies the
 * reasoning (decision D5). The hosted chat (/v1/ai/chat) connects to this
 * same server in-process to give its model these tools.
 */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker'
import { z } from 'zod'
import { buildGlossaryPrompt } from '../../src/core/ai/glossary'
import { SCRIPT_TEAMS } from '../../src/core/script/validate'
import type { Team } from '../../src/core/types/catalog'
import { getCatalog } from './catalog'
import type { Env } from './env'
import { analyze, buildDraftScript, checkScript, InputError, resolveScriptData, toEditableScript, type DraftInput } from './scripts'
import type { Principal } from './library/auth'
import { registerLibraryTools } from './library/mcpTools'
import { registerGameTools } from './games/mcpTools'
import type { RoomApi } from './games/room'
import type { LibraryStore } from './library/store'
import { searchRules } from './rules'
import { findSimilar, type SemanticDeps } from './ai/embeddings'
import { createScriptShareLink, ShareError } from './share'
import { characterView, jinxView, nightOrderView, tokenManifest, type Lang } from './views'

export const SERVER_INFO = { name: 'botc-companion', version: '0.1.0' }

const INSTRUCTIONS = `Blood on the Clocktower (BOTC) data and tools from BOTC Companion.
- Look characters up with search_characters / get_character before using them; ids are lowercase (e.g. "washerwoman", "high_priestess").
- To design a script: pick characters, call validate_script and analyze_script, fix issues, then call create_script_draft. It returns a link that imports the script into the BOTC Companion web app.
- A standard script has 13 Townsfolk, 4 Outsiders, 4 Minions and 4 Demons. Check jinxes with get_jinxes.
- Text is available in English (en) and Chinese (zh).`

const LIBRARY_INSTRUCTIONS = `- You are signed in to the user's cloud library: save_script / save_character store work there (it shows up in the app after sync); list_records and get_stats read their saved games.`

const lang = z.enum(['en', 'zh']).optional().describe('Return text in one language (en or zh). Omit for both.')
const teamSchema = z.enum(SCRIPT_TEAMS as unknown as [Team, ...Team[]])
const scriptJson = z.union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())])
  .describe('Script in the official JSON format: an array of character ids and/or custom character objects, optionally starting with {"id":"_meta","name":...}. A JSON string is also accepted.')

const READ_ONLY = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const

function ok(result: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
}

function toolError(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

/** Run a tool body, turning input problems into MCP tool errors the agent can act on. */
export async function guarded(run: () => unknown | Promise<unknown>) {
  try {
    return ok(await run())
  } catch (e) {
    if (e instanceof InputError || e instanceof ShareError) return toolError(e.message)
    throw e
  }
}

const summary = (id: string, l?: Lang) => {
  const c = getCatalog().getCharacter(id)
  if (!c) return { id, unknown: true }
  return l ? { id, team: c.team, edition: c.edition, name: c.name[l], ability: c.ability[l] } : { id, team: c.team, edition: c.edition, name: c.name, ability: c.ability }
}

export type McpLibraryContext = { store: LibraryStore; principal: Principal; now: () => number }

/** Present when cloud games are enabled (GAMES Durable Object binding). */
export type McpGamesContext = { rooms: (gameId: string) => RoomApi | null }

export function buildMcpServer(env: Env, library?: McpLibraryContext, games?: McpGamesContext, semantic?: SemanticDeps): McpServer {
  const instructions = library ? `${INSTRUCTIONS}\n${LIBRARY_INSTRUCTIONS}` : INSTRUCTIONS
  const server = new McpServer(SERVER_INFO, { instructions, jsonSchemaValidator: new CfWorkerJsonSchemaValidator() })
  const catalog = getCatalog()
  if (library) registerLibraryTools(server, { env, ...library, guarded })
  if (games) registerGameTools(server, { rooms: games.rooms, userId: library?.principal.userId ?? null, guarded })

  // ── Catalog ────────────────────────────────────────────────────────────────

  server.registerTool('search_characters', {
    title: 'Search characters',
    description: 'Find BOTC characters by name or ability text (English or Chinese), optionally filtered by team and edition. Returns id, team, edition, name and ability.',
    inputSchema: {
      query: z.string().optional().describe('Text to match against id, names and ability text.'),
      team: teamSchema.optional(),
      edition: z.string().optional().describe('Edition id, e.g. tb, bmr, snv, odyssey, experimental.'),
      language: lang,
      limit: z.number().int().min(1).max(100).optional().describe('Maximum results (default 20).'),
    },
    annotations: READ_ONLY,
  }, ({ query, team, edition, language, limit }) => guarded(() => {
    const items = catalog.searchCharacters({ q: query, team, edition, limit: limit ?? 20 })
    return { count: items.length, items: items.map((c) => summary(c.id, language)) }
  }))

  server.registerTool('get_character', {
    title: 'Get character',
    description: 'Full details for one character: ability, reminders, night order and reminder text, setup flag, and its jinxes.',
    inputSchema: { id: z.string(), language: lang },
    annotations: READ_ONLY,
  }, ({ id, language }) => guarded(() => {
    const c = catalog.getCharacter(id)
    if (!c) {
      const near = catalog.validationCatalog.allIds?.find((known) => known.replace(/[^a-z0-9]/g, '') === id.toLowerCase().replace(/[^a-z0-9]/g, ''))
      throw new InputError(`Unknown character "${id}".${near ? ` Did you mean "${near}"?` : ' Use search_characters to find ids.'}`)
    }
    return { ...characterView(c, language), jinxes: catalog.data.jinxes.filter((j) => j.characters.includes(c.id)).map((j) => jinxView(j, language)) }
  }))

  if (semantic) {
    server.registerTool('find_similar_characters', {
      title: 'Find similar characters',
      description: 'Semantic search: characters whose ability is closest in meaning to a description (English or Chinese), or to an existing character. For characters like a known one, pass its id (find it with search_characters) instead of describing it. Use it to find precedents when designing or translating a character, or swap candidates for a script.',
      inputSchema: {
        query: z.string().max(1000).optional().describe('Describe the effect, e.g. "a minion whose vote counts twice" or "每晚杀两人的恶魔".'),
        id: z.string().optional().describe('Or: an existing character id to find neighbours of.'),
        team: teamSchema.optional(),
        exclude: z.array(z.string()).optional().describe('Character ids to leave out.'),
        limit: z.number().int().min(1).max(20).optional().describe('Default 5.'),
        language: lang,
      },
      annotations: READ_ONLY,
    }, ({ query, id, team, exclude, limit, language }) => guarded(async () => {
      if (!query?.trim() && !id) throw new InputError('Provide "query" or "id".')
      const found = await findSimilar(semantic, { query: query?.trim(), id, team, exclude, limit })
      if (!found) throw new InputError(`Unknown character "${id}". Use search_characters to find ids.`)
      return { model: semantic.model, items: found.map(({ id: cid, score }) => ({ ...summary(cid, language), score: Math.round(score * 1000) / 1000 })) }
    }))
  }

  server.registerTool('get_jinxes', {
    title: 'Get jinxes',
    description: 'Active jinxes (special rule interactions) among a set of characters.',
    inputSchema: { characters: z.array(z.string()).min(2), language: lang },
    annotations: READ_ONLY,
  }, ({ characters, language }) => guarded(() => catalog.jinxesAmong(characters).map((j) => jinxView(j, language))))

  server.registerTool('get_night_order', {
    title: 'Get night order',
    description: 'Wake order for a set of characters on the first night or other nights, with the storyteller reminder for each, including the Dusk / Minion info / Demon info / Dawn steps.',
    inputSchema: { characters: z.array(z.string()).min(1), night: z.enum(['first', 'other']).default('first'), language: lang },
    annotations: READ_ONLY,
  }, ({ characters, night, language }) => guarded(() => nightOrderView(catalog, characters, night, language ?? 'en')))

  server.registerTool('search_rules', {
    title: 'Search rules',
    description: 'Search excerpts from the official BotC wiki (rules, setup, states such as drunk/poisoned, storyteller advice) and some Chinese rule notes. Returns page, heading, url and text.',
    inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(10).optional().describe('Default 3.') },
    annotations: READ_ONLY,
  }, ({ query, limit }) => guarded(() => searchRules(query, limit ?? 3)))

  // ── Scripts ────────────────────────────────────────────────────────────────

  server.registerTool('list_scripts', {
    title: 'List scripts',
    description: 'Scripts bundled with BOTC Companion (official and community): slug, title, author and character count.',
    inputSchema: {},
    annotations: READ_ONLY,
  }, () => guarded(() => catalog.listScripts()))

  server.registerTool('get_script', {
    title: 'Get script',
    description: 'A bundled script: its characters (id, team, name, ability), jinxes and night order.',
    inputSchema: { slug: z.string(), language: lang },
    annotations: READ_ONLY,
  }, ({ slug, language }) => guarded(() => {
    const s = catalog.getScript(slug)
    if (!s) throw new InputError(`Unknown script "${slug}". Use list_scripts.`)
    return {
      slug: s.slug, title: s.title, titleZh: s.titleZh, author: s.author,
      characters: s.characters.map((id) => summary(id, language)),
      jinxes: catalog.jinxesAmong(s.characters).map((j) => jinxView(j, language)),
      firstNight: nightOrderView(catalog, s.characters, 'first', language ?? 'en').map((n) => n.id),
      otherNight: nightOrderView(catalog, s.characters, 'other', language ?? 'en').map((n) => n.id),
    }
  }))

  server.registerTool('validate_script', {
    title: 'Validate script',
    description: 'Check a script: unknown ids (with suggestions), duplicates, incomplete custom characters, missing Demon/Townsfolk, dangling jinxes. Returns ok, issues, team counts and applicable jinxes.',
    inputSchema: { slug: z.string().optional().describe('A bundled script slug, instead of "script".'), script: scriptJson.optional() },
    annotations: READ_ONLY,
  }, (input) => guarded(() => checkScript(catalog, resolveScriptData(catalog, input))))

  server.registerTool('analyze_script', {
    title: 'Analyze script',
    description: 'Deterministic facts about a script: team counts vs the standard 13/4/4/4, which player counts (5-15) it can deal, setup modifiers, first/other night wakers, jinxes, plus validation. Use these facts for balance judgements.',
    inputSchema: { slug: z.string().optional(), script: scriptJson.optional() },
    annotations: READ_ONLY,
  }, (input) => guarded(() => analyze(catalog, resolveScriptData(catalog, input))))

  server.registerTool('get_token_manifest', {
    title: 'Get token manifest',
    description: 'What to print for a script: one character token per character and every reminder token with counts.',
    inputSchema: { slug: z.string().optional(), characters: z.array(z.string()).optional(), language: lang },
    annotations: READ_ONLY,
  }, ({ slug, characters, language }) => guarded(() => {
    const ids = slug ? catalog.getScript(slug)?.characters : characters
    if (!ids) throw new InputError(slug ? `Unknown script "${slug}".` : 'Provide "slug" or "characters".')
    return tokenManifest(catalog, ids, language ?? 'en')
  }))

  server.registerTool('create_script_draft', {
    title: 'Create script draft',
    description: 'Validate a new script and return a link that imports it into the BOTC Companion web app (the user opens the link; nothing is saved to an account). Fails with the validation issues if the script has errors.',
    inputSchema: {
      name: z.string().min(1).describe('Script title.'),
      name_zh: z.string().optional().describe('Chinese title.'),
      author: z.string().optional(),
      characters: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).min(1)
        .describe('Character ids, and/or custom characters as objects with id, name, team, ability (official script format).'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, (input) => guarded(async () => {
    const draft = buildDraftScript(input as unknown as DraftInput)
    const validation = checkScript(catalog, draft)
    if (!validation.ok) throw new InputError(`The script has errors:\n${validation.issues.filter((i) => i.severity === 'error').map((i) => `- ${i.message}`).join('\n')}`)
    const link = await createScriptShareLink(env, toEditableScript(draft, input.name))
    return { ...link, warnings: validation.issues.map((i) => i.message), teamCounts: validation.teamCounts }
  }))

  // ── Resources ──────────────────────────────────────────────────────────────

  server.registerResource('character', new ResourceTemplate('botc://characters/{id}', {
    list: async () => ({ resources: catalog.data.characters.map((c) => ({ uri: `botc://characters/${c.id}`, name: `${c.name.en} / ${c.name.zh}`, mimeType: 'application/json' })) }),
  }), { title: 'Character', description: 'A BOTC character (bilingual).', mimeType: 'application/json' }, async (uri, { id }) => {
    const c = catalog.getCharacter(String(id))
    return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(c ?? { error: 'unknown character' }) }] }
  })

  server.registerResource('script', new ResourceTemplate('botc://scripts/{slug}', {
    list: async () => ({ resources: catalog.listScripts().map((s) => ({ uri: `botc://scripts/${s.slug}`, name: s.title, mimeType: 'application/json' })) }),
  }), { title: 'Script', description: 'A bundled script in the official JSON format.', mimeType: 'application/json' }, async (uri, { slug }) => {
    const s = catalog.getScript(String(slug))
    return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(s?.data ?? { error: 'unknown script' }) }] }
  })

  server.registerResource('night-order', 'botc://night-order', { title: 'Night order', description: 'Global first-night and other-night wake order.', mimeType: 'application/json' }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(catalog.data.nightOrder) }],
  }))

  server.registerResource('glossary', 'botc://glossary', { title: 'EN↔ZH glossary', description: 'Standard Chinese translations of BOTC terms.', mimeType: 'text/plain' }, async (uri) => ({
    contents: [{ uri: uri.href, mimeType: 'text/plain', text: buildGlossaryPrompt('zh') }],
  }))

  // ── Prompts ────────────────────────────────────────────────────────────────

  const userPrompt = (text: string) => ({ messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] })

  server.registerPrompt('design_script', {
    title: 'Design a script',
    description: 'Design a new BOTC script around a theme, validated with the catalog tools.',
    argsSchema: { theme: z.string().describe('Theme or mechanic to build around.'), language: z.string().optional().describe('en or zh') },
  }, ({ theme, language }) => userPrompt(`Design a Blood on the Clocktower script around this theme: ${theme}.
Use search_characters and get_character to pick existing characters (standard layout: 13 Townsfolk, 4 Outsiders, 4 Minions, 4 Demons).
Check it with validate_script and analyze_script, review jinxes with get_jinxes, adjust until there are no errors and the script deals for 5-15 players, then call create_script_draft and give me the link.
Explain the main information roles, misinformation sources and the Demon/Minion plan.${language === 'zh' ? '\nAnswer in Chinese.' : ''}`))

  server.registerPrompt('design_character', {
    title: 'Design a character',
    description: 'Draft a new custom character in official ability style, bilingual.',
    argsSchema: { concept: z.string(), team: z.string().optional().describe('townsfolk, outsider, minion, demon, traveler or fabled') },
  }, ({ concept, team }) => userPrompt(`Design a new Blood on the Clocktower ${team ?? ''} character for this concept: ${concept}.
First use search_characters to find the closest existing characters and match their wording style.
Rules: 1-3 sentences; clear trigger, target and effect; "might" for uncertain outcomes and "may" for choices; mention drunk/poison only when not obvious; night reminders are terse ST instructions.
Return: id (lowercase, custom_ prefix), English name, Chinese name, team, English ability, Chinese ability, first/other night reminders if it wakes, reminder tokens.

${buildGlossaryPrompt('zh')}`))

  server.registerPrompt('translate_ability', {
    title: 'Translate ability text',
    description: 'Translate ability text between English and Chinese with standard BOTC terminology.',
    argsSchema: { text: z.string(), to: z.string().describe('zh or en') },
  }, ({ text, to }) => userPrompt(`Translate this Blood on the Clocktower ability text to ${to === 'en' ? 'English' : 'Chinese'}, preserving every timing, condition, target and effect exactly. Use get_character on similar official characters to match established wording.

Text: "${text}"

${buildGlossaryPrompt(to === 'en' ? 'en' : 'zh')}`))

  server.registerPrompt('review_script', {
    title: 'Review a script',
    description: 'Balance and storytelling review of a bundled script.',
    argsSchema: { slug: z.string().describe('Bundled script slug (see list_scripts).') },
  }, ({ slug }) => userPrompt(`Review the Blood on the Clocktower script "${slug}". Call get_script and analyze_script first.
Cover: information density and reliability, misinformation (drunk/poison/registering), evil bluff space, execution pressure, night-order complexity for the storyteller, jinxes, and which player counts play best. Finish with concrete swap suggestions (use search_characters) and re-check them with analyze_script.`))

  return server
}
