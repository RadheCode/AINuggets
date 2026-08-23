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
| Cron Trigger | `0 1 * * *` (01:00 UTC / 06:30 IST) |
| Editorial timezone | `Asia/Kolkata` |

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

The scheduled handler currently records a safe skipped run when no content provider is configured. It does not invent stories. Provider credentials must be added as Wrangler secrets after news and model providers are selected; they must not be added to `config.json`, `wrangler.jsonc`, or frontend code. See `docs/DAILY_CONTENT_AUTOMATION.md` for the generation lifecycle and safety rules.

For read-only dashboard and Wrangler queries, see `docs/VIEW_D1_DATABASE.md`.

## Deployment order

When backend and frontend contracts both change:

1. Deploy the Worker and apply its D1 migrations.
2. Verify the API response.
3. Deploy Pages with `deploy.ps1`.

This order keeps the currently published frontend compatible while the backend is changing.
