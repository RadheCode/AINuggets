# Cloudflare infrastructure

AI Nuggets uses two independently deployed Cloudflare services:

| Service | Resource | Purpose |
|---|---|---|
| Pages | `ai-nuggets` | Hosts the dependency-free frontend at `https://ai-nuggets.pages.dev` |
| Worker + D1 | `ai-nuggets-content` | Serves published editions and runs daily content automation |

## Pages: recommended Git deployment

Create a Cloudflare Pages project connected to the GitHub repository and use:

| Setting | Value |
|---|---|
| Expected account email | `ainuggets123@gmail.com` |
| Cloudflare account ID | `b0253ba555b02a254367db91ab9c0b0b` |
| Production branch | `main` |
| Framework preset | None |
| Build command | Leave empty |
| Build output directory | `.` |

Cloudflare will deploy every push to `main` and create preview deployments for other branches and pull requests.

## Pages: OAuth deployment

Wrangler supports interactive browser OAuth for deployments from a trusted developer machine. Authenticate once from the repository root:

```powershell
.\infra\cloudflare\login.ps1
```

Cloudflare opens a browser authorization page and stores the resulting credentials in Wrangler's user-level configuration outside this repository. Deploy afterward with:

```powershell
.\infra\cloudflare\deploy.ps1
```

The login and deployment scripts read the expected email and account ID from `config.json` and stop if Wrangler is authenticated to a different account. The OAuth token itself remains in Wrangler's machine-local credential store. `.assetsignore` prevents repository-only files such as infrastructure scripts and documentation from being published as site assets.

## Information required

- A Cloudflare user account authorized through the browser OAuth flow
- Cloudflare Pages project name (`ai-nuggets` by default)
- GitHub repository access through the Cloudflare Git integration
- Production branch (`main` by default)
- Optional custom domain and the Cloudflare zone that owns it

If the Cloudflare user belongs to multiple accounts, Wrangler may ask which account owns the Pages project. No API token is needed for local OAuth deployment.

Non-interactive CI cannot complete a browser OAuth prompt. CI deployments should use Cloudflare's GitHub integration, or a scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` stored as CI secrets.

Git integration remains preferred for automatic deployments because its GitHub authorization is also OAuth-based and Cloudflare manages the deployment credentials.

## Content API, D1, and Cron

The content backend is defined in `content-worker/`. D1 is the source of truth for daily editions; daily content is not stored in repository JSON files.

| Setting | Value |
|---|---|
| Worker | `ai-nuggets-content` |
| Worker URL | `https://ai-nuggets-content.ainuggets123.workers.dev` |
| D1 database | `ai-nuggets-content` |
| D1 binding | `CONTENT_DB` |
| Cron Trigger | `0 12 * * *` (12:00 UTC) |

Deploy the backend separately from Pages:

```powershell
.\infra\cloudflare\content-worker\deploy.ps1
```

The script verifies the configured account, applies pending remote D1 migrations, and deploys the Worker and Cron Trigger. The initial migration seeds the existing edition. After a migration has been applied, do not edit it; add the next ordered migration such as `0002_description.sql`.

The public API provides:

- `GET /health`
- `GET /api/editions/latest`
- `GET /api/editions/YYYY-MM-DD`

The dated route falls back to the newest published edition on or before the requested date. The frontend reads the Worker URL from `content-engine/config.js`.

The scheduled handler is a thin adapter around the runtime-neutral job in `content-engine/automation/`. It calculates the edition date in UTC, injects the D1 repository, and passes Worker runtime values to `content-engine/automation/config/create-generation-provider-dependencies.mjs`. That portable module defines the setting names, validation, and generic content/summary adapters; Cloudflare only stores and injects secure values. With no provider configuration, it writes a safe `skipped` audit record and never invents stories. With complete provider configuration, it creates a validated edition and applies the configured publication mode.

Configure the portable configuration contract in one human-readable local file, never in `vars`, frontend code, or committed files:

```powershell
Copy-Item content-engine\automation\config\providers.example.env content-engine\automation\config\providers.local.env
# Edit providers.local.env, then verify it before syncing it to Cloudflare:
.\content-engine\automation\test-provider-config.ps1
.\infra\cloudflare\content-worker\sync-provider-config.ps1
```

`providers.local.env` is the portable, Git-ignored source of provider settings. The sync script is the Cloudflare-specific adapter that uploads those values as Worker secrets. `CONTENT_SOURCE_API_KEY` is optional. The source endpoint must accept `?date=YYYY-MM-DD` and return a JSON array or `{ "candidates": [...] }`; the summary endpoint must implement OpenAI-compatible Chat Completions. See [Daily content automation](DAILY_CONTENT_AUTOMATION.md) for the candidate contract, secret meanings, and safety rules.

The authenticated `POST /internal/generate` endpoint is available only after `AUTOMATION_TRIGGER_TOKEN` is configured as a Worker secret. It allows an external scheduler to request a run using this Worker's configured adapters and optional `{ "targetDate": "YYYY-MM-DD" }` request body; it does not expose secrets or permit clients to supply providers.

For read-only dashboard and Wrangler queries, see [Viewing the D1 database](VIEW_D1_DATABASE.md).

## Deployment order

When backend and frontend contracts both change:

1. Deploy the Worker and apply its D1 migrations.
2. Verify the API response.
3. Deploy Pages with `deploy.ps1`.

This order keeps the currently published frontend compatible while the backend is changing.
