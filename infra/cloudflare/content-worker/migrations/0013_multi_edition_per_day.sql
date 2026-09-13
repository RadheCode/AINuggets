PRAGMA foreign_keys = OFF;

-- Support multiple editions per editorial day. The edition_date is no longer
-- globally unique: each run adds a new numbered edition for its target date and
-- marks it as the latest one. Existing single editions become edition #1.
--
-- NOTE: D1 runs each migration inside a transaction, where PRAGMA foreign_keys
-- is a no-op. Dropping the editions table directly would therefore trigger the
-- ON DELETE CASCADE on stories.edition_id and delete every story. To avoid that
-- data loss, stories are staged into a temporary table first and re-created
-- after editions is replaced.

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

-- Stage stories so the editions DROP below cannot cascade-delete them.
CREATE TABLE stories_multi_edition (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_id INTEGER NOT NULL REFERENCES editions_multi_edition(id) ON DELETE CASCADE,
  story_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
  layout TEXT CHECK (layout IN ('lead', 'wide') OR layout IS NULL),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  destination_url TEXT NOT NULL,
  artwork_key TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT,
  source_published_at TEXT,
  summary_compact TEXT,
  summary_detailed TEXT,
  UNIQUE (edition_id, story_key),
  UNIQUE (edition_id, position)
);

INSERT INTO stories_multi_edition (
  id, edition_id, story_key, position, layout, category, title, summary,
  destination_url, artwork_key, source_url, source_name, source_published_at,
  summary_compact, summary_detailed
)
SELECT
  id, edition_id, story_key, position, layout, category, title, summary,
  destination_url, artwork_key, source_url, source_name, source_published_at,
  summary_compact, summary_detailed
FROM stories;

DROP TABLE stories;
DROP TABLE editions;
ALTER TABLE editions_multi_edition RENAME TO editions;
ALTER TABLE stories_multi_edition RENAME TO stories;

CREATE INDEX idx_editions_public_date ON editions(status, edition_date DESC, edition_number DESC);
CREATE UNIQUE INDEX idx_editions_latest_per_date ON editions(edition_date) WHERE is_latest = 1;
CREATE INDEX idx_stories_edition_position ON stories(edition_id, position);

PRAGMA foreign_keys = ON;