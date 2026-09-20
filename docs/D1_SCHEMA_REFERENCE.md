# Cloudflare D1 Schema Reference

This document is the authoritative reference for every application table in the AI Nuggets Cloudflare D1 database. It explains the **what, why, where, and how** for each table, including ownership, relationships, access boundaries, retention, and privacy.

> **Maintenance rule:** Any change to D1 tables, columns, constraints, indexes, relationships, retention, or table access behavior must include an update to this document in the same change. Apply schema changes only through a new ordered migration in `infra/cloudflare/content-worker/migrations/`; never edit an applied migration.

> **Query timestamp rule:** D1 stores timestamps in UTC. Every repository-documented query and every rendered query result that includes a date-time must convert it to explicitly labeled Indian Standard Time (`IST`, UTC+05:30) for readability. Keep raw UTC values only where they are needed for filtering or ordering; never present an unlabeled UTC timestamp as reader-facing output.

## Scope and access boundary

D1 is the system of record for published editorial data, authenticated-reader data, reader feedback, and content-generation operations. The Cloudflare content Worker accesses it through the `CONTENT_DB` binding. Browser code never connects to D1 directly. Beta and production use separate databases, so any query or migration affects only the selected environment.

| Table | What it stores | Why it exists | Primary access path | Retention / sensitivity |
|---|---|---|---|---|
| `editions` | One numbered briefing and publication state (unique per `edition_date` + `edition_number`, with an `is_latest` flag) | Durable parent of a numbered briefing; permits multiple editions per day while enforcing `UNIQUE(edition_date, edition_number)` and a partial unique `is_latest` constraint | Generation repository writes; public Worker API reads published rows (latest or by `?edition=N`); generation history lookup reads published dates | Editorial data; retained until deliberately changed or removed |
| `stories` | Four or five ordered stories for an edition | Separates reader-ready stories and attribution from shared briefing copy | Generation repository writes; public Worker API reads through `editions`; generation history lookup reads destination URLs from published parents | Editorial; public only with a published parent |
| `generation_runs` | One parent record per generation attempt | Provides lifecycle status, target date, and a stable investigation `runId` | Automation writes; protected internal API and operators read | Completed rows purged after three days |
| `generation_run_events` | Ordered safe decision events within one run | Gives a detailed stage-by-stage investigation timeline | Automation writes; protected internal API and operators read | Purged with its completed parent after three days |
| `social_oauth_states` | One-time encrypted PKCE verifiers with expiry | Protects the X OAuth authorization-code callback from replay and CSRF | Protected authorization start writes; public callback consumes and deletes | Security-sensitive encrypted transient data; expired rows are removed when authorization starts |
| `social_oauth_credentials` | One encrypted renewable X refresh token | Lets the Worker obtain a short-lived user access token immediately before posting | Public callback writes; Worker social publisher reads and rotates it; no public read endpoint | Security-sensitive encrypted credential; retained until replaced or deliberately removed |
| `social_publications` | One irreversible X publication attempt per edition | Safely records the manual re-publication of an existing published edition and prevents duplicate posts | Protected production-only `POST /internal/social/x/publish` writes; no public read endpoint | Operational delivery audit; retained with its edition and cascades on deletion |
| `user_profiles` | Verified Google identity and reader activity/streak state | Provides durable identity and server-authoritative streaks | Authentication and authenticated edition requests write | Private personal data |
| `user_sessions` | Hashes of opaque session tokens and expiry times | Restores and revokes sign-in without storing usable tokens | Authentication creates; authorization reads; sign-out deletes | Security-sensitive hash; expires after 30 days |
| `user_daily_activity` | One qualifying UTC activity day per reader | Makes streak calculation idempotent and auditable | Authentication and authenticated edition requests write | Private activity history |
| `reader_feedback` | Reader email, rating, optional linked profile, and message | Preserves feedback for editorial and product review | Feedback endpoint writes; authorized operators query | Private contact data and free text |
| `newsletter_subscribers` | Distinct reader email, optional linked profile, and source | Captures newsletter interest for a future email service; unique email prevents duplicates | Newsletter endpoint writes; authorized operators query | Private contact data |
| `visitor_visits` | One anonymous page-visit event with an edge-derived country code and name | Supplies privacy-minimal visitor, country, and visit counts | Analytics endpoint writes; authorized operators run aggregate reports | Private pseudonymous analytics; raw events retained for 90 days |
| `support_events` | One privacy-minimal support-dialog engagement event (dialog open or provider checkout click) with an edge-derived country code and name | Measures support interest without storing contact data | Support endpoints write; authorized operators run aggregate reports | Private pseudonymous analytics; raw events retained for 90 days |
| `donations` | One self-reported reader donation with email, amount, provider, one-time/subscription type, and edge-derived country | Records confirmed contributions for operator review | Donation endpoint writes; authorized operators query | Private contact data (email) and financial amounts; retained until deliberately removed |

## Relationships

```mermaid
erDiagram
  editions ||--|{ stories : contains
  user_profiles ||--o{ user_sessions : authenticates
  user_profiles ||--o{ user_daily_activity : records
  user_profiles o|--o{ reader_feedback : optionally_submits
    user_profiles o|--o{ newsletter_subscribers : optionally_subscribes
    generation_runs ||--o{ generation_run_events : correlates_by_run_id
    social_oauth_states }o--|| x_oauth_callback : consumed_by
    social_oauth_credentials }o--|| x_social_publisher : read_and_rotated_by
    editions ||--o{ social_publications : publication_attempts
  visitor_visits }o--|| visitor_hash : groups_by_hash
      support_events }o--|| visitor_hash : groups_by_hash
      donations }o--|| visitor_hash : groups_by_hash
      support_events ||--o| donations : optionally_confirms
    ```

`stories`, `user_sessions`, and `user_daily_activity` use database foreign keys to their parent tables. `social_oauth_states` and `social_oauth_credentials` are deliberately standalone security tables: their state and credential values are AES-GCM ciphertext, never returned from a Worker response or generation event, and have no reader-facing API. `social_oauth_states` is consumed once by the X callback; `social_oauth_credentials` has one `x` row and is updated whenever X rotates its refresh token.  `reader_feedback.user_id` and `newsletter_subscribers.user_id` are optional: anonymous readers may submit feedback or subscribe without an account, and deleting a profile retains those rows while setting their links to `NULL`. `generation_run_events` correlates to `generation_runs` by the unique UUID `run_id`, rather than a foreign key to an internal numeric ID, so the portable automation contract does not depend on a provider-specific identifier. `support_events` and `donations` group by the same one-way `visitor_hash` used by `visitor_visits`; a donation optionally confirms a prior support event through the unique `event_id`, but neither table links to `user_profiles`.

## Editorial tables

### `editions`

**What:** One row for each numbered edition. Stores `edition_date` (`YYYY-MM-DD`), `edition_number` (positive integer, 1-based sequential count per date), briefing copy (`eyebrow`, `title`, `emphasis`, `summary`, `meta_json`), publication `status` (`draft`, `published`, or `archived`), and `is_latest` flag. The combination of `edition_date` and `edition_number` is unique.

**Why:** It is the parent and publication boundary for every numbered briefing. Prior to migration `0013`, only one edition per date existed (`edition_date` was UNIQUE). Now multiple editions per day are supported: every eligible generation run creates a new numbered edition (edition #1 morning, #2 evening, etc.) and marks it `is_latest=1`. The public API returns only `published` rows — the latest per date by default, or a specific published numbered edition via `?edition=N` — keeping drafts (and, on the default path, older editions) out of the reader experience.

**Where:** `content-engine/automation/` creates the portable edition object; `infra/cloudflare/content-worker/src/d1-edition-repository.js` persists it. `infra/cloudflare/content-worker/src/index.js` reads it for `GET /api/editions/latest`, `GET /api/editions/YYYY-MM-DD`, and `GET /api/editions/YYYY-MM-DD?edition=N`.

**How:** A successful run inserts a new numbered edition and its stories in one D1 batch. Migration `0013` safely rebuilds the table (existing rows become edition #1, `is_latest=1`); because D1 runs migrations inside a transaction where `PRAGMA foreign_keys = OFF` is a no-op, the migration stages `stories` into a temporary table before dropping `editions` to prevent the `ON DELETE CASCADE` from deleting all stories. `saveEdition` always adds a new numbered edition; it never replaces or deletes an existing one. On save, the prior `is_latest` edition for that date is flipped to `is_latest=0` and the new one is inserted with `is_latest=1`. The API selects the latest published edition on or before the requested date (or the specific edition when `?edition=N` is provided). Before a new run selects candidates, the repository uses the `(status, edition_date DESC, edition_number DESC)` index to find `published` editions in the ten editorial days before the target date; drafts and archived editions are excluded. The partial unique index `idx_editions_latest_per_date ON editions(edition_date) WHERE is_latest = 1` ensures only one latest edition per date. Deleting an edition cascades to its stories.

**Constraints:** `UNIQUE(edition_date, edition_number)`. Partial unique index: `idx_editions_latest_per_date ON editions(edition_date) WHERE is_latest = 1`. Migration `0013` rebuilds the table (existing rows become edition #1, `is_latest=1`).

### `stories`

**What:** One reader-facing story card belonging to a numbered edition. It has `story_key`, `position` (1–5), optional `layout` (`lead` or `wide`), category, title, destination URL, artwork key, source attribution, and summary variants: `summary_compact`, `summary` (Overview), and `summary_detailed`.

**Why:** Separating stories from their shared briefing lets the system order, validate, render, attribute, and summarize each item independently. Stored variants allow readers to change summary depth without another model request.

**Where:** Rows belong to `editions.id` through `edition_id`. The D1 repository writes validated generation output; the Worker retrieves ordered rows only after selecting a published parent edition (by latest or by edition number).

**How:** The content engine validates exactly four or five stories before persistence. D1 enforces unique `(edition_id, story_key)` and `(edition_id, position)` values. The Worker reads in ascending position order. For candidate repeat avoidance, the generation repository reads only `destination_url` values joined to `published` parent editions whose editorial dates fall in the ten editorial days before the target date (`D - 10 <= edition_date < D`); portable code canonicalizes those URLs before comparison and receives no reader or operational data. Same-day editions are NOT excluded from the lookback (documented tradeoff: an evening edition could reuse a morning URL). `position` is constrained to 1–5; the `(edition_id, position)` index supports retrieval; a parent deletion cascades to child rows. Migration `0013` recreates the `stories` table alongside `editions` to safely migrate the FK reference to the new editions schema.

## Generation investigation tables

### `generation_runs`

**What:** One lifecycle record for every manual or scheduled generation attempt. It stores UUID `run_id`, `target_date`, terminal-capable `status` (`started`, `skipped`, `succeeded`, `failed`), concise `details`, and start/finish timestamps.

**Why:** It supplies a stable correlation key and explains skipped, failed, and successful runs. A run is recorded even when an edition already exists or required automation configuration is absent.

**Where:** The portable generation job uses a repository contract; the D1 adapter creates and finalizes the row. Manual `POST /internal/generate` returns its `runId`; beta-only `dryRun: true` requests can create a successful investigation row without changing editorial tables (requests containing `forceReplace` are rejected with 400: "Edition overwrites are no longer supported. Each generation creates a new edition."). Protected `GET /internal/generation-runs/:runId` returns the parent run with its detailed events. It is never returned from public reader endpoints.

**How:** Each attempt first removes expired completed investigation data, creates one `started` row, then updates that same row with terminal status and `finished_at`. The `runId` has a unique partial index. Historical runs created before migration `0011` may have a `NULL` `run_id` and cannot be investigated through the new UUID timeline. A second generation run for the same date now creates a new numbered edition rather than failing or replacing an existing one.

**Retention:** Completed rows become eligible after three days. Active rows without `finished_at` are never deleted. Cleanup runs at the beginning of a later generation attempt, so records can remain beyond three days if no further attempt occurs.

### `generation_run_events`

**What:** An ordered safe event inside a `run_id`: `sequence`, `stage`, `event_name`, `outcome` (`info`, `succeeded`, `skipped`, or `failed`), optional `duration_ms`, JSON metadata, and timestamp.

**Why:** It provides precise evidence of eligibility, source collection, candidate selection, summary-provider metadata, validation, persistence, and terminal decisions instead of only a final status. A beta dry run records its explicit existing-edition bypass and persistence suppression, so it cannot be mistaken for a saved edition.

**Where:** Events originate in the injected portable logger at `content-engine/automation/pipeline/generation-event-logger.mjs`; `d1-edition-repository.js` stores them. Operators read them through the protected internal endpoint or the unified query in [Viewing the D1 Database](VIEW_D1_DATABASE.md#unified-detailed-view-for-one-generation-run).

**How:** The logger serializes concurrent writes. D1 assigns a per-run sequence and enforces unique `(run_id, sequence)`; the `(run_id, sequence ASC)` index supports ordered timelines. Retention cleanup deletes event rows before their parent runs.

**Privacy:** Metadata excludes credentials, authorization headers, raw feeds/articles, complete prompts, and raw model responses. Error messages are capped. This is an operational timeline, not a content archive.

### `social_oauth_states`

**What:** One pending X OAuth authorization attempt keyed by random `state`, with an AES-GCM-encrypted PKCE `code_verifier` and UTC `expires_at`.

**Why:** The public X callback must accept a redirect from X without exposing a bearer credential. The one-time state binds that callback to a protected operator-initiated authorization attempt and prevents replay.

**Where:** `POST /internal/social/x/authorize` creates a row only after existing automation authorization succeeds. `GET /internal/social/x/callback` reads a non-expired matching row and deletes it before exchanging the authorization code.

**How:** Migration `0018` adds the primary key and expiry index. Starting authorization removes expired rows and inserts a row expiring in ten minutes. The callback deletes its state whether it succeeds or fails, so it cannot be reused.

**Privacy:** This is encrypted authentication material. No public endpoint, logs, or generation events disclose its value.

### `social_oauth_credentials`

**What:** A single row for platform `x`, containing an AES-GCM-encrypted renewable X refresh token and UTC `updated_at`.

**Why:** X automated posting requires an OAuth user context; a static app-only bearer token cannot publish posts. The encrypted refresh token allows a short-lived access token to be requested only at posting time.

**Where:** The X callback inserts or replaces the row after a successful authorization-code exchange. The Cloudflare-specific publisher reads it after a new edition is saved as `published`, refreshes it, persists any rotated refresh token, and calls X's post API.

**How:** Migration `0018` restricts `platform` to `x`. There is no token column for browser code and no operator read endpoint. A failed social post is recorded as a safe generation-run event and does not reverse the already-published edition.

### `social_publications`

**What:** One protected X-delivery attempt for a published edition, with its `posting`, `succeeded`, or `failed` state, optional X post ID, safe failure reason, and UTC lifecycle timestamps.

**Why:** A briefing published before X authorization must be publishable without regenerating editorial content. The unique `(edition_id, platform)` constraint prevents the operator endpoint from issuing a duplicate post, including after an ambiguous delivery failure.

**Where:** `POST /internal/social/x/publish` is production-only, requires the existing automation bearer authorization, and defaults to the latest published edition. Operators can select a specific published `targetDate` and positive `editionNumber`; browser readers have no access path.

**How:** Migration `0019` adds the edition foreign key and the unique constraint. The route reserves the attempt before calling X, then records the outcome. A reservation is never automatically retried: that conservative behavior avoids duplicate posts when a network failure leaves X's delivery outcome uncertain. Deleting an edition cascades to its delivery audit.

**Privacy:** The token is encrypted with the Worker secret `X_OAUTH_ENCRYPTION_KEY`; secrets and plaintext tokens are never committed, returned, or logged.

## Reader identity and activity tables

### `user_profiles`

**What:** One verified Google identity with unique `google_subject`, current verified email, display name, optional picture URL, lifecycle timestamps, login/refresh timestamps, and current/longest streak state.

**Why:** The Google subject remains stable when email or display name changes. Server-side activity and streak fields prevent browser-controlled streaks while supplying the authenticated-reader response. The Worker applies the product-owned grace-window policy when calculating the current value.

**Where:** The Worker writes it after credential verification in `POST /auth/google`. Authenticated published-edition requests update refresh activity and may qualify for a streak. Session lookups join this table for `GET /auth/session` and authenticated edition responses.

**How:** Sign-in upserts by `google_subject`, refreshing trusted identity fields. The Worker derives dates from its UTC clock and updates streak values using `user_daily_activity`. Deleting a profile cascades to sessions and daily activity; linked feedback remains but loses its optional profile reference.

**Privacy:** Email, name, picture URL, and activity timestamps are personal data. They are never returned by public edition endpoints.

### `user_sessions`

**What:** A profile link, SHA-256 `token_hash`, Unix `expires_at`, and creation timestamp for one opaque session.

**Why:** A database row cannot be replayed as a browser credential because it contains only a hash. It enables session restoration, expiry checks, and single-session revocation through sign-out.

**Where:** `POST /auth/google` creates a row. `GET /auth/session` and authenticated edition requests read it by hash and expiry. `POST /auth/sign-out` deletes the matching row. The browser holds only the opaque token in local storage.

**How:** The Worker hashes every presented bearer token before querying, requires `expires_at` to be in the future, and creates sessions with a 30-day lifetime. `token_hash` is unique; `(token_hash, expires_at)` is indexed; profile deletion cascades to sessions.

### `user_daily_activity`

**What:** One qualifying activity date per profile: `user_id`, UTC `activity_date`, and `recorded_at`. `(user_id, activity_date)` is its composite primary key.

**Why:** It is the durable evidence behind streak state. It prevents duplicate tabs, retries, and refreshes from incrementing a streak more than once and provides a support-friendly activity history.

**Where:** The Worker writes it after verified sign-in and authenticated published-edition requests. [Daily Streak](DAILY_STREAK.md) documents the reader rules and operational queries.

**How:** The Worker calculates today's UTC date and the earliest prior date allowed by `ProductConfig.readerEngagement.streak.maximumDaysBetweenQualifyingActivities`, inserts with `ON CONFLICT(user_id, activity_date) DO NOTHING`, then conditionally updates the profile streak fields in the same D1 batch. Profile deletion cascades to activity rows.

## Reader feedback table

### `reader_feedback`

**What:** A feedback submission: optional authenticated `user_id`, email address, `rating_halves`, message, and `created_at`. Signed-in readers use their verified profile email; anonymous readers provide an email.

**Why:** Feedback must remain available for editorial and product review whether or not the reader has an account. The optional link adds context without requiring sign-in.

**Where:** `POST /api/feedback` validates and inserts the row. There is intentionally no public feedback-read endpoint; authorized operators query D1 directly.

**How:** The Worker normalizes and validates email, accepts whole-star ratings as 2, 4, 6, 8, or 10 half-star units, and accepts 20–4,000 character messages. D1 independently constrains ratings to 1–10 and message length to 20–4,000 characters. `created_at` and `user_id` indexes support review. Profile deletion sets `user_id` to `NULL` while retaining feedback.

**Privacy:** Feedback contains contact data and unstructured reader text. Never expose it publicly, add it to generation logs, or include it in beta editorial syncs.

## Newsletter subscription table

### `newsletter_subscribers`

**What:** A distinct reader email address with an optional authenticated `user_id`, a `source` label, and `created_at`. Signed-in readers use their verified profile email; anonymous readers provide an email. The `email` column is unique, so each address appears at most once.

**Why:** It captures newsletter interest for a future email service integration. No emails are sent yet — the feature is an interest preview. The unique constraint keeps the list distinct and makes repeated subscriptions idempotent.

**Where:** `POST /api/newsletter/subscribe` validates and inserts the row when the product-owned newsletter feature is enabled. There is intentionally no public newsletter-read endpoint; authorized operators query D1 directly. `export-newsletter-subscribers.ps1` is the private operator reporting path.

**How:** The Worker normalizes and validates email, uses the signed-in reader's verified profile email when available, and inserts with `ON CONFLICT(email) DO NOTHING` so a duplicate address returns an already-subscribed acknowledgement without changing the row. The unique `email` index and the `created_at` index support list review. Profile deletion sets `user_id` to `NULL` while retaining the subscription.

**Privacy:** The table contains private contact data. Never expose it publicly, add it to generation logs, or include it in beta editorial syncs.

## Visitor analytics table

### `visitor_visits`

**What:** One page-visit event with a unique random `event_id`, a SHA-256 `visitor_hash` derived from a browser-local random identifier, an ISO 3166-1 alpha-2 `country_code`, its English `country_name`, and `occurred_at`. Unavailable country metadata is represented as `unknown` / `Unknown`.

**Why:** It provides daily, Monday-based weekly, and monthly counts for unique visitors, unique countries, and page visits without storing IP addresses, precise locations, browser fingerprints, user-agent strings, referrers, or authenticated profile links.

**Where:** `script.js` creates and retains one opaque first-party browser identifier and sends one best-effort event when either public page loads. `POST /api/analytics/visits` in `infra/cloudflare/content-worker/src/index.js` validates both random IDs, hashes the visitor ID, obtains the country only from Cloudflare edge request metadata, resolves its English display name server-side, and stores both values. `report-visitor-analytics.ps1` is the private operator reporting path.

**How:** The browser sends a distinct random event ID per page load, and the primary key makes retried events idempotent. The Worker accepts requests only from an allowed configured origin. Three indexes support time-period, unique-visitor, and country aggregation. The reporting script converts current day, week, and month boundaries to explicitly labeled IST, excludes `unknown` from the unique-country metric while retaining those visits in visitor and page-view totals, and lists resolved country names with their codes in an aggregate breakdown.

**Retention and privacy:** On every accepted analytics request, the Worker deletes raw events older than 90 days. `visitor_hash` is pseudonymous private analytics data, not an account identifier: it is never joined to `user_profiles`, returned by a public endpoint, copied by editorial synchronization, or exposed by the aggregate report.

## Support engagement table

### `support_events`

**What:** One privacy-minimal support-dialog engagement event with a unique random `event_id`, an `event_type` of `support_open` (the reader opened the support dialog) or `support_option_click` (the reader clicked a provider's checkout option), a SHA-256 `visitor_hash` derived from the same browser-local random identifier used by `visitor_visits`, an optional `provider_id` (only for `support_option_click`), an ISO 3166-1 alpha-2 `country_code`, its English `country_name`, and `occurred_at`. Unavailable country metadata is represented as `unknown` / `Unknown`.

**Why:** It measures support interest — how often readers open the support dialog and which provider checkout options they click — without storing any contact or financial data. It answers "someone clicked support but did not donate" by separating engagement events from confirmed donations.

**Where:** `script.js` sends one best-effort event when the support dialog opens and another when a provider checkout option is clicked. `POST /api/support/events` in `infra/cloudflare/content-worker/src/index.js` validates both random IDs, validates the event type, requires a supported provider ID for `support_option_click`, hashes the visitor ID, obtains the country only from Cloudflare edge request metadata, and stores the row. `report-support-donations.ps1` is the private operator reporting path.

**How:** The browser sends a distinct random event ID per engagement, and the primary key makes retried events idempotent. The Worker accepts requests only from an allowed configured origin. `provider_id` is validated against the product-owned provider list in `product/config.js` when present. Three indexes support time-period, unique-visitor, and event-type aggregation. The reporting script groups events by `event_type` and `provider_id` with event counts and unique visitors.

**Retention and privacy:** On every accepted support event, the Worker deletes raw events older than 90 days. `visitor_hash` is pseudonymous private analytics data, not an account identifier: it is never joined to `user_profiles`, returned by a public endpoint, copied by editorial synchronization, or exposed by the aggregate report. No email, amount, or profile link is stored here.

## Donation table

### `donations`

**What:** One self-reported reader donation with a unique random `event_id`, a SHA-256 `visitor_hash`, the reader's normalized `email`, a positive `amount`, the selected `provider_id`, a `donation_type` of `one_time` or `subscription`, an ISO 3166-1 alpha-2 `country_code`, its English `country_name`, and `created_at`.

**Why:** Because the checkout itself is hosted by the provider (Ko-fi, Razorpay, etc.), the provider cannot return donation data to the Worker without webhooks. Donation records are captured internally as private operator telemetry so operators can review donations (email, amount, provider, one-time/subscription, country) without a processor SDK. No reader-facing form is shown.

**Where:** `POST /api/support/donations` in `infra/cloudflare/content-worker/src/index.js` validates both random IDs, normalizes and validates the email, validates the amount (finite, > 0, ≤ 1,000,000), requires a supported provider ID, validates the donation type, hashes the visitor ID, obtains the country from Cloudflare edge request metadata, and inserts the row. `report-support-donations.ps1` is the private operator reporting path.

**How:** The unique `event_id` makes retried submissions idempotent (`ON CONFLICT(event_id) DO NOTHING`). The Worker accepts requests only from an allowed configured origin. Indexes support time-period, email, provider, and country aggregation. The reporting script lists every donation with `id`, `email`, `amount`, `provider_id`, `donation_type`, `country`, and `recorded_at_ist` (converted from UTC).

**Privacy:** The table contains private contact data (email) and financial amounts. Never expose it publicly, add it to generation logs, or include it in beta editorial syncs. It is never returned by a public endpoint.
