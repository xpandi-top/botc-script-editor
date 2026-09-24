# BOTC Companion API (Cloudflare Worker)

Public REST API and MCP server for agents: Blood on the Clocktower characters,
scripts, jinxes and night order (English + Chinese), plus script validation,
analysis and drafting. Plan and roadmap: [`../docs/ARCHITECTURE-API.md`](../docs/ARCHITECTURE-API.md).

- MCP and REST run no LLM — the calling agent does the reasoning (free to run).
  The optional hosted AI (`/v1/ai/chat`, below) is for the web app's users
  who have no API key; it uses the Workers AI free tier with daily limits.
- `create_script_draft` returns a link that imports the script into the web
  app when the user opens it.
- Game logic, validation and the catalog come from `../src/core` (shared with
  the web app). The catalog snapshot is generated from `../assets` on every
  `dev`, `test`, `typecheck` and `deploy`.

## Endpoints

| Path | What |
|---|---|
| `/mcp` | MCP (Streamable HTTP, stateless, no auth) |
| `/v1/...` | REST — see `/llms.txt` or `/openapi.json` |
| `/` | Service info |

MCP tools: `search_characters`, `get_character`, `find_similar_characters` (with Workers AI), `get_jinxes`, `get_night_order`, `search_rules`,
`list_scripts`, `get_script`, `validate_script`, `analyze_script`,
`get_token_manifest`, `create_script_draft`.
Resources: `botc://characters/{id}`, `botc://scripts/{slug}`, `botc://night-order`, `botc://glossary`.
Prompts: `design_script`, `design_character`, `translate_ability`, `review_script`.

## Develop

```bash
cd worker
npm install
npm run dev        # http://localhost:8787 (local workerd runtime)
npm test           # vitest: REST + MCP JSON-RPC
npm run typecheck
```

`npm run verify` in the repo root also runs these tests once `worker/node_modules` exists.

### Smoke test against a running worker

`npm run smoke` checks a live deployment end to end: the REST API with plain
`fetch`, and the MCP server through the official MCP client (the protocol
Claude, Cursor and other agents use) — tools, prompts, resources and a full
storyteller flow on a throwaway cloud game.

```bash
npm run smoke                                   # production (botc-api.xpandi-top.workers.dev)
npm run smoke -- --url http://localhost:8787    # local `npm run dev`
npm run smoke -- --no-games                     # don't create a throwaway game
npm run smoke -- --chat                         # also send one hosted-AI chat (1 of today's requests)
BOTC_TOKEN=botc_pat_… npm run smoke             # also check the signed-in cloud library
```

The hosted-AI checks run when `/v1/ai/status` reports AI enabled (skipped
otherwise). They trigger the embedding refresh and fail if any character's
embedding is stale, so a deploy with catalog changes is verified end to end.

## Deploy (manual, one-time setup)

Needs a free Cloudflare account; no credit card.

1. `cd worker && npx wrangler login` (opens the browser).
2. Check `APP_URL` in `wrangler.jsonc` is the deployed web app
   (`https://apps.xpandi.top/botc-script-editor/`).
3. `npm run deploy` → prints `https://botc-api.<your-subdomain>.workers.dev`.
4. Optional, for 7-character short links instead of long inline links: set
   `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY` in `wrangler.jsonc` to the same
   public web config the app uses (`VITE_FIREBASE_PROJECT_ID` /
   `VITE_FIREBASE_API_KEY`), then deploy again. Links then use the existing
   Firestore `shortlinks` collection (24 h expiry).

## Cloud library (P2, optional)

Signed-in users get `/v1/me` (scripts, custom characters, game records with
sync, stats, personal access tokens) and extra MCP tools (`list_my_scripts`,
`get_my_script`, `save_script`, `delete_my_script`, `list_my_characters`,
`save_character`, `list_records`, `get_stats`).

- Identity: the Google account the app already uses for Cloud Sync. Send the
  Google access token, or a personal access token (`botc_pat_…`) created with
  `POST /v1/me/tokens` while signed in with Google. Only token hashes are stored.
- Storage: D1 (free: 5 GB, 5M row reads/day). Setup (manual, once):
  1. `npx wrangler d1 create botc-library` → paste the id into the commented
     `d1_databases` entry in `wrangler.jsonc` and uncomment it.
  2. `npx wrangler d1 migrations apply botc-library --remote`
  3. Set `GOOGLE_WEB_CLIENT_ID` (and `GOOGLE_CLIENT_IDS` for Android/Electron) in `wrangler.jsonc`; `npm run deploy`.
- MCP clients pass the token as a header, e.g.
  `claude mcp add --transport http botc https://…/mcp --header "Authorization: Bearer botc_pat_…"`.

Without the D1 binding everything above answers 503 and MCP stays read-only.

## Cloud games (P3)

One Durable Object per game (SQLite-backed, available on the free plan;
created automatically on deploy). The storyteller — a person or an agent —
creates a game, keeps the returned host token and drives it with commands;
anyone with the game id can read the public view.

- REST: `POST /v1/games`, `GET /v1/games/{id}` (`?view=st` for the grimoire),
  `POST /v1/games/{id}/commands`, `GET /v1/games/{id}/night-script`,
  `GET /v1/games/{id}/seats/{n}`, `GET /v1/games/{id}/journal`.
- MCP: `create_game`, `get_game`, `run_commands`, `get_night_script`, `suggest_night_info`, `get_seat_view`,
  `get_lobby`, `send_player_message`, `get_messages`.
- Players: `GET /v1/games/{id}/lobby`, `POST /v1/games/{id}/claim` (returns a seat
  token once), then with `X-Seat-Token`: `GET /me`, `POST /vote`, `GET|POST /messages`.
- Commands are the engine in `src/core/engine/commands.ts` (atomic batches,
  `expectedVersion` for concurrency). Public views never include characters,
  alignments, storyteller tags or notes (`src/core/engine/views.ts`).

Not yet: realtime push (clients poll `version`) and the web app's "cloud game"
mode / guest page on top of these routes.

## Google OAuth token proxy (security fix I-73)

`POST /v1/auth/google/token` lets the web app sign in to Google (Cloud Sync)
without shipping the OAuth client secret. Setup is in `docs/ISSUES.md` → I-73:
`npx wrangler secret put GOOGLE_CLIENT_SECRET`, set `GOOGLE_WEB_CLIENT_ID` and
`OAUTH_ALLOWED_ORIGINS` in `wrangler.jsonc`, then set `VITE_OAUTH_TOKEN_PROXY`
for the Pages build.

## Hosted AI (P5)

`POST /v1/ai/chat` gives the web app a working AI without a user API key. The
model (`AI_CHAT_MODEL`, default `@cf/zai-org/glm-4.7-flash`) can call this
server's MCP tools through an in-process MCP client: catalog lookups, rules,
script validation / analysis, similar characters and script import links
(nothing is saved). Character embeddings (`AI_EMBED_MODEL`, default
`@cf/baai/bge-m3`) live in D1 and are refreshed automatically when the
bundled catalog changes. `GET /v1/ai/status` shows models, limits and how
many embeddings are stale.

Daily caps per UTC day (wrangler vars; `"0"` = no cap): `AI_DAILY_LIMIT`
(everyone, default 300), `AI_DAILY_LIMIT_PER_IP` (30; the IP is stored only
as a salted hash) and `AI_DAILY_LIMIT_PER_USER` (100, callers signed in with a
PAT or Google token). When the account's Workers AI allowance (10,000
neurons/day on the free plan) runs out, the API answers 429
`ai_quota_exhausted` and the app should suggest the user's own key.

One-time setup:

1. Apply the new D1 tables: `npx wrangler d1 migrations apply botc-library --remote`
   (`migrations/0002_ai.sql`).
2. `npm run deploy`. Workers AI needs no extra setup (binding `AI` in `wrangler.jsonc`).
3. `npm run smoke -- --chat` to check chat, semantic search and embeddings.

### Automatic deploys

`.github/workflows/deploy-worker.yml` tests, migrates, deploys and smoke-tests
the worker on pushes to `main` that touch `worker/`, `src/core/` or the
catalog data. Add two repository secrets (Settings → Secrets and variables →
Actions), otherwise the deploy job is skipped:

- `CLOUDFLARE_API_TOKEN`: dashboard → My Profile → API Tokens → Create Token →
  "Edit Cloudflare Workers" template, plus **Account → D1 → Edit**.
- `CLOUDFLARE_ACCOUNT_ID`: shown on the Workers & Pages overview page.

Local `wrangler dev` uses the production D1 database (`"remote": true`) and
real Workers AI, so chats there count against the same daily limits.

## Connect an agent

- **Claude Code**: `claude mcp add --transport http botc https://botc-api.<sub>.workers.dev/mcp`
- **Claude Desktop / claude.ai**: Settings → Connectors → Add custom connector → the `/mcp` URL.
- **Cursor**: `.cursor/mcp.json` → `{ "mcpServers": { "botc": { "url": "https://…/mcp" } } }`
- **Other agents**: REST with `/openapi.json`.

## Free-tier budget

Workers Free: 100,000 requests/day, 10 ms CPU per request. The catalog is
indexed once per isolate (~310 KB JSON); requests are simple lookups. Over the
limit Cloudflare returns errors instead of billing. If the public endpoint is
abused, add a rate-limiting rule in the Cloudflare dashboard (Security → WAF).

Workers AI Free: 10,000 neurons/day. Measured: a chat round costs about 2–4
neurons with a short prompt and more with the app's long context prompts
(roughly 40 at ~7k tokens); re-embedding the whole catalog costs about 50.
The daily caps above keep one caller from using it all.
