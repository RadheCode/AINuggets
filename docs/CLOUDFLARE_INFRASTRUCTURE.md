# Cloudflare infrastructure

AI Nuggets uses a production stack and a fully isolated beta stack. Beta is the pre-production environment: it runs the same frontend, Worker, D1 schema, Cron trigger, and secrets contract as production, but never shares Pages, Worker, D1, or secret resources with production.

> **Deployment safety rule:** every repository deployment command targets beta by default. Production (`https://ai-nuggets.pages.dev`) is protected and requires both `-Environment Production` and `-ConfirmProduction`. Do not configure Git integration or CI to deploy production automatically.

Each environment has two independently deployed Cloudflare services:

| Service | Resource | Purpose |
|---|---|---|
| Beta Pages | `beta-ai-nuggets` | Hosts the pre-production frontend at `https://beta-ai-nuggets.pages.dev` |
| Beta Worker + D1 | `beta-ai-nuggets-content` | Serves beta editions and runs beta daily-content automation |
| Production Pages | `ai-nuggets` | Hosts the protected frontend at `https://ai-nuggets.pages.dev` |
| Production Worker + D1 | `ai-nuggets-content` | Serves protected production editions and automation |

## Beta setup

Before the first beta deployment, create these independent Cloudflare resources in the configured account:

1. Pages project `beta-ai-nuggets`.
2. D1 database `beta-ai-nuggets-content`.
3. Copy the returned D1 database ID into `infra/cloudflare/config.json` at `environments.beta.contentDatabaseId`.

The Pages project must publish `https://beta-ai-nuggets.pages.dev`. The beta Worker is created by the first Worker deployment. Run the beta secret-sync command after creating the Worker to configure the same provider and automation secrets used in production, using beta-specific values where appropriate.

### Pages: recommended Git deployment

Connect the **beta** Pages project to the GitHub repository and use:

| Setting | Value |
|---|---|
| Expected account email | `ainuggets123@gmail.com` |
| Cloudflare account ID | `b0253ba555b02a254367db91ab9c0b0b` |
| Production branch | A dedicated beta branch or manual deployments |
| Framework preset | None |
| Build command | Leave empty |
| Build output directory | `.` |

Do not connect the production Pages project to an automatic deployment branch. If Git deployment is used, only the beta project may deploy automatically.

### Pages: OAuth deployment

Wrangler supports interactive browser OAuth for deployments from a trusted developer machine. Authenticate once from the repository root:

```powershell
.\infra\cloudflare\login.ps1
```

Cloudflare opens a browser authorization page and stores the resulting credentials in Wrangler's user-level configuration outside this repository. Deploy beta afterward with:

```powershell
.\infra\cloudflare\deploy.ps1
```

The command publishes only to `https://beta-ai-nuggets.pages.dev`. The login and deployment scripts read the expected email and account ID from `config.json` and stop if Wrangler is authenticated to a different account. The OAuth token itself remains in Wrangler's machine-local credential store. `.assetsignore` prevents repository-only files such as infrastructure scripts and documentation from being published as site assets.

Production is intentionally opt-in and must be named twice:

```powershell
.\infra\cloudflare\deploy.ps1 -Environment Production -ConfirmProduction
```

## Information required

- A Cloudflare user account authorized through the browser OAuth flow
- Beta Cloudflare Pages project name (`beta-ai-nuggets`)
- Beta D1 database ID for `beta-ai-nuggets-content`
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
| Worker | `beta-ai-nuggets-content` |
| Worker URL | `https://beta-ai-nuggets-content.ainuggets123.workers.dev` |
| D1 database | `beta-ai-nuggets-content` |
| D1 binding | `CONTENT_DB` |
| Cron Trigger | `0 1,13 * * *` (6:30 AM and 6:30 PM IST; 01:00 and 13:00 UTC) |

Deploy the backend separately from Pages:

```powershell
.\infra\cloudflare\content-worker\deploy.ps1
```

The script verifies the configured account, applies pending beta D1 migrations, and deploys the beta Worker and Cron Trigger. It stops before executing if the beta D1 database ID has not been configured. The initial migration seeds the existing edition. After a migration has been applied, do not edit it; add the next ordered migration such as `0002_description.sql`.

Sync beta provider secrets with:

```powershell
.\infra\cloudflare\content-worker\sync-provider-config.ps1
```

All three commands require `-Environment Production -ConfirmProduction` before they can target production. Production secret values must be synced independently; beta secret updates never affect production.

### Beta editorial parity

Beta must be a pre-production replica before any production release. Deploy application, Pages, Worker, migration, and secret-contract changes to beta first, verify them there, then request explicit approval for any production deployment. A plain deployment always targets beta.

Keep beta's published editorial content aligned with production using the guarded command below. It reads production but writes only to beta, replacing only the public `editions` and `stories` tables. It does not copy reader profiles, sessions, activity, feedback, secrets, or generation-run history.

```powershell
.\infra\cloudflare\content-worker\sync-beta-editorial-content.ps1 -ConfirmProductionSource -ConfirmBetaContentReplace
```

The command refuses to run if either environment contains a draft or archived edition, so it cannot overwrite non-public editorial work. Otherwise it exports the two public tables to a system temporary directory, clears beta stories before beta editions, imports the public records, compares published edition and story counts, then removes the temporary export. Both confirmation switches are mandatory: one acknowledges reading protected production data and the other acknowledges replacing beta's public content.

The public API provides:

- `GET /health`
- `GET /api/editions/latest`
- `GET /api/editions/YYYY-MM-DD`
- `POST /api/feedback`

The `reader_feedback` D1 table stores a reader email, a whole-star rating from 1 through 5, message, timestamp, and optional `user_profiles` association. Feedback may be submitted without signing in. When the request includes a valid session token, the Worker stores the verified profile email instead of trusting the browser-provided email.

Authenticated published-edition requests update the caller's single D1 user profile with `last_refreshed_at`; Google sign-in updates both `last_logged_in_at` and `last_refreshed_at`, because sign-in counts as a refresh. The Worker stores one qualifying activity per user per UTC day in `user_daily_activity`, atomically maintaining `current_streak`, `longest_streak`, and `streak_last_active_date` on the profile. These authenticated edition responses are private and no-store so a page fetch cannot be satisfied by a shared cache.

The dated route falls back to the newest published edition on or before the requested date. The frontend reads the Worker URL from `product/config.js`.

The scheduled handler is a thin adapter around the runtime-neutral job in `content-engine/automation/`. It calculates the edition date in UTC, injects the D1 repository, and passes Worker runtime values to `content-engine/automation/config/create-generation-provider-dependencies.mjs`. That portable module defines the setting names, validation, and generic content/summary adapters; Cloudflare only stores and injects secure values. With no provider configuration, it writes a safe `skipped` audit record and never invents stories. With complete provider configuration, it creates a validated edition and applies the configured publication mode.

Configure the portable configuration contract in one human-readable local file, never in `vars`, frontend code, or committed files:

```powershell
Copy-Item content-engine\automation\config\providers.example.env content-engine\automation\config\providers.local.env
# Edit providers.local.env, then verify it before syncing it to Cloudflare:
.\content-engine\automation\test-provider-config.ps1
.\infra\cloudflare\content-worker\sync-provider-config.ps1
```

`providers.local.env` is the portable, Git-ignored source of provider settings. The sync script is the Cloudflare-specific adapter that uploads those values as Worker secrets. `CONTENT_SOURCE_API_KEY` is optional. The source endpoint must accept `?date=YYYY-MM-DD` and return a JSON array or `{ "candidates": [...] }`; the summary provider is selected by `SUMMARY_PROVIDER_KIND` (OpenAI-compatible Chat Completions, or the Workers AI binding declared as `"ai"` in the Worker manifest). See [Daily content automation](DAILY_CONTENT_AUTOMATION.md) for the candidate contract, secret meanings, and safety rules.

The authenticated `POST /internal/generate` endpoint is available only after `AUTOMATION_TRIGGER_TOKEN` is configured as a Worker secret. It allows an external scheduler to request a run using this Worker's configured adapters and optional `{ "targetDate": "YYYY-MM-DD" }` request body; it does not expose secrets or permit clients to supply providers.

For read-only dashboard and Wrangler queries, see [Viewing the D1 database](VIEW_D1_DATABASE.md).

## Deployment order

When backend and frontend contracts both change:

1. Deploy the Worker and apply its D1 migrations.
2. Verify the API response.
3. Deploy beta Pages with `deploy.ps1`.
4. Sync and validate beta public editorial content when production's published editions changed.

This order keeps the currently published frontend compatible while the backend is changing. Only after beta is deployed and parity-validated may an explicitly approved production deployment be considered.
