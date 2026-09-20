CREATE TABLE social_oauth_states (
  state TEXT PRIMARY KEY,
  code_verifier_ciphertext TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_social_oauth_states_expires_at ON social_oauth_states(expires_at);

CREATE TABLE social_oauth_credentials (
  platform TEXT PRIMARY KEY CHECK (platform = 'x'),
  refresh_token_ciphertext TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);