ALTER TABLE user_profiles ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN streak_last_active_date TEXT;

CREATE TABLE user_daily_activity (
  user_id INTEGER NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_date TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, activity_date),
  CHECK (activity_date GLOB '????-??-??')
);
