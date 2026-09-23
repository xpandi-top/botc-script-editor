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
import { buildMcpServer, SERVER_INFO } from './mcp'
import { openApiDocument } from './openapi'
import { InputError } from './scripts'
import { ShareError } from './share'

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowHeaders: ['content-type', 'accept', 'mcp-session-id', 'mcp-protocol-version', 'last-event-id'], exposeHeaders: ['mcp-session-id'] }))

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
Tools: search_characters, get_character, get_jinxes, get_night_order, list_scripts, get_script, validate_script, analyze_script, get_token_manifest, create_script_draft
Prompts: design_script, design_character, translate_ability, review_script

## REST (OpenAPI: ${base}/openapi.json)
GET  /v1/characters?q=&team=&edition=&lang=&limit=
GET  /v1/characters/{id}?lang=
GET  /v1/editions
GET  /v1/night-order?ids=a,b&night=first|other&lang=
GET  /v1/jinxes?ids=a,b&lang=
GET  /v1/scripts
GET  /v1/scripts/{slug}?lang=
GET  /v1/scripts/{slug}/tokens?lang=
POST /v1/scripts/validate   {"slug"} or {"script": <official JSON>}
POST /v1/scripts/analyze    {"slug"} or {"script": <official JSON>}
POST /v1/scripts/drafts     {"name", "name_zh"?, "author"?, "characters": [ids or custom objects]} → import link for the web app
`)
})

app.route('/v1', buildApi())

// Stateless MCP: a fresh server + transport per request (no session state to keep).
app.all('/mcp', async (c) => {
  const server = buildMcpServer(c.env)
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  return transport.handleRequest(c.req.raw)
})

app.notFound((c) => c.json({ error: { code: 'not_found', message: `No route for ${c.req.method} ${new URL(c.req.url).pathname}. See /llms.txt.` } }, 404))

export default app
