-- P5 hosted AI (docs/ARCHITECTURE-API.md §7.5).

-- Character vectors per embedding model. `hash` is a hash of the embedded text
-- (src/core/ai/embeddingText.ts): rows whose hash no longer matches the
-- catalog are re-embedded. `vector` is base64 int8, dequantized with `scale`.
CREATE TABLE IF NOT EXISTS character_embeddings (
  model      TEXT    NOT NULL,
  id         TEXT    NOT NULL,
  hash       TEXT    NOT NULL,
  dims       INTEGER NOT NULL,
  scale      REAL    NOT NULL,
  vector     TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (model, id)
);

-- Hosted chat requests per UTC day and subject ("global", "ip:<salted hash>", "user:<id>").
CREATE TABLE IF NOT EXISTS ai_usage (
  day     TEXT    NOT NULL,
  subject TEXT    NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, subject)
);
