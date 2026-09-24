/** OpenAPI 3.1 description of the public REST routes in api.ts. */
import { SERVER_INFO } from './mcp'

const lang = { name: 'lang', in: 'query', required: false, description: 'Return one language instead of both.', schema: { type: 'string', enum: ['en', 'zh'] } }
const json = (description: string) => ({ description, content: { 'application/json': { schema: { type: 'object' } } } })
const scriptBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        description: 'Either a bundled script slug or a script in the official JSON format.',
        properties: {
          slug: { type: 'string' },
          script: { description: 'Official script JSON: array of ids / custom character objects, optionally led by {"id":"_meta","name":...}.' },
        },
      },
    },
  },
}

export function openApiDocument(serverUrl: string) {
  return {
    openapi: '3.1.0',
    info: { title: 'BOTC Companion API', version: SERVER_INFO.version, description: 'Blood on the Clocktower catalog, script validation/analysis and drafting. No authentication. MCP endpoint: /mcp.' },
    servers: [{ url: serverUrl }],
    paths: {
      '/v1/characters': {
        get: {
          operationId: 'searchCharacters', summary: 'List or search characters',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Match id, names or ability text (EN/ZH).' },
            { name: 'team', in: 'query', schema: { type: 'string', enum: ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric'] } },
            { name: 'edition', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Page size (default: all).' },
            { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0 } },
            lang,
          ],
          responses: { 200: json('{ totalMatches, returned, offset, nextCursor, count (= returned), items }') },
        },
      },
      '/v1/characters/{id}': {
        get: {
          operationId: 'getCharacter', summary: 'Get one character with its jinxes',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, lang],
          responses: { 200: json('Character'), 404: json('Unknown character') },
        },
      },
      '/v1/characters/similar': {
        get: {
          operationId: 'similarCharacters', summary: 'Characters whose ability is closest in meaning to a text (needs Workers AI)',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string', maxLength: 1000 }, description: 'Description in English or Chinese.' },
            { name: 'team', in: 'query', schema: { type: 'string', enum: ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric'] } },
            { name: 'exclude', in: 'query', schema: { type: 'string' }, description: 'Comma-separated ids to leave out.' },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 5 } },
            lang,
          ],
          responses: { 200: json('{ model, items: [character + score] }'), 503: json('AI not enabled'), 429: json('Free AI allowance used up') },
        },
      },
      '/v1/characters/{id}/similar': {
        get: {
          operationId: 'charactersLike', summary: 'Characters most similar to an existing one (needs Workers AI)',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'team', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 5 } },
            lang,
          ],
          responses: { 200: json('{ model, items: [character + score] }'), 404: json('Unknown character'), 503: json('AI not enabled') },
        },
      },
      '/v1/ai/status': { get: { operationId: 'aiStatus', summary: 'Hosted AI availability, models, daily limits and embedding freshness', responses: { 200: json('{ chat: { available, model, dailyLimits }, embeddings: { available, model?, total?, embedded?, stale? } }') } } },
      '/v1/ai/chat': {
        post: {
          operationId: 'aiChat', summary: 'Hosted chat; the model can call this server\'s MCP tools. Daily limits per IP / signed-in user.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['messages'],
                  properties: {
                    system: { type: 'string', maxLength: 30000 },
                    messages: { type: 'array', minItems: 1, maxItems: 40, items: { type: 'object', required: ['role', 'content'], properties: { role: { type: 'string', enum: ['user', 'assistant'] }, content: { type: 'string' } } } },
                    temperature: { type: 'number', minimum: 0, maximum: 1.5 },
                    tools: { type: 'boolean', default: true },
                  },
                },
              },
            },
          },
          responses: { 200: json('{ text, steps: [{ tool, arguments, ok }], model, remaining }'), 400: json('Bad input'), 401: json('Invalid credentials'), 429: json('Daily limit reached (ai_rate_limited) or free AI allowance used up (ai_quota_exhausted)'), 503: json('AI not enabled') },
        },
      },
      '/v1/rules/search': {
        get: {
          operationId: 'searchRules', summary: 'Search BotC wiki excerpts',
          parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 10 } }],
          responses: { 200: json('{ items }'), 400: json('Missing query') },
        },
      },
      '/v1/editions': { get: { operationId: 'listEditions', summary: 'Editions / character packs with credits and exact character counts per team', parameters: [lang], responses: { 200: json('{ items: [{ id, name, author?, characterCount, teamCounts }] }') } } },
      '/v1/night-order': {
        get: {
          operationId: 'getNightOrder', summary: 'Global night order, or the wake order for a set of characters',
          parameters: [
            { name: 'ids', in: 'query', schema: { type: 'string' }, description: 'Comma-separated character ids.' },
            { name: 'night', in: 'query', schema: { type: 'string', enum: ['first', 'other'] } },
            lang,
          ],
          responses: { 200: json('Night order') },
        },
      },
      '/v1/jinxes': {
        get: {
          operationId: 'listJinxes', summary: 'All jinxes, or the active jinxes among a set of characters',
          parameters: [{ name: 'ids', in: 'query', schema: { type: 'string' }, description: 'Comma-separated character ids.' }, lang],
          responses: { 200: json('{ count, items }') },
        },
      },
      '/v1/scripts': { get: { operationId: 'listScripts', summary: 'Bundled scripts', responses: { 200: json('{ items }') } } },
      '/v1/scripts/{slug}': {
        get: {
          operationId: 'getScript', summary: 'A bundled script with characters, jinxes and night order',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }, lang],
          responses: { 200: json('Script'), 404: json('Unknown script') },
        },
      },
      '/v1/scripts/{slug}/tokens': {
        get: {
          operationId: 'getTokenManifest', summary: 'Character and reminder tokens to print for a script',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }, lang],
          responses: { 200: json('Token manifest'), 404: json('Unknown script') },
        },
      },
      '/v1/scripts/validate': { post: { operationId: 'validateScript', summary: 'Validate a script', requestBody: scriptBody, responses: { 200: json('{ ok, issues, characters, teamCounts, applicableJinxes }'), 400: json('Bad input') } } },
      '/v1/scripts/analyze': { post: { operationId: 'analyzeScript', summary: 'Deterministic script analysis', requestBody: scriptBody, responses: { 200: json('{ validation, analysis }'), 400: json('Bad input') } } },
      '/v1/scripts/drafts': {
        post: {
          operationId: 'createScriptDraft', summary: 'Validate a new script and get a link that imports it into the web app',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'characters'],
                  properties: {
                    name: { type: 'string' },
                    name_zh: { type: 'string' },
                    author: { type: 'string' },
                    characters: { type: 'array', items: { oneOf: [{ type: 'string' }, { type: 'object' }] } },
                  },
                },
              },
            },
          },
          responses: { 201: json('{ url, mode, expiresAt?, script, validation }'), 422: json('Validation errors'), 502: json('Short link storage failed') },
        },
      },
    },
  }
}
