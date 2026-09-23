-- P2 cloud library (docs/ARCHITECTURE-API.md). Apply with:
--   npx wrangler d1 migrations apply botc-library --remote

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,            -- "google:<sub>"
  email TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

-- Personal access tokens for agents/scripts. Only the SHA-256 of the token is stored.
CREATE TABLE IF NOT EXISTS api_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS api_tokens_user ON api_tokens(user_id);

-- Library documents: kind = script | character | record. data is the app's JSON
-- (EditableScript / CustomCharacter / GameRecord). Deletes leave a tombstone so
-- other devices learn about them when they sync.
CREATE TABLE IF NOT EXISTS documents (
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  PRIMARY KEY (user_id, kind, id)
);
CREATE INDEX IF NOT EXISTS documents_sync ON documents(user_id, kind, updated_at);
