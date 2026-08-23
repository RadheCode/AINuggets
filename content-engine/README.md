# Content Engine

This folder owns what AI Nuggets publishes and how shared content markup is produced.

- `content/YYYY/MM/YYYY-MM-DD.json` defines each immutable daily briefing and its four or five stories.
- `content/index.json` lists every available edition and publication status.
- `loader.js` selects today's edition, or the latest published edition on or before that date.
- `render.js` converts that content into the stable semantic selectors used by every theme.

Keep visual styling in `themes/` and shared interactions in the root `script.js`. Story records must include a unique `id`, `category`, `title`, `summary`, `href`, and `art`. The optional `type` value may be `lead` or `wide`.

To preview an edition, use `?date=YYYY-MM-DD`, for example `http://localhost:8080/?date=2026-08-23`. Add each new published file to `content/index.json`; the manifest is the authoritative list of editions.
