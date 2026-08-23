# Viewing the Cloudflare D1 Database

AI Nuggets stores its editions and stories in the Cloudflare D1 database named `ai-nuggets-content`. You can inspect it through the Cloudflare dashboard or Wrangler CLI.

## Cloudflare dashboard

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/) with the account configured in `infra/cloudflare/config.json`.
2. Open **Storage & databases** and select **D1 SQL database**.
3. Select **ai-nuggets-content**.
4. Open the **Console** tab.
5. Enter a read-only query and select **Execute**.

List editions:

```sql
SELECT *
FROM editions
ORDER BY edition_date DESC;
```

View stories together with their edition date:

```sql
SELECT
  e.edition_date,
  s.position,
  s.category,
  s.title,
  s.summary,
  s.source_name,
  s.source_url
FROM stories AS s
JOIN editions AS e ON e.id = s.edition_id
ORDER BY e.edition_date DESC, s.position;
```

Inspect daily Cron activity:

```sql
SELECT *
FROM generation_runs
ORDER BY started_at DESC;
```

## Wrangler CLI

Run commands from the repository root. Authenticate first if needed:

```powershell
.\infra\cloudflare\login.ps1
```

List the tables in the production database:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config infra\cloudflare\content-worker\wrangler.jsonc `
  --command "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name;"
```

View editions:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config infra\cloudflare\content-worker\wrangler.jsonc `
  --command "SELECT * FROM editions ORDER BY edition_date DESC;"
```

View stories:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config infra\cloudflare\content-worker\wrangler.jsonc `
  --command "SELECT e.edition_date, s.position, s.category, s.title, s.summary FROM stories s JOIN editions e ON e.id = s.edition_id ORDER BY e.edition_date DESC, s.position;"
```

View recent generation runs:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config infra\cloudflare\content-worker\wrangler.jsonc `
  --command "SELECT * FROM generation_runs ORDER BY started_at DESC LIMIT 20;"
```

## Production versus local data

The `--remote` flag queries the live Cloudflare database. Without `--remote`, Wrangler uses a separate local development database. Always include `--remote` when you intend to inspect production content.

These examples use `SELECT` statements and do not modify data. Before running `INSERT`, `UPDATE`, `DELETE`, migrations, or SQL files against `--remote`, review the command carefully and follow the migration process documented in `infra/cloudflare/README.md`.

## Public API view

The published content can also be inspected through the read-only Worker API:

- Latest published edition: `https://ai-nuggets-content.ainuggets123.workers.dev/api/editions/latest`
- Edition on or before a date: `https://ai-nuggets-content.ainuggets123.workers.dev/api/editions/YYYY-MM-DD`

The API only exposes published editions. Use the dashboard or Wrangler when you need to inspect drafts, archived editions, or generation audit records.
