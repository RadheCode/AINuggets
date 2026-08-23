# AI Nuggets

A responsive, single-screen daily AI news and newsletter homepage.

## Content engine

Daily briefing content is stored in Cloudflare D1 and delivered through the content Worker API. Theme-independent loading and rendering live in `content-engine/`; `?date=YYYY-MM-DD` previews an edition. See `content-engine/README.md` for the API contract.

The Cloudflare Cron and D1 workflow for generating daily editions is documented in `docs/DAILY_CONTENT_AUTOMATION.md`. See `docs/VIEW_D1_DATABASE.md` for dashboard and Wrangler commands to inspect current database contents.

## Themes

The active design is selected in `theme.config.js`. Change `activeTheme` to the key of any registered theme to switch the site-wide presentation.

The current baseline is `glass-bento`, stored in `themes/glass-bento/`. See `docs/THEME_RULEBOOK.md` before adding or changing a theme.

## Infrastructure

Deployment providers live under `infra/<provider>/`, with the active provider selected in `infra/config.json`. Cloudflare Pages is currently active and supports browser OAuth deployment; see `infra/cloudflare/README.md` for setup and credential requirements.

## Run locally

Open `index.html` directly in a browser, or serve the directory with any static file server.

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.
