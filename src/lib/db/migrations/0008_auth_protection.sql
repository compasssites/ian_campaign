CREATE TABLE IF NOT EXISTS auth_request_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_request_limits_cleanup ON auth_request_limits(window_start);

ALTER TABLE users ADD COLUMN auth_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS session_revocations (token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS session_revocations_expiry ON session_revocations(expires_at);
