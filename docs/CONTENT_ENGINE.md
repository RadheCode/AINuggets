# Content Engine

This guide describes the complete path from product-approved sources to the fixed story tiles on the homepage. It covers daily generation, review and publication, public delivery, and browser rendering.

## What the content engine owns

The content engine keeps editorial content separate from visual themes:

- gathers source candidates and creates a daily edition;
- validates and stores the edition in the content database;
- exposes **published** editions through a public API;
- loads an edition in the browser and renders stable story-tile markup.

Themes only control presentation. They do not fetch or transform editorial data.

## End-to-end flow

```mermaid
flowchart TD
    A["⏰ Scheduler\nCloudflare Cron, GitHub Actions, or OS cron"] --> B["📅 Portable scheduled runner\nCalculates the UTC edition date"]
    B --> C{"Edition already exists\nfor that date?"}

    C -- "Yes" --> D["⏭️ Record skipped run\nNo duplicate is created"]
    C -- "No" --> E["📰 Candidate collection\nApproved RSS/Atom feeds or custom JSON source"]
    E --> F["🧹 Normalize URLs, deduplicate, and exclude prior-ten-day published stories"]
    F --> G["📊 Apply configured candidate order\nPriority/freshness or random; diversify exactly five"]
    G --> H["🤖 Summary provider\nProduces 4–5 concise stories"]
    H --> I["✅ Domain validation\nRequired fields, safe URLs, IDs, layouts, artwork"]

    I -- "Invalid" --> J["❌ Record failed run\nPreviously published edition remains live"]
    I -- "Valid" --> K["💾 D1 transaction\nSave edition and stories with configured status"]
    K --> L{"Automatic publication?"}
    L -- "Yes" --> M["📢 Publish validated edition"]
    L -- "No" --> Q["👤 Editorial review"] --> M

    M --> N["🌐 Content Worker API\nServes published editions only"]
    N --> O["🖥️ Browser loader\nFetches latest or ?date=YYYY-MM-DD"]
    O --> P["🎨 Theme-independent renderer\nBuilds fixed tile slots and summary dialog"]
```

## Components and responsibilities

| Area | Location | Responsibility |
|---|---|---|
| Public API configuration | `product/config.js` | Defines the browser-visible Worker base URLs. |
| Browser loader | `content-engine/loader.js` | Validates an optional preview date, requests an edition, and rejects malformed API payloads. |
| Browser renderer | `content-engine/render.js` | Creates semantic tile buttons, stable slot classes, and the summary dialog behavior. |
| Engine configuration | `content-engine/content-engine.config.mjs` | Human-editable UTC schedule and publication mode. |
| Product editorial configuration | `product/editorial-config.mjs` | Product-approved feeds, candidate-selection mode, and generation instruction. |
| Daily automation | `content-engine/automation/` | Portable source collection, summary generation, validation, idempotency, and audit orchestration. |
| Worker adapter | `infra/cloudflare/content-worker/src/` | Connects the portable automation to Cron, D1, secrets, and public HTTP routes. |
| Content database | Cloudflare D1 `ai-nuggets-content` | Source of truth for editions, stories, and generation audit records. |
| Theme | `themes/<theme-id>/` | Styles the stable markup; never fetches or changes content. |

## Daily edition lifecycle

### 1. Schedule and editorial date

The scheduler calls the portable runner. The central configuration supplies the UTC Cron expression, and the deployment script derives the Cloudflare Cron trigger from it. The runner computes the edition `YYYY-MM-DD` date in UTC rather than relying on a server's local clock.

### 2. Idempotency and auditing

Before collection, the job asks the repository whether an edition already exists for the target date. If it does, the job records a `skipped` run and exits without overwriting editorial content. Each attempt is audited as `started`, `skipped`, `succeeded`, or `failed`.

### 3. Candidate collection

By default, the built-in collector reads the editable product-approved feed list in `product/editorial-config.mjs`:

1. Fetch up to three recent posts from each RSS or Atom feed.
2. Remove tracking parameters and normalize candidate URLs.
3. Drop duplicate canonical links and exclude a canonical URL already used by a `published` edition in the prior ten editorial days. Draft and archived editions do not participate.
4. Apply the configured candidate-selection mode: rank by source priority and recency in `priority` mode, or shuffle in `random` mode.
5. Prefer category diversity, then fill the remaining positions until exactly five candidates are selected. If fewer than five survive, fail before calling the summary provider.

An optional HTTPS JSON candidate endpoint can replace the built-in collector. Feed and custom-source requests are bounded by timeouts. A single unavailable feed does not cancel the run; a run fails only if no usable source candidates remain.

The built-in collector's selection mode is product configuration. The current `random` setting ignores retained numeric feed priorities and recency for that run, shuffles eligible candidates, and preserves category diversity. Set it to `priority` to use those retained values for ranking. Custom JSON sources control their own ordering.

For the full canonicalization, ten-day published-history, priority-score, random-shuffle, diversity, and exact-five failure algorithm, see [Detailed candidate-selection algorithm](DAILY_CONTENT_AUTOMATION.md#detailed-candidate-selection-algorithm).

### 4. Summarization and selection

An OpenAI-compatible summary provider receives exactly five eligible candidates and returns a structured edition containing four or five stories. The product-level `summaryFeatures.generation` configuration selects which summary variants are generated and stored for each new story; the default is Quick take, Overview, and Deep dive. Provider settings are supplied at runtime; API keys never belong in browser assets, logs, or Git.

### 5. Validation

The domain layer rejects an edition unless it has:

- the requested editorial date;
- exactly four or five stories;
- unique story IDs and ordered positions;
- required category, title, every configured generated summary context meeting its mandatory minimum length and format, destination, and artwork fields; configured maximums are advisory targets that never force truncation;
- HTTPS story and source URLs where URLs are present;
- supported artwork keys: `models`, `agents`, `research`, `product`, or `business`;
- exactly one `lead` story and no more than one `wide` story;
- briefing copy constrained to fit the fixed bento layout.

Validation happens before persistence. A malformed provider response cannot replace the currently published edition.

### 6. Persistence and publication

A valid edition and all of its stories are written together in one D1 transaction. By default, `publication.automaticallyPublish` is `true`, so validated editions are published immediately. Set it to `false` when an editor must review and publish each edition.

If any step fails, the run is marked `failed`; the last valid published edition remains available to readers.

## Data model

| Table | Key fields | Purpose |
|---|---|---|
| `editions` | `edition_date`, `status`, briefing fields, `published_at` | One daily briefing. Status is `draft`, `published`, or `archived`. |
| `stories` | `edition_id`, `position`, `layout`, title, configured summary variants, source metadata | Four or five ordered stories for an edition. |
| `generation_runs` | `target_date`, `status`, timestamps, details | Immutable operational history for each automation attempt. |

The `stories` table enforces unique positions and story keys per edition. The database schema and migrations are under `infra/cloudflare/content-worker/migrations/`.

## Publication and public delivery

The Worker exposes only published content:

| Route | Behavior |
|---|---|
| `GET /health` | Returns Worker availability. |
| `GET /api/editions/latest` | Returns the newest published edition on or before today's editorial date. |
| `GET /api/editions/YYYY-MM-DD` | Returns the newest published edition on or before the requested date. |
| `POST /internal/generate` | Authenticated operational endpoint that runs generation for a supplied or current target date. It is not a public browser endpoint. |

The API returns a single edition object with briefing metadata and ordered stories. Responses are edge-cacheable and browser access is restricted to configured allowed origins. Draft and archived editions never appear in public API responses.

## Beta and production isolation

Beta and production run identical content contracts on separate Cloudflare resources. The product configuration selects the production Worker only when the hostname exactly matches its configured production hostname; beta and all non-production preview hostnames select the configured beta endpoint. This keeps preview traffic, editions, sessions, feedback, automation, and scheduled generation away from production.

The beta Worker accepts browser requests only from `https://beta-ai-nuggets.pages.dev` plus local development origins. The production Worker retains its separate production-origin allowlist. See [Cloudflare infrastructure](CLOUDFLARE_INFRASTRUCTURE.md) for protected deployment commands and resource provisioning.

## Browser rendering path

1. `content-engine/loader.js` reads `?date=YYYY-MM-DD`, when provided, and validates the date.
2. It requests `/api/editions/latest` or the date-specific route from the Worker URL in `product/config.js`.
3. It verifies the returned briefing and four-to-five-story payload before exposing it as `window.ProductContentReady`.
4. `content-engine/render.js` creates one accessible button per story and assigns deterministic slot classes such as `story-card--slot-1` through `story-card--slot-5`.
5. The active theme uses those stable classes to place the cards. Selecting a tile opens a compact dialog on the configured default summary. Its footer keeps previous/next buttons available and shows the keyboard shortcuts in clear words: Tab switches the summary level, Up and Down arrows scroll the content, and Left and Right arrows browse stories. The renderer derives accessible controls from the product-level `summaryFeatures.ui` configuration and omits any enabled UI context unavailable in that edition, so it never shows an empty control. Switching between available persisted layers does not make another request.

The rendering layer is intentionally theme-independent, so a theme switch can restyle the same content without changing its data contract or interaction behavior.

## Operational safeguards

- The portable automation core does not import Cloudflare or D1 code; cloud-specific code is a runtime adapter.
- Source material is untrusted input. The system never executes instructions found in articles or feeds.
- Raw copyrighted article text is not stored; the product stores original summaries and source attribution.
- Missing model configuration produces a safe skipped run rather than fabricated content.
- Partial provider configuration is rejected with the missing setting names.
- Publication is configured centrally: automatic publication is enabled by default, while review mode saves drafts for editorial approval.
- Failure leaves the last published edition available.

## Central configuration

Edit `content-engine/content-engine.config.mjs` to control the following non-secret settings in one place:

| Setting | Purpose | Change effect |
|---|---|---|
| `schedule.cron` | Twice-daily Cron expression in UTC, using Cloudflare's five-field syntax. The default `30 11,23 * * *` runs at 5:00 AM and 5:00 PM IST (11:30 and 23:30 UTC). | Worker deployment applies the new trigger. |
| `publication.automaticallyPublish` | `true` publishes validated editions immediately; `false` saves them as drafts. | Worker deployment changes future generation only. |
| `feeds` | Approved RSS/Atom sources with `name`, HTTPS `feedUrl`, `category`, and numeric `priority`. | Worker deployment applies additions, removals, and edits. |

After editing this file, deploy the content Worker so its Cron trigger and runtime adapter receive the updated configuration:

```powershell
.\infra\cloudflare\content-worker\deploy.ps1
```

`automaticallyPublish` is `true` by default. Set it to `false` when editorial review is required. Feed changes apply only when `CONTENT_SOURCE_URL` is not configured; that optional runtime setting replaces the built-in feed collector with a custom JSON source.

Summary feature configuration is separately owned by `product/config.js`; see [Product configuration](PRODUCT_CONFIGURATION.md#summary-feature-capabilities). A change to `summaryFeatures.ui` needs the browser deployment, while a change to `summaryFeatures.generation` needs the Worker deployment before it affects future generated editions.

## Related documentation

- [Daily content automation](DAILY_CONTENT_AUTOMATION.md): provider configuration, scheduler adapters, local testing, and deployment details.
- [Viewing the D1 database](VIEW_D1_DATABASE.md): dashboard and Wrangler queries for editions, stories, and runs.
- [Content Engine API](CONTENT_ENGINE_API.md): quick directory-level API and ownership reference.
