export type Env = {
  /** Web app URL that share links open (the GitHub Pages deployment). */
  APP_URL: string
  /** Optional Firestore config for short share links (public web client values). */
  FIREBASE_PROJECT_ID?: string
  FIREBASE_API_KEY?: string
  /** OAuth token proxy (I-73): the web app's Google client id, its secret (Worker secret) and allowed origins. */
  GOOGLE_WEB_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  /** Comma-separated origins allowed to use the token proxy, e.g. https://apps.xpandi.top,http://localhost:5173 */
  OAUTH_ALLOWED_ORIGINS?: string
  /** Extra Google OAuth client ids (Android, Electron) whose access tokens may sign in to /v1/me. */
  GOOGLE_CLIENT_IDS?: string
  /** Cloud library database (P2). Without it /v1/me answers 503 and MCP stays read-only. */
  DB?: D1Database
  /** Cloud games (P3): one Durable Object per game (GameRoom). */
  GAMES?: DurableObjectNamespace
  /** Workers AI (P5): hosted chat and character embeddings. Without it /v1/ai and similarity answer 503. */
  AI?: AiRunner
  /** Workers AI model ids; defaults in src/ai/models.ts. */
  AI_CHAT_MODEL?: string
  AI_EMBED_MODEL?: string
  /** Hosted chat requests per UTC day: all callers, per IP, per signed-in user. "0" disables that cap. */
  AI_DAILY_LIMIT?: string
  AI_DAILY_LIMIT_PER_IP?: string
  AI_DAILY_LIMIT_PER_USER?: string
  /** Workers AI neurons hosted chat may use per UTC day (free plan: 10,000 for everything). */
  AI_DAILY_NEURONS?: string
}

/** The part of the Workers AI binding the worker uses (tests pass a fake). */
export type AiRunner = { run(model: string, inputs: Record<string, unknown>): Promise<unknown> }
