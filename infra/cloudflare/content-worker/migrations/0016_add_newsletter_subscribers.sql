-- Adds the newsletter_subscribers table for the newsletter interest-capture feature.
-- Each row stores one distinct, normalized email address that opted into the
-- daily newsletter. Signed-in readers link their verified profile; anonymous
-- readers provide an email directly. Emails are unique so a reader can only
-- appear once regardless of how they subscribe.
CREATE TABLE newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  user_id INTEGER REFERENCES user_profiles(id) ON DELETE SET NULL,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers (email);
CREATE INDEX idx_newsletter_subscribers_created_at ON newsletter_subscribers(created_at DESC);