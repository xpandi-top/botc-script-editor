-- Feedback on AI answers (docs/AI-ARCHITECTURE-OFFLINE-FIRST.md §19): a rated
-- answer or a shared conversation, with each answer's trace (route, provider,
-- model, prompt version, facts and passages used, checks, latency). The
-- columns are for grouping, and `payload` is the whole item as sent. No IP is kept.
CREATE TABLE IF NOT EXISTS ai_feedback (
  id             TEXT    PRIMARY KEY,
  created_at     INTEGER NOT NULL,
  kind           TEXT    NOT NULL,
  rating         TEXT,
  reasons        TEXT,
  comment        TEXT,
  language       TEXT,
  route          TEXT,
  provider       TEXT,
  model          TEXT,
  prompt_version TEXT,
  build          TEXT,
  question       TEXT,
  payload        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_feedback_created ON ai_feedback (created_at);
