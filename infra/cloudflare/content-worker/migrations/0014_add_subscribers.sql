CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  user_id INTEGER REFERENCES user_profiles(id) ON DELETE SET NULL,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_subscribers_email ON subscribers (email);
CREATE INDEX idx_subscribers_created_at ON subscribers(created_at DESC);