# Content Engine

This folder owns how the site loads and renders published content from the configured content API.

- `../product/config.js` defines the public content API endpoint.
- `loader.js` requests the latest edition, or the edition selected by `?date=YYYY-MM-DD` and optional `?edition=N`.
- `render.js` converts that content into the stable semantic selectors used by every theme.
- `../product/company-images.js` matches product-specific entity terms in each story title and summaries to local artwork in `../product/company-images/`. Stories without a match remain image-free.
- `automation/` contains the portable daily-edition job, scheduler-neutral runner, CLI trigger, RSS/Atom blog collector, HTTP source/model adapters, provider-configuration contract, domain validation, and tests. It is not published as a Pages asset.

The source of truth is the `ai-nuggets-content` Cloudflare D1 database. Its schema, seed data, API Worker, and scheduled trigger live under `infra/cloudflare/content-worker/`.

Keep visual styling in `themes/` and shared interactions in the root `script.js`. API story records must include a unique `id`, `category`, `title`, `summaries.compact`, `summaries.standard`, `summaries.detailed`, `href`, and `art`. The optional `type` value may be `lead` or `wide`.

To preview an edition, use `?date=YYYY-MM-DD` (optionally with `?edition=N` for a specific numbered edition), for example `http://localhost:8080/?date=2026-08-23`. The API returns the latest published edition on or before the requested date (or the specific edition when `?edition=N` is supplied).

A story can be deep-linked with a `#story-<id>` hash that composes with the edition query, for example `http://localhost:8080/?date=2026-08-23#story-agents`. The browser renderer opens that story's dialog on load, updates the hash as the reader browses stories, and clears it when the dialog closes. The hash is a client-side concern only; the content API ignores it. The story dialog's Share panel copies this deep link and offers social share actions for X, Facebook, WhatsApp, LinkedIn, and email.

`content-engine.config.mjs` is the source of truth for the UTC Cron schedule and the automatic-publication switch. Product-specific approved RSS/Atom feeds and the generation instruction live in the `editorial` section of `../product/config.js`. The content engine uses UTC consistently for scheduled generation and the public `latest` endpoint, so it has no separate timezone setting. Validated editions publish by default; set `automaticallyPublish` to `false` to require editorial review. The built-in collector fetches up to three recent posts per source. Portable selection removes duplicate canonical links and URLs used by published editions in the ten editorial days before the target date (`D - 10 <= edition_date < D`; same-day editions are not excluded), applies the configured priority/freshness or random ordering, preserves category diversity, and passes exactly five eligible candidates to the model; fewer than five fails before generation. Every eligible run creates a new numbered edition — the content engine no longer refreshes/overwrites an existing edition and there is no `forceReplace` or `replaceExisting`; the CLI `--force-replace` flag was removed. The automation core has no Cloudflare or D1 imports. `automation/config/providers.example.env` is the human-readable provider configuration template. Copy it to the Git-ignored `providers.local.env` and fill in model values. Leave `CONTENT_SOURCE_URL` blank to use the built-in collector, or set it to replace the collector with a custom JSON candidate API. `automation/config/create-generation-provider-dependencies.mjs` defines the provider setting names, validates them, and creates the dependencies from plain runtime values. A scheduler or infrastructure adapter only injects those values and supplies an edition repository. Any cron service can invoke `automation/cli/run-scheduled-edition.mjs` with its own adapter module. See [Daily content automation](DAILY_CONTENT_AUTOMATION.md) for the portable workflow, configuration contract, D1 persistence, and scheduler adapters.

After editing `automation/config/providers.local.env`, run `.\automation\test-provider-config.ps1` from this directory to make one small, local test request to the summary provider before syncing any secrets. The command validates the provider's structured response and never displays API keys.

## Authentication API

The content Worker provides Google-only sign-in and durable session endpoints. The browser sends the opaque session token as `Authorization: Bearer <token>`. Tokens are valid for 30 days; the Worker stores only their SHA-256 hashes in D1. Authentication endpoints allow configured browser origins, `GET`, `POST`, and the `authorization` and `content-type` request headers.

Each Google identity has one `user_profiles` record. The Worker updates both `last_logged_in_at` and `last_refreshed_at` when that email completes Google sign-in, because a completed login counts as a page refresh. An authenticated browser requesting a published edition also updates `last_refreshed_at`.

The Worker records at most one qualifying activity for each user per UTC calendar date. A qualifying Google sign-in or authenticated published-edition request starts a streak at `1`, increments it when the prior active date is within the configured four-day UTC window, and resets it to `1` after a longer gap. `currentStreak` is the active streak and `longestStreak` is the user's historical best. The browser never submits a date or counter value. Authenticated edition responses are private and not cached, ensuring that each page fetch reaches the Worker and can record the refresh.

### `POST /auth/google`

Exchange a Google Identity Services credential for a site session. The Worker verifies the credential signature, issuer, audience, expiry, and verified email before creating or updating the matching D1 profile.

Request body:

```json
{
  "credential": "GOOGLE_ID_TOKEN"
}
```

Successful response (`201 Created`):

```json
{
  "user": {
    "email": "reader@example.com",
    "name": "Reader",
    "pictureUrl": "https://...",
    "lastLoggedInAt": "2026-08-25 01:00:00",
    "lastRefreshedAt": "2026-08-25 01:00:00",
    "currentStreak": 4,
    "longestStreak": 11
  },
  "sessionToken": "OPAQUE_SESSION_TOKEN",
  "expiresAt": 1780000000
}
```

Returns `400` for malformed JSON, `401` for an invalid Google credential, and `503` when Google authentication is not configured.

### `GET /auth/session`

Restore the profile associated with the supplied bearer token.

Successful response (`200 OK`):

```json
{
  "user": {
    "email": "reader@example.com",
    "name": "Reader",
    "pictureUrl": "https://...",
    "lastLoggedInAt": "2026-08-25 01:00:00",
    "lastRefreshedAt": "2026-08-25 01:05:00",
    "currentStreak": 4,
    "longestStreak": 11
  }
}
```

Returns `401` when the bearer token is absent, unknown, expired, or revoked.

### `POST /auth/sign-out`

Revoke the supplied bearer token. A successful request returns `204 No Content`. The browser must remove its local token regardless of whether this revocation request reaches the Worker.

### `POST /api/feedback`

Persist reader feedback submitted from the site feedback dialog. This endpoint accepts anonymous and signed-in readers. For a signed-in reader, the Worker stores the verified profile email and associates the feedback with that profile rather than trusting the submitted email.

```json
{
  "email": "reader@example.com",
  "ratingHalves": 8,
  "message": "The concise summaries make it easy to stay informed."
}
```

`ratingHalves` is an even integer from `2` through `10`, representing whole-star ratings from 1 to 5. The trimmed message must contain 20 through 4,000 characters and the email must be valid. A successful `201 Created` response is `{ "message": "Thank you for sharing your feedback." }`; malformed JSON or invalid fields return `400`.

### `POST /api/newsletter/subscribe`

Persist a newsletter subscription from the site newsletter dialog. This endpoint accepts anonymous and signed-in readers. For a signed-in reader, the Worker stores the verified profile email and associates the subscription with that profile rather than trusting the submitted email. The endpoint is gated by the product-owned `ProductConfig.newsletter.enabled` toggle: when disabled it returns `404`.

```json
{
  "email": "reader@example.com"
}
```

The email must be valid. The Worker normalizes it and inserts into `newsletter_subscribers` with `ON CONFLICT(email) DO NOTHING`, so each distinct address is stored at most once. A new subscription returns `201 Created` with `{ "created": true, "message": "You're subscribed! Watch for the first edition in your inbox." }`; an already-subscribed address returns `200 OK` with `{ "created": false, "message": "You're already on the list." }`. Malformed JSON or an invalid email returns `400`. No emails are sent yet — this endpoint captures interest for a future email service integration.

### `GET /feed.xml`

Serve an Atom feed of up to ten published editions for RSS/Atom readers, aggregators, and AI-news discovery. Each entry links back to the site's edition URL: `/?date=YYYY-MM-DD&edition=N` when the edition number is greater than 1, otherwise `/?date=YYYY-MM-DD`. The feed is public and cacheable, and returns `Cache-Control: public, max-age=600, s-maxage=1800`. The response `Content-Type` is `application/atom+xml; charset=utf-8`.

Each entry includes the edition title (or a date default), the edition summary, and an unordered list of its story titles linked to their destination URLs with source attribution. Entries are ordered newest-first. A successful request returns `200 OK`. The Pages Function at `functions/feed.xml.js` proxies this Worker endpoint on the main Pages domain so feed readers and the site's `<link rel="alternate">` reference `https://ai-nuggets.pages.dev/feed.xml` instead of the internal Worker URL.

### `GET /sitemap.xml`

Serve an XML sitemap of the site's homepage and every published edition for search-engine crawling. The homepage entry uses the site's base URL with `changefreq` of `daily` and `priority` of `1.0`. Each edition entry links back to the site's edition URL (`/?date=YYYY-MM-DD&edition=N` when the edition number is greater than 1, otherwise `/?date=YYYY-MM-DD`), uses the edition's `published_at` date as `lastmod`, and has `changefreq` of `monthly` and `priority` of `0.8`. The sitemap is environment-aware: production lists `ai-nuggets.pages.dev` URLs and beta lists `beta-ai-nuggets.pages.dev` URLs. It is public and cacheable (`Cache-Control: public, max-age=600, s-maxage=1800`). The response `Content-Type` is `application/xml; charset=utf-8`. A successful request returns `200 OK`.

The Pages Function at `functions/sitemap.xml.js` proxies this Worker endpoint on the main Pages domain, so `robots.txt` references `https://ai-nuggets.pages.dev/sitemap.xml` and crawlers never see the internal Worker URL.
