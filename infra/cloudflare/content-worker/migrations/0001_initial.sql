PRAGMA foreign_keys = ON;

CREATE TABLE editions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_date TEXT NOT NULL UNIQUE CHECK (edition_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  eyebrow TEXT NOT NULL,
  title TEXT NOT NULL,
  emphasis TEXT NOT NULL,
  summary TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '[]',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  edition_id INTEGER NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  story_key TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
  layout TEXT CHECK (layout IN ('lead', 'wide') OR layout IS NULL),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  artwork_key TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT,
  source_published_at TEXT,
  UNIQUE (edition_id, story_key),
  UNIQUE (edition_id, position)
);

CREATE TABLE generation_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'skipped', 'succeeded', 'failed')),
  details TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT
);

CREATE INDEX idx_editions_public_date ON editions(status, edition_date DESC);
CREATE INDEX idx_stories_edition_position ON stories(edition_id, position);
CREATE INDEX idx_generation_runs_target ON generation_runs(target_date, started_at DESC);

INSERT INTO editions (
  edition_date, status, eyebrow, title, emphasis, summary, meta_json, published_at
) VALUES (
  '2026-08-23',
  'published',
  'Fresh briefing',
  'AI news.',
  'Less noise.',
  'The five AI updates that matter today, distilled into quick reads with context, impact, and links to go deeper.',
  '["5 stories","4 min read","No hype"]',
  '2026-08-23T00:00:00Z'
);

INSERT INTO stories (
  edition_id, story_key, position, layout, category, title, summary, destination_url, artwork_key
) VALUES
  ((SELECT id FROM editions WHERE edition_date = '2026-08-23'), 'models', 1, 'lead', 'Models', 'Open models close the reasoning gap', 'A compact release brings stronger planning to local devices.', '#story-models', 'models'),
  ((SELECT id FROM editions WHERE edition_date = '2026-08-23'), 'agents', 2, NULL, 'Agents', 'Browsers become the new agent workspace', 'Tool use shifts toward dependable workflows.', '#story-agents', 'agents'),
  ((SELECT id FROM editions WHERE edition_date = '2026-08-23'), 'research', 3, NULL, 'Research', 'Smaller datasets, sharper fine-tuning', 'Training needs fewer examples.', '#story-research', 'research'),
  ((SELECT id FROM editions WHERE edition_date = '2026-08-23'), 'product', 4, 'wide', 'Product', 'Voice interfaces learn when to stay quiet', 'Better turn-taking makes assistants less intrusive.', '#story-product', 'product'),
  ((SELECT id FROM editions WHERE edition_date = '2026-08-23'), 'business', 5, NULL, 'Business', 'Enterprise AI spending moves to inference', 'Budgets follow real production usage.', '#story-business', 'business');
