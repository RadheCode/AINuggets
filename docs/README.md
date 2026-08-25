# AI Nuggets

A responsive, single-screen daily AI news and newsletter homepage.

## Content engine and automation

Daily briefing content is stored in Cloudflare D1 and delivered through the content Worker API. Theme-independent loading and rendering live in `content-engine/`; `?date=YYYY-MM-DD` previews an edition. See [Content Engine](CONTENT_ENGINE.md) for the complete process and architecture, or [Content Engine API](CONTENT_ENGINE_API.md) for the API contract.

Daily generation is implemented as a portable Node workflow: schedulers provide a runtime adapter, while the shared job handles editorial dates, idempotency, source deduplication, edition validation, audit records, and draft persistence. Cloudflare Cron is one thin trigger adapter; the same workflow can run from GitHub Actions, a container scheduler, or operating-system cron.

The included runtime adapters accept a generic HTTPS JSON candidate endpoint and an OpenAI-compatible Chat Completions endpoint. Generation remains safely skipped until both adapters are configured with runtime secrets; validated editions publish by default through `content-engine/content-engine.config.mjs`. Each story persists Quick take, Full context, and Deep dive summaries; Full context is the default dialog view and readers can switch detail in place. Set `automaticallyPublish` to `false` there to require editorial review. See [Daily content automation](DAILY_CONTENT_AUTOMATION.md) for architecture, configuration, and operational commands. See [Viewing the D1 database](VIEW_D1_DATABASE.md) for dashboard and Wrangler commands to inspect current database contents.

## Themes

The active design is selected in `theme.config.js`. Change `activeTheme` to the key of any registered theme to switch the site-wide presentation.

The current baseline is `glass-bento`, stored in `themes/glass-bento/`. See [Theme rulebook](THEME_RULEBOOK.md) before adding or changing a theme.

### UI change checklist

Every UI change must be visually checked in both light and dark modes before release. Confirm text remains readable on every surface, including glass panels, artwork, gradients, and highlighted areas; controls and keyboard focus indicators remain visible; and content does not clip or overlap at desktop and applicable mobile breakpoints. Switching color modes must preserve the exact geometry and alignment of all page elements, including tiles; color modes may change styling only.

## Infrastructure

Deployment providers live under `infra/<provider>/`, with the active provider selected in `infra/config.json`. Cloudflare Pages is currently active and supports browser OAuth deployment; see [Cloudflare infrastructure](CLOUDFLARE_INFRASTRUCTURE.md) for setup and credential requirements.

## Google sign-in

The site supports Google-only OAuth/OpenID Connect sign-in through [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview). Create a **Web application** OAuth client in Google Cloud, add each deployed site URL and local development URL to its authorized JavaScript origins, then set its public client ID in `auth.config.js`:

```js
window.AINuggetsAuthConfig = Object.freeze({
  googleClientId: "YOUR_CLIENT_ID.apps.googleusercontent.com"
});
```

The OAuth client ID is intentionally browser-visible. Never add a Google OAuth client secret to this repository or any browser asset. Set the same public value in `infra/cloudflare/content-worker/wrangler.jsonc` as `GOOGLE_CLIENT_ID`, then deploy the content Worker before deploying Pages. The Worker verifies every Google ID token, stores a profile in D1, and returns an opaque 30-day session token. The browser keeps only that opaque token in `localStorage` and restores the profile through the Worker after refresh; the Worker stores only its SHA-256 hash. See [Content Engine API](CONTENT_ENGINE_API.md#authentication-api) for the endpoint contract and [Daily Streak](DAILY_STREAK.md) for streak rules, persistence, and D1 queries.

## Run locally

Open `index.html` directly in a browser, or serve the directory with any static file server.

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.
