PRAGMA foreign_keys = OFF;

-- Support multiple editions per editorial day. The edition_date is no longer
-- globally unique: each run adds a new numbered edition for its target date and
-- marks it as the latest one. Existing single editions become edition #1.

CREATE TABLE editions_multi_edition (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_date TEXT NOT NULL CHECK (edition_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  edition_number INTEGER NOT NULL CHECK (edition_number >= 1),
  is_latest INTEGER NOT NULL DEFAULT 0 CHECK (is_latest IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  eyebrow TEXT NOT NULL,
  title TEXT NOT NULL,
  emphasis TEXT NOT NULL,
  summary TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '[]',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (edition_date, edition_number)
);

INSERT INTO editions_multi_edition (
  id, edition_date, edition_number, is_latest, status, eyebrow, title,
  emphasis, summary, meta_json, published_at, created_at, updated_at
)
SELECT
  id, edition_date, 1, 1, status, eyebrow, title, emphasis, summary,
  meta_json, published_at, created_at, updated_at
FROM editions;

DROP TABLE editions;
ALTER TABLE editions_multi_edition RENAME TO editions;

CREATE INDEX idx_editions_public_date ON editions(status, edition_date DESC, edition_number DESC);
CREATE UNIQUE INDEX idx_editions_latest_per_date ON editions(edition_date) WHERE is_latest = 1;

PRAGMA foreign_keys = ON;