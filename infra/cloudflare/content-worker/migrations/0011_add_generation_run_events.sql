ALTER TABLE generation_runs ADD COLUMN run_id TEXT;

CREATE UNIQUE INDEX idx_generation_runs_run_id
  ON generation_runs(run_id)
  WHERE run_id IS NOT NULL;

CREATE TABLE generation_run_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  stage TEXT NOT NULL,
  event_name TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('info', 'succeeded', 'skipped', 'failed')),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (run_id, sequence)
);

CREATE INDEX idx_generation_run_events_run_sequence
  ON generation_run_events(run_id, sequence ASC);

CREATE INDEX idx_generation_run_events_created_at
  ON generation_run_events(created_at);
