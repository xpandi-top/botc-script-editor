/**
 * BOTC Companion API worker: public REST (/v1), MCP (/mcp), OpenAPI and
 * llms.txt. See ../README.md and ../../docs/ARCHITECTURE-API.md.
 */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { buildApi } from './api'
import type { Env } from './env'
import { AuthError, authenticate, verifyGoogleAccessToken } from './library/auth'
import { buildLibraryRoutes, type LibraryDeps } from './library/routes'
import { D1LibraryStore } from './library/store'
import { buildGameRoutes } from './games/routes'
import type { RoomApi } from './games/room'
import { buildMcpServer, SERVER_INFO } from './mcp'
import { buildOAuthRoutes } from './oauth'
import { openApiDocument } from './openapi'
import { InputError } from './scripts'
import { ShareError } from './share'

export type AppOptions = Partial<LibraryDeps> & {
  /** RPC handle for one game; defaults to the GAMES Durable Object namespace. */
  roomFor?: (env: Env, gameId: string) => RoomApi | null
}

export { GameRoom } from './games/durable'

/** Build the app; tests inject an in-memory store and a fake Google verifier. */
export function createApp(options: AppOptions = {}) {
  const deps: LibraryDeps = {
    storeFor: options.storeFor ?? ((env) => (env.DB ? new D1LibraryStore(env.DB) : null)),
    verifyGoogle: options.verifyGoogle ?? verifyGoogleAccessToken,
    now: options.now ?? Date.now,
  }
  const roomFor = options.roomFor ?? ((env: Env, gameId: string) => (env.GAMES ? env.GAMES.get(env.GAMES.idFromName(gameId)) as unknown as RoomApi : null))
  const app = new Hono<{ Bindings: Env }>()

  app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowHeaders: ['content-type', 'accept', 'authorization', 'mcp-session-id', 'mcp-protocol-version', 'last-event-id'], exposeHeaders: ['mcp-session-id'] }))

  app.onError((err, c) => {
    if (err instanceof InputError) return c.json({ error: { code: 'invalid_request', message: err.message } }, 400)
    if (err instanceof ShareError) return c.json({ error: { code: 'share_failed', message: err.message } }, 502)
    if (err instanceof HTTPException) return err.getResponse()
    console.error(err)
    return c.json({ error: { code: 'internal', message: 'Internal error.' } }, 500)
  })

  app.get('/', (c) => {
    const base = new URL(c.req.url).origin
    return c.json({
      name: 'BOTC Companion API',
      version: SERVER_INFO.version,
      app: c.env.APP_URL,
      mcp: `${base}/mcp`,
      openapi: `${base}/openapi.json`,
      docs: `${base}/llms.txt`,
    })
  })

  app.get('/openapi.json', (c) => c.json(openApiDocument(new URL(c.req.url).origin)))

  app.get('/llms.txt', (c) => {
    const base = new URL(c.req.url).origin
    return c.text(`# BOTC Companion API

Blood on the Clocktower characters, scripts, jinxes and night order (English + Chinese), plus script validation, analysis and drafting.

## MCP
Streamable HTTP endpoint: ${base}/mcp (no authentication)
Tools: search_characters, get_character, get_jinxes, get_night_order, search_rules, list_scripts, get_script, validate_script, analyze_script, get_token_manifest, create_script_draft
Prompts: design_script, design_character, translate_ability, review_script

## REST (OpenAPI: ${base}/openapi.json)
GET  /v1/characters?q=&team=&edition=&lang=&limit=
GET  /v1/characters/{id}?lang=
GET  /v1/editions
GET  /v1/rules/search?q=&limit=
GET  /v1/night-order?ids=a,b&night=first|other&lang=
GET  /v1/jinxes?ids=a,b&lang=
GET  /v1/scripts
GET  /v1/scripts/{slug}?lang=
GET  /v1/scripts/{slug}/tokens?lang=
POST /v1/scripts/validate   {"slug"} or {"script": <official JSON>}
POST /v1/scripts/analyze    {"slug"} or {"script": <official JSON>}
POST /v1/scripts/drafts     {"name", "name_zh"?, "author"?, "characters": [ids or custom objects]} → import link for the web app

## Cloud library (Authorization: Bearer <botc_pat_ token or Google access token>)
GET    /v1/me
GET    /v1/me/tokens · POST /v1/me/tokens {"name"} (Google sign-in only) · DELETE /v1/me/tokens/{id}
GET    /v1/me/{scripts|characters|records}?since=<ms>   (with since: includes deletions)
GET    /v1/me/{kind}/{id} · PUT {"data", "updatedAt"?, "baseUpdatedAt"?} · DELETE
GET    /v1/me/stats
MCP with the same header adds: list_my_scripts, get_my_script, save_script, delete_my_script, list_my_characters, save_character, list_records, get_stats

## Cloud games (storyteller: X-Game-Token: <host token from create>, or the signed-in owner)
POST /v1/games  {"scriptSlug" | "script", "playerCount", "travelerCount"?, "seatNames"?, "assignments": {seat: id} | "random", "perceived"?, "demonBluffs"?} → {gameId, hostToken}
GET  /v1/games/{id}                public view · ?view=st → grimoire (host)
GET  /v1/games/{id}/seats/{n}      what that player knows (host)
POST /v1/games/{id}/commands       {"commands": [...], "expectedVersion"?} (host; atomic)
GET  /v1/games/{id}/night-script?night=first|other&lang=  (host)
GET  /v1/games/{id}/journal?since=<version>               (host)
MCP tools: create_game, get_game, run_commands, get_night_script, get_seat_view
`)
  })

  app.route('/v1/me', buildLibraryRoutes(deps))
  app.route('/v1/games', buildGameRoutes({ ...deps, roomFor }))
  app.route('/v1', buildApi())
  app.route('/v1/auth', buildOAuthRoutes())

  // Stateless MCP: a fresh server + transport per request (no session state to keep).
  // With an Authorization header (PAT or Google token) the cloud-library tools are added.
  app.all('/mcp', async (c) => {
    let library: Parameters<typeof buildMcpServer>[1]
    const authorization = c.req.header('authorization')
    if (authorization) {
      const store = deps.storeFor(c.env)
      if (!store) return c.json({ error: { code: 'library_unavailable', message: 'The cloud library is not configured on this server; connect without credentials for the read-only tools.' } }, 503)
      try {
        const principal = await authenticate(authorization, c.env, store, deps.verifyGoogle, deps.now())
        if (principal) library = { store, principal, now: deps.now }
      } catch (e) {
        if (e instanceof AuthError) return c.json({ error: { code: 'unauthorized', message: e.message } }, 401, { 'www-authenticate': 'Bearer' })
        throw e
      }
    }
    const games = options.roomFor || c.env.GAMES ? { rooms: (gameId: string) => roomFor(c.env, gameId) } : undefined
    const server = buildMcpServer(c.env, library, games)
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    await server.connect(transport)
    return transport.handleRequest(c.req.raw)
  })

  app.notFound((c) => c.json({ error: { code: 'not_found', message: `No route for ${c.req.method} ${new URL(c.req.url).pathname}. See /llms.txt.` } }, 404))

  return app
}

export default createApp()
