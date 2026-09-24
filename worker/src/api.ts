/**
 * Public read-only REST API (P1 in docs/ARCHITECTURE-API.md) plus script
 * drafting. No authentication; everything served here is already public in
 * the web app's bundle.
 */
import { Hono, type Context } from 'hono'
import { SCRIPT_TEAMS } from '../../src/core/script/validate'
import type { Team } from '../../src/core/types/catalog'
import { getCatalog } from './catalog'
import type { Env } from './env'
import { analyze, buildDraftScript, checkScript, InputError, resolveScriptData, toEditableScript, type DraftInput } from './scripts'
import { searchRules } from './rules'
import { createScriptShareLink } from './share'
import { characterView, editionSummaries, jinxView, nightOrderView, pageOf, parseLang, tokenManifest } from './views'

type AppContext = Context<{ Bindings: Env }>

function listParam(value: string | undefined): string[] | undefined {
  return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : undefined
}

async function jsonBody(c: AppContext): Promise<Record<string, unknown>> {
  const body = await c.req.json().catch(() => undefined)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Request body must be a JSON object.')
  return body as Record<string, unknown>
}

export function buildApi() {
  const api = new Hono<{ Bindings: Env }>()

  api.get('/health', (c) => c.json({ ok: true, characters: getCatalog().data.characters.length, catalogGeneratedAt: getCatalog().data.generatedAt }))

  api.get('/characters', (c) => {
    const team = c.req.query('team')
    if (team && !SCRIPT_TEAMS.includes(team as Team)) throw new InputError(`Unknown team "${team}".`)
    const limitRaw = c.req.query('limit')
    const limit = limitRaw === undefined ? undefined : Number(limitRaw)
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) throw new InputError('"limit" must be a positive integer.')
    const offset = Number(c.req.query('offset') ?? 0)
    if (!Number.isInteger(offset) || offset < 0) throw new InputError('"offset" must be a non-negative integer.')
    const lang = parseLang(c.req.query('lang'))
    const all = getCatalog().searchCharacters({ q: c.req.query('q'), team: team as Team | undefined, edition: c.req.query('edition') })
    const page = pageOf(all, offset, limit ?? all.length)
    return c.json({ ...page, items: page.items.map((ch) => characterView(ch, lang)) })
  })

  api.get('/characters/:id', (c) => {
    const character = getCatalog().getCharacter(c.req.param('id'))
    if (!character) return c.json({ error: { code: 'not_found', message: `Unknown character "${c.req.param('id')}".` } }, 404)
    const lang = parseLang(c.req.query('lang'))
    return c.json({ ...characterView(character, lang), jinxes: getCatalog().data.jinxes.filter((j) => j.characters.includes(character.id)).map((j) => jinxView(j, lang)) })
  })

  api.get('/editions', (c) => c.json({ items: editionSummaries(getCatalog(), parseLang(c.req.query('lang'))) }))

  api.get('/rules/search', (c) => {
    const q = c.req.query('q')?.trim()
    if (!q) throw new InputError('"q" is required.')
    const limit = Math.min(10, Math.max(1, Number(c.req.query('limit') ?? 3) || 3))
    return c.json({ items: searchRules(q, limit) })
  })

  api.get('/night-order', (c) => {
    const ids = listParam(c.req.query('ids'))
    const night = c.req.query('night') === 'other' ? 'other' : 'first'
    if (!ids) return c.json(getCatalog().data.nightOrder)
    return c.json({ night, items: nightOrderView(getCatalog(), ids, night, parseLang(c.req.query('lang'))) })
  })

  api.get('/jinxes', (c) => {
    const ids = listParam(c.req.query('ids'))
    const lang = parseLang(c.req.query('lang'))
    const list = ids ? getCatalog().jinxesAmong(ids) : getCatalog().data.jinxes
    return c.json({ count: list.length, items: list.map((j) => jinxView(j, lang)) })
  })

  api.get('/scripts', (c) => c.json({ items: getCatalog().listScripts() }))

  api.get('/scripts/:slug', (c) => {
    const catalog = getCatalog()
    const script = catalog.getScript(c.req.param('slug'))
    if (!script) return c.json({ error: { code: 'not_found', message: `Unknown script "${c.req.param('slug')}".` } }, 404)
    const lang = parseLang(c.req.query('lang'))
    const { data: _data, ...summary } = script
    return c.json({
      ...summary,
      characters: script.characters.map((id) => {
        const ch = catalog.getCharacter(id)
        return ch ? characterView(ch, lang) : { id }
      }),
      jinxes: catalog.jinxesAmong(script.characters).map((j) => jinxView(j, lang)),
      nightOrder: {
        first: nightOrderView(catalog, script.characters, 'first', lang ?? 'en'),
        other: nightOrderView(catalog, script.characters, 'other', lang ?? 'en'),
      },
    })
  })

  api.get('/scripts/:slug/tokens', (c) => {
    const script = getCatalog().getScript(c.req.param('slug'))
    if (!script) return c.json({ error: { code: 'not_found', message: `Unknown script "${c.req.param('slug')}".` } }, 404)
    return c.json(tokenManifest(getCatalog(), script.characters, parseLang(c.req.query('lang')) ?? 'en'))
  })

  api.post('/scripts/validate', async (c) => {
    const body = await jsonBody(c)
    return c.json(checkScript(getCatalog(), resolveScriptData(getCatalog(), body)))
  })

  api.post('/scripts/analyze', async (c) => {
    const body = await jsonBody(c)
    return c.json(analyze(getCatalog(), resolveScriptData(getCatalog(), body)))
  })

  /** Build a script from ids / custom characters, validate it and return an app import link. */
  api.post('/scripts/drafts', async (c) => {
    const body = await jsonBody(c)
    if (!Array.isArray(body.characters)) throw new InputError('"characters" must be an array of ids or custom character objects.')
    const draft = buildDraftScript(body as unknown as DraftInput)
    const validation = checkScript(getCatalog(), draft)
    if (!validation.ok) return c.json({ error: { code: 'invalid_script', message: 'The script has errors; fix them and retry.' }, validation }, 422)
    const link = await createScriptShareLink(c.env, toEditableScript(draft, String(body.name)))
    return c.json({ ...link, script: draft, validation }, 201)
  })

  return api
}
