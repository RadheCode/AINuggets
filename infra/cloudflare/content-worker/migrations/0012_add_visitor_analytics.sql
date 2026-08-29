CREATE TABLE visitor_visits (
  event_id TEXT PRIMARY KEY,
  visitor_hash TEXT NOT NULL,
  country_code TEXT NOT NULL CHECK (country_code = 'unknown' OR country_code GLOB '[A-Z][A-Z]'),
  country_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visitor_visits_occurred_at ON visitor_visits(occurred_at DESC);
CREATE INDEX idx_visitor_visits_visitor_occurred_at ON visitor_visits(visitor_hash, occurred_at DESC);
CREATE INDEX idx_visitor_visits_country_occurred_at ON visitor_visits(country_code, occurred_at DESC);
