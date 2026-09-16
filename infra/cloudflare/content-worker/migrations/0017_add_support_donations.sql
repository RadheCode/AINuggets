-- Adds support-engagement and donation-recording tables for the reader support
-- (donation) feature.
--
-- support_events records privacy-minimal engagement with the support dialog:
-- opening the dialog (support_open) and clicking a provider's checkout option
-- (support_option_click). It mirrors visitor_visits: an opaque browser
-- identifier stored only as a one-way hash, an edge-derived country, and a
-- timestamp. No email, amount, or profile link is stored here.
--
-- donations records confirmed reader donations. Because the checkout itself is
-- hosted by the provider (Ko-fi, Razorpay, etc.), the reader self-reports the
-- completed contribution through the support dialog: email, amount, the
-- selected provider, whether it is a one-time or subscription contribution,
-- and the edge-derived country. The unique event_id makes retried submissions
-- idempotent.
CREATE TABLE support_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('support_open', 'support_option_click')),
  visitor_hash TEXT NOT NULL,
  provider_id TEXT,
  country_code TEXT NOT NULL CHECK (country_code = 'unknown' OR country_code GLOB '[A-Z][A-Z]'),
  country_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_events_occurred_at ON support_events(occurred_at DESC);
CREATE INDEX idx_support_events_visitor_occurred_at ON support_events(visitor_hash, occurred_at DESC);
CREATE INDEX idx_support_events_type_occurred_at ON support_events(event_type, occurred_at DESC);

CREATE TABLE donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  visitor_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  provider_id TEXT NOT NULL,
  donation_type TEXT NOT NULL CHECK (donation_type IN ('one_time', 'subscription')),
  country_code TEXT NOT NULL CHECK (country_code = 'unknown' OR country_code GLOB '[A-Z][A-Z]'),
  country_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX idx_donations_email ON donations(email);
CREATE INDEX idx_donations_provider_created_at ON donations(provider_id, created_at DESC);
CREATE INDEX idx_donations_country_created_at ON donations(country_code, created_at DESC);