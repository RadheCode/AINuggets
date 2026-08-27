PRAGMA foreign_keys = OFF;

CREATE TABLE stories_configurable_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_id INTEGER NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
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

INSERT INTO stories_configurable_summaries (
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
ALTER TABLE stories_configurable_summaries RENAME TO stories;
CREATE INDEX idx_stories_edition_position ON stories(edition_id, position);

PRAGMA foreign_keys = ON;
