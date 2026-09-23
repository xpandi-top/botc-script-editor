export type Env = {
  /** Web app URL that share links open (the GitHub Pages deployment). */
  APP_URL: string
  /** Optional Firestore config for short share links (public web client values). */
  FIREBASE_PROJECT_ID?: string
  FIREBASE_API_KEY?: string
  /** OAuth token proxy (I-73): the web app's Google client id, its secret (Worker secret) and allowed origins. */
  GOOGLE_WEB_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  /** Comma-separated origins allowed to use the token proxy, e.g. https://xpandi-top.github.io,http://localhost:5173 */
  OAUTH_ALLOWED_ORIGINS?: string
  /** Extra Google OAuth client ids (Android, Electron) whose access tokens may sign in to /v1/me. */
  GOOGLE_CLIENT_IDS?: string
  /** Cloud library database (P2). Without it /v1/me answers 503 and MCP stays read-only. */
  DB?: D1Database
  /** Cloud games (P3): one Durable Object per game (GameRoom). */
  GAMES?: DurableObjectNamespace
}
