# BOTC Companion API (Cloudflare Worker)

Public REST API and MCP server for agents: Blood on the Clocktower characters,
scripts, jinxes and night order (English + Chinese), plus script validation,
analysis and drafting. Plan and roadmap: [`../docs/ARCHITECTURE-API.md`](../docs/ARCHITECTURE-API.md).

- No LLM runs here — the calling agent does the reasoning (free to run).
- No accounts or database yet. `create_script_draft` returns a link that
  imports the script into the web app when the user opens it.
- Game logic, validation and the catalog come from `../src/core` (shared with
  the web app). The catalog snapshot is generated from `../assets` on every
  `dev`, `test`, `typecheck` and `deploy`.

## Endpoints

| Path | What |
|---|---|
| `/mcp` | MCP (Streamable HTTP, stateless, no auth) |
| `/v1/...` | REST — see `/llms.txt` or `/openapi.json` |
| `/` | Service info |

MCP tools: `search_characters`, `get_character`, `get_jinxes`, `get_night_order`, `search_rules`,
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

## Deploy (manual, one-time setup)

Needs a free Cloudflare account; no credit card.

1. `cd worker && npx wrangler login` (opens the browser).
2. Check `APP_URL` in `wrangler.jsonc` is the deployed web app
   (`https://xpandi-top.github.io/botc-script-editor/`).
3. `npm run deploy` → prints `https://botc-api.<your-subdomain>.workers.dev`.
4. Optional, for 7-character short links instead of long inline links: set
   `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY` in `wrangler.jsonc` to the same
   public web config the app uses (`VITE_FIREBASE_PROJECT_ID` /
   `VITE_FIREBASE_API_KEY`), then deploy again. Links then use the existing
   Firestore `shortlinks` collection (24 h expiry).

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
