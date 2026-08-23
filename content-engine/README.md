# Content Engine

This folder owns how AI Nuggets loads and renders content from the Cloudflare D1-backed API.

- `config.js` defines the public content API endpoint.
- `loader.js` requests the latest edition or the edition selected by `?date=YYYY-MM-DD`.
- `render.js` converts that content into the stable semantic selectors used by every theme.

The source of truth is the `ai-nuggets-content` Cloudflare D1 database. Its schema, seed data, API Worker, and scheduled trigger live under `infra/cloudflare/content-worker/`.

Keep visual styling in `themes/` and shared interactions in the root `script.js`. API story records must include a unique `id`, `category`, `title`, `summary`, `href`, and `art`. The optional `type` value may be `lead` or `wide`.

To preview an edition, use `?date=YYYY-MM-DD`, for example `http://localhost:8080/?date=2026-08-23`. The API returns the latest published edition on or before the requested date.

See `../docs/DAILY_CONTENT_AUTOMATION.md` for the D1 publishing and Cloudflare Cron algorithm.
