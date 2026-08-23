# AI Nuggets

A responsive, single-screen daily AI news and newsletter homepage.

## Content engine

Daily briefing content and theme-independent rendering live in `content-engine/`. Editions are dated JSON files selected by the current date or a `?date=YYYY-MM-DD` preview parameter. See `content-engine/README.md` for the content contract.

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
