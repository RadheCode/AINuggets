CREATE TABLE reader_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES user_profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  rating_halves INTEGER NOT NULL CHECK (rating_halves BETWEEN 1 AND 10),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 20 AND 4000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reader_feedback_created_at ON reader_feedback(created_at DESC);
CREATE INDEX idx_reader_feedback_user_id ON reader_feedback(user_id);
