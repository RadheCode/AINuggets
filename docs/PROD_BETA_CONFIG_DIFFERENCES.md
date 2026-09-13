# Production vs Beta Configuration Differences

This document captures **intentional** configuration differences between production and beta environments. These differences exist for operational reasons and should **not** be synchronized or overwritten during deployments.

---

## 1. Cron Schedule (Content Generation)

| Environment | Cron Expression (UTC) | IST Times | Purpose |
|-------------|----------------------|-----------|---------|
| **Production** | `0 1,13 * * *` | 06:30, 18:30 IST | Runs first — priority access to shared token quotas |
| **Beta** | `10 1,13 * * *` | 06:40, 18:40 IST | Runs 10 minutes after production — avoids token contention |

**Location**: `content-engine/content-engine.config.mjs` → `schedule.cron` (environment-specific object)

**Rationale**: Both environments share API token quotas (OpenAI, OpenRouter, Gemini). Running production first ensures the live site gets priority when quotas are constrained.

---

## 2. Summary Provider Fallback Order

| Environment | Fallback Order | Purpose |
|-------------|----------------|---------|
| **Production** | `openai` → `gemini` → `openrouter` → `workers-ai` | Best quality first (OpenAI primary) |
| **Beta** | `gemini` → `openai` → `openrouter` → `workers-ai` | Use Gemini free tier first, then OpenAI, then OpenRouter |

**Location**: `product/config.js` → `summaryProviders.fallbackOrder` (environment-specific object)

**Rationale**: Production prioritizes quality with OpenAI first. Beta uses Gemini (free tier) first to preserve production's OpenAI quota, then falls back to OpenAI, then OpenRouter.

---

## 3. Noindex Meta Tag (SEO)

| Environment | Behavior |
|-------------|----------|
| **Production** (`ai-nuggets.pages.dev`) | No `noindex` meta tag — fully indexable |
| **Beta** (`beta-ai-nuggets.pages.dev`) | Injects `<meta name="robots" content="noindex, nofollow">` — prevents search indexing |

**Location**: `content-engine/loader.js` (hostname-aware injection)

**Rationale**: Only production should appear in search results. Beta is a testing environment.

---

## 4. Dry Run Permission (Automation API)

| Environment | Behavior |
|-------------|----------|
| **Production** | Dry runs **rejected** (returns 400) |
| **Beta** | Dry runs **allowed** (for testing) |

**Location**: `infra/cloudflare/content-worker/src/index.js` → `handleAutomationRequest` (checks `env.DEPLOYMENT_ENVIRONMENT !== "beta"`)

**Rationale**: Prevents accidental test runs from creating editions on production.

---

## 5. D1 Database (Isolated)

| Environment | Database Name | Database ID |
|-------------|---------------|-------------|
| **Production** | `ai-nuggets-content` | `7b4e45e1-00f6-4113-aa77-1e51b887a2ca` |
| **Beta** | `beta-ai-nuggets-content` | `ba4fcc26-44d8-4688-adbd-69a2f5ce25af` |

**Location**: `infra/cloudflare/config.json` → `environments.{beta,production}.contentDatabase*`

**Rationale**: Complete data isolation. Beta can be reset/recreated without affecting production editorial content.

---

## 6. Worker Names & URLs

| Environment | Worker Name | API URL | Pages URL |
|-------------|-------------|---------|-----------|
| **Production** | `ai-nuggets-content` | `https://ai-nuggets-content.ainuggets123.workers.dev` | `https://ai-nuggets.pages.dev` |
| **Beta** | `beta-ai-nuggets-content` | `https://beta-ai-nuggets-content.ainuggets123.workers.dev` | `https://beta-ai-nuggets.pages.dev` |

**Location**: `infra/cloudflare/config.json` → `environments.{beta,production}`

---

## Deployment Notes

- **Beta-first rule**: All changes deploy to beta first. Production deployment requires explicit `-ConfirmProduction` flag.
- **Content sync direction**: `sync-beta-editorial-content.ps1` copies **production → beta** (production is editorial source of truth). Never run beta → production.
- **Schema migrations**: Applied via `deploy.ps1` per environment. Both environments must have identical schema (migrations are shared).
- **Secrets**: Each environment has its own secret values (API keys, tokens) configured in Cloudflare dashboard.

---

## What Should Stay Synchronized

The following should **always** be identical between environments:

- D1 schema (migrations)
- Worker code (`infra/cloudflare/content-worker/src/`)
- Content engine logic (`content-engine/automation/`)
- Theme files (`themes/`)
- Shared shell (`index.html`, `script.js`, `theme-loader.js`)
- Product configuration structure (`product/config.js` — only the values listed above differ)

---

## Adding New Differences

If a new intentional difference is needed:

1. **Document it here** before implementing
2. Make the configuration environment-aware (object with `production`/`beta` keys)
3. Update the relevant render/deploy script to select the correct value
4. Add a test verifying both environments get their intended values
5. Ensure the difference has a clear operational rationale (quota management, testing isolation, SEO, etc.)

---

*Last updated: 2026-09-12*