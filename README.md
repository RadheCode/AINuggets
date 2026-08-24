# AI Nuggets

A responsive, single-screen daily AI news and newsletter homepage.

## Content engine and automation

Daily briefing content is stored in Cloudflare D1 and delivered through the content Worker API. Theme-independent loading and rendering live in `content-engine/`; `?date=YYYY-MM-DD` previews an edition. See [Content Engine](docs/CONTENT_ENGINE.md) for the complete process and architecture, or `content-engine/README.md` for the API contract.

Daily generation is implemented as a portable Node workflow: schedulers provide a runtime adapter, while the shared job handles editorial dates, idempotency, source deduplication, edition validation, audit records, and draft persistence. Cloudflare Cron is one thin trigger adapter; the same workflow can run from GitHub Actions, a container scheduler, or operating-system cron.

The included runtime adapters accept a generic HTTPS JSON candidate endpoint and an OpenAI-compatible Chat Completions endpoint. Generation remains safely skipped until both adapters are configured with runtime secrets; validated editions publish by default through `content-engine/content-engine.config.mjs`. Set `automaticallyPublish` to `false` there to require editorial review. See `docs/DAILY_CONTENT_AUTOMATION.md` for architecture, configuration, and operational commands. See `docs/VIEW_D1_DATABASE.md` for dashboard and Wrangler commands to inspect current database contents.

## Themes

The active design is selected in `theme.config.js`. Change `activeTheme` to the key of any registered theme to switch the site-wide presentation.

The current baseline is `glass-bento`, stored in `themes/glass-bento/`. See `docs/THEME_RULEBOOK.md` before adding or changing a theme.

### UI change checklist

Every UI change must be visually checked in both light and dark modes before release. Confirm text remains readable on every surface, including glass panels, artwork, gradients, and highlighted areas; controls and keyboard focus indicators remain visible; and content does not clip or overlap at desktop and applicable mobile breakpoints. Switching color modes must preserve the exact geometry and alignment of all page elements, including tiles; color modes may change styling only.

## Infrastructure

Deployment providers live under `infra/<provider>/`, with the active provider selected in `infra/config.json`. Cloudflare Pages is currently active and supports browser OAuth deployment; see `infra/cloudflare/README.md` for setup and credential requirements.

## Run locally

Open `index.html` directly in a browser, or serve the directory with any static file server.

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.
