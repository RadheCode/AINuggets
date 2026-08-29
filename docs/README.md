# Website Documentation

A responsive, single-screen daily briefing homepage. The currently configured product identity and topic live in [`product/`](PRODUCT_CONFIGURATION.md).

## Product configuration

All browser-visible product identity, topic framing, public runtime endpoints, browser storage namespace, public OAuth client ID, and product-specific artwork matching live in the root [`product/`](PRODUCT_CONFIGURATION.md) folder. Update that folder to rebrand the site for another concept; keep daily editions in the content engine, presentation in themes, and deployment identifiers in `infra/`. The [Product Externalization Architecture](PRODUCT_EXTERNALIZATION_ARCHITECTURE.md) explains the complete boundary and provider handoff.

## Content engine and automation

Daily briefing content is stored in Cloudflare D1 and delivered through the content Worker API. Theme-independent loading and rendering live in `content-engine/`; `?date=YYYY-MM-DD` previews an edition. See [Content Engine](CONTENT_ENGINE.md) for the complete process and architecture, or [Content Engine API](CONTENT_ENGINE_API.md) for the API contract.

Daily generation is implemented as a portable Node workflow: schedulers provide a runtime adapter, while the shared job handles editorial dates, idempotency, source deduplication, edition validation, audit records, and draft persistence. Cloudflare Cron is one thin trigger adapter; the same workflow can run from GitHub Actions, a container scheduler, or operating-system cron.

The included runtime adapters accept a generic HTTPS JSON candidate endpoint and an OpenAI-compatible Chat Completions endpoint. Generation remains safely skipped until both adapters are configured with runtime secrets; validated editions publish by default through `content-engine/content-engine.config.mjs`. `product/config.js` controls generated summary variants and the variants readers can use: the current workflow generates Quick take, Overview, and Deep dive, while the story dialog offers Overview and Deep dive. Set `automaticallyPublish` to `false` in the content-engine configuration to require editorial review. Every generation attempt has a safe, detailed, three-day retained run timeline identified by `runId`. See [Daily content automation](DAILY_CONTENT_AUTOMATION.md#how-story-summaries-are-produced) for the step-by-step summarization workflow, architecture, configuration, detailed logging, and operational commands. Use the repository-local [Generation Run Investigation skill](../.github/skills/generation-run-investigation/SKILL.md) to resolve and display the newest retained beta or production timeline automatically. See the [D1 schema reference](D1_SCHEMA_REFERENCE.md) for every table's purpose, access boundary, relationships, retention, and maintenance rule, and [Viewing the D1 database](VIEW_D1_DATABASE.md) for dashboard and Wrangler inspection commands.

## Themes

The active design is selected in `theme.config.js`. Change `activeTheme` to the key of any registered theme to switch the site-wide presentation.

The current baseline is `glass-bento`, stored in `themes/glass-bento/`. See [Theme rulebook](THEME_RULEBOOK.md) before adding or changing a theme.

### UI change checklist

Every UI change must be visually checked in both light and dark modes before release. Confirm text remains readable on every surface, including glass panels, artwork, gradients, and highlighted areas; controls and keyboard focus indicators remain visible; and content does not clip or overlap at desktop and applicable mobile breakpoints. Switching color modes must preserve the exact geometry and alignment of all page elements, including tiles; color modes may change styling only.

## Infrastructure

Deployment providers live under `infra/<provider>/`, with the active provider selected in `infra/config.json`. Cloudflare Pages is currently active and supports browser OAuth deployment. Deployments default to the fully isolated beta stack at `https://beta-ai-nuggets.pages.dev`; production at `https://ai-nuggets.pages.dev` is protected and requires explicit `-Environment Production -ConfirmProduction` switches. See [Cloudflare infrastructure](CLOUDFLARE_INFRASTRUCTURE.md) for setup and credential requirements.

## Google sign-in

The site supports Google-only OAuth/OpenID Connect sign-in through [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview). Create a **Web application** OAuth client in Google Cloud, then add these exact values under **Authorized JavaScript origins** before testing sign-in:

- `https://beta-ai-nuggets.pages.dev`
- `https://ai-nuggets.pages.dev`
- `http://localhost:4173` when using the repository preview server

Google rejects the account chooser with an authorization-policy error until the origin serving the page is present on that OAuth client. Set its public client ID in `product/config.js`:

```js
window.ProductConfig = Object.freeze({
  authentication: Object.freeze({
    googleClientId: "YOUR_CLIENT_ID.apps.googleusercontent.com"
  })
});
```

The OAuth client ID is intentionally browser-visible. Never add a Google OAuth client secret to this repository or any browser asset. The Worker deployment renders its matching public value from `product/config.js`; deploy the matching Worker before its Pages site. The Worker verifies every Google ID token, stores a profile in D1, and returns an opaque 30-day session token. The browser keeps only that opaque token in `localStorage` and restores the profile through the Worker after refresh; the Worker stores only its SHA-256 hash. See [Content Engine API](CONTENT_ENGINE_API.md#authentication-api) for the endpoint contract and [Daily Streak](DAILY_STREAK.md) for streak rules, persistence, and D1 queries.

## Run locally

Open `index.html` directly in a browser, or serve the directory with any static file server.

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.
