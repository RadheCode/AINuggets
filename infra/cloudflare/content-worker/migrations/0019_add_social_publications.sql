CREATE TABLE social_publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_id INTEGER NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform = 'x'),
  status TEXT NOT NULL CHECK (status IN ('posting', 'succeeded', 'failed')),
  post_id TEXT,
  failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (edition_id, platform)
);

CREATE INDEX idx_social_publications_edition ON social_publications(edition_id, created_at DESC);
