# Content Engine

This folder owns how AI Nuggets loads and renders content from the Cloudflare D1-backed API.

- `config.js` defines the public content API endpoint.
- `loader.js` requests the latest edition or the edition selected by `?date=YYYY-MM-DD`.
- `render.js` converts that content into the stable semantic selectors used by every theme.
- `automation/` contains the portable daily-edition job, scheduler-neutral runner, CLI trigger, RSS/Atom blog collector, HTTP source/model adapters, provider-configuration contract, domain validation, and tests. It is not published as a Pages asset.

The source of truth is the `ai-nuggets-content` Cloudflare D1 database. Its schema, seed data, API Worker, and scheduled trigger live under `infra/cloudflare/content-worker/`.

Keep visual styling in `themes/` and shared interactions in the root `script.js`. API story records must include a unique `id`, `category`, `title`, `summaries.compact`, `summaries.standard`, `summaries.detailed`, `href`, and `art`. The optional `type` value may be `lead` or `wide`.

To preview an edition, use `?date=YYYY-MM-DD`, for example `http://localhost:8080/?date=2026-08-23`. The API returns the latest published edition on or before the requested date.

The human-editable `content-engine.config.mjs` is the source of truth for the UTC Cron schedule, automatic-publication switch, and approved RSS/Atom feeds. The content engine uses UTC consistently for scheduled generation and the public `latest` endpoint, so it has no separate timezone setting. Validated editions publish by default; set `automaticallyPublish` to `false` to require editorial review. The built-in collector fetches up to three recent posts per source, removes duplicate links, ranks them by configured priority and recency, and selects five candidates with category diversity where possible. The automation core has no Cloudflare or D1 imports. `automation/config/providers.example.env` is the human-readable provider configuration template. Copy it to the Git-ignored `providers.local.env` and fill in model values. Leave `CONTENT_SOURCE_URL` blank to use the built-in collector, or set it to replace the collector with a custom JSON candidate API. `automation/config/create-generation-provider-dependencies.mjs` defines the provider setting names, validates them, and creates the dependencies from plain runtime values. A scheduler or infrastructure adapter only injects those values and supplies an edition repository. Any cron service can invoke `automation/cli/run-scheduled-edition.mjs` with its own adapter module. See `../docs/DAILY_CONTENT_AUTOMATION.md` for the portable workflow, configuration contract, D1 persistence, and scheduler adapters.

After editing `automation/config/providers.local.env`, run `.\automation\test-provider-config.ps1` from this directory to make one small, local test request to the summary provider before syncing any secrets. The command validates the provider's structured response and never displays API keys.
