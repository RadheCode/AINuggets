# Viewing the Cloudflare D1 Database

AI Nuggets stores editorial content, generation investigations, authenticated-reader data, and reader feedback in the Cloudflare D1 database named `ai-nuggets-content`. You can inspect it through the Cloudflare dashboard or Wrangler CLI.

For the authoritative table-by-table **what, why, where, and how** reference, including relationships, privacy boundaries, retention, and the maintenance rule, see [D1 Schema Reference](D1_SCHEMA_REFERENCE.md). This guide contains safe operational inspection commands.

## Cloudflare dashboard

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/) with the account configured in `infra/cloudflare/config.json`.
2. Open **Storage & databases** and select **D1 SQL database**.
3. Select **ai-nuggets-content**.
4. Open the **Console** tab.
5. Enter a read-only query and select **Execute**.

All D1 timestamps are stored in UTC. The read-only output queries in this guide convert each displayed date-time to explicitly labeled Indian Standard Time (`IST`, UTC+05:30); raw UTC columns remain only in filtering and ordering expressions.

List editions:

```sql
SELECT
  id,
  edition_date,
  status,
  eyebrow,
  title,
  emphasis,
  summary,
  meta_json,
  datetime(published_at, '+5 hours', '+30 minutes') || ' IST' AS published_at_ist,
  datetime(created_at, '+5 hours', '+30 minutes') || ' IST' AS created_at_ist,
  datetime(updated_at, '+5 hours', '+30 minutes') || ' IST' AS updated_at_ist
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
SELECT
  run_id,
  target_date,
  status,
  details,
  datetime(started_at, '+5 hours', '+30 minutes') || ' IST' AS started_at_ist,
  datetime(finished_at, '+5 hours', '+30 minutes') || ' IST' AS finished_at_ist
FROM generation_runs
ORDER BY started_at DESC;
```

## User login and page-refresh activity

Each signed-in Google user has one `user_profiles` record. Completing Google sign-in updates both `last_logged_in_at` and `last_refreshed_at`, because sign-in counts as a page refresh. `last_refreshed_at` is also updated when that user's authenticated browser requests a published edition. D1 stores both timestamps in UTC; the queries below display them as labeled IST.

The Worker records qualifying activity in `user_daily_activity`, with one row per user and UTC calendar date. It stores the resulting active streak in `current_streak`, the historical best in `longest_streak`, and the last qualifying UTC date in `streak_last_active_date` on `user_profiles`. Duplicate requests on the same date do not change a streak.

View all user activity, most recently refreshed first:

```sql
SELECT
  email,
  display_name,
  datetime(last_logged_in_at, '+5 hours', '+30 minutes') || ' IST' AS last_logged_in_at_ist,
  datetime(last_refreshed_at, '+5 hours', '+30 minutes') || ' IST' AS last_refreshed_at_ist,
  current_streak,
  longest_streak,
  streak_last_active_date
FROM user_profiles
ORDER BY last_refreshed_at DESC, last_logged_in_at DESC;
```

View activity for one user by email:

```sql
SELECT
  email,
  display_name,
  datetime(last_logged_in_at, '+5 hours', '+30 minutes') || ' IST' AS last_logged_in_at_ist,
  datetime(last_refreshed_at, '+5 hours', '+30 minutes') || ' IST' AS last_refreshed_at_ist,
  current_streak,
  longest_streak,
  streak_last_active_date
FROM user_profiles
WHERE email = 'reader@example.com';
```

## Wrangler CLI

Run commands from the repository root. Authenticate first if needed:

```powershell
.\infra\cloudflare\login.ps1
```

Render an environment-specific manifest from the authoritative Cloudflare configuration, then use it for read-only database commands. Use `Beta` for the beta database or `Production` for production:

```powershell
$workerConfig = Join-Path (Resolve-Path ".\infra\cloudflare\content-worker") "wrangler.inspect.generated.jsonc"
.\infra\cloudflare\content-worker\render-worker-config.ps1 -Environment Beta -OutputPath $workerConfig
```

The examples below use the production database name. Replace `ai-nuggets-content` with `beta-ai-nuggets-content` when the rendered manifest is for beta.

List the tables in the selected database:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config $workerConfig `
  --command "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name;"
```

View editions:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config $workerConfig `
  --command "SELECT id, edition_date, status, eyebrow, title, emphasis, summary, meta_json, datetime(published_at, '+5 hours', '+30 minutes') || ' IST' AS published_at_ist, datetime(created_at, '+5 hours', '+30 minutes') || ' IST' AS created_at_ist, datetime(updated_at, '+5 hours', '+30 minutes') || ' IST' AS updated_at_ist FROM editions ORDER BY edition_date DESC;"
```

View stories:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config $workerConfig `
  --command "SELECT e.edition_date, s.position, s.category, s.title, s.summary FROM stories s JOIN editions e ON e.id = s.edition_id ORDER BY e.edition_date DESC, s.position;"
```

### Find a `runId` before investigating a run

Every generation attempt creates a UUID in `generation_runs.run_id`. List recent attempts first, then copy the `run_id` for the date or status you want to investigate:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config $workerConfig `
  --command "SELECT run_id, target_date, status, details, datetime(started_at, '+5 hours', '+30 minutes') || ' IST' AS started_at_ist, datetime(finished_at, '+5 hours', '+30 minutes') || ' IST' AS finished_at_ist FROM generation_runs ORDER BY started_at DESC LIMIT 20;"
```

To find attempts for one editorial date, replace `<YYYY-MM-DD>`:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config $workerConfig `
  --command "SELECT run_id, target_date, status, details, datetime(started_at, '+5 hours', '+30 minutes') || ' IST' AS started_at_ist, datetime(finished_at, '+5 hours', '+30 minutes') || ' IST' AS finished_at_ist FROM generation_runs WHERE target_date = '<YYYY-MM-DD>' ORDER BY started_at DESC;"
```

The `POST /internal/generate` response also returns `runId` immediately for a manually triggered generation. On beta only, an authorized caller may send `{ "targetDate": "YYYY-MM-DD", "dryRun": true }` to exercise collection, generation, and validation for an existing edition without changing `editions` or `stories`. To intentionally replace an existing beta edition after validation, send `{ "targetDate": "YYYY-MM-DD", "forceReplace": true }`; it atomically deletes the existing parent and cascades its stories before saving the replacement. `dryRun` and `forceReplace` cannot be combined, and neither option is accepted in production. Scheduled runs do not have an HTTP caller, so discover their ID with one of the read-only queries above. Copy the UUID exactly as returned; it is retained for three days after the run completes.

### Unified detailed view for one generation run

Copy a `run_id` from the recent-run query, then replace `<runId>` below. This single query returns the parent-run details alongside every ordered stage event and its safe decision metadata:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config $workerConfig `
  --command "SELECT e.sequence, e.stage, e.event_name, e.metadata_json, r.run_id, r.target_date, r.status AS run_status, r.details AS run_details, datetime(r.started_at, '+5 hours', '+30 minutes') || ' IST' AS started_at_ist, datetime(r.finished_at, '+5 hours', '+30 minutes') || ' IST' AS finished_at_ist, e.outcome, e.duration_ms, datetime(e.created_at, '+5 hours', '+30 minutes') || ' IST' AS event_created_at_ist FROM generation_runs AS r LEFT JOIN generation_run_events AS e ON e.run_id = r.run_id WHERE r.run_id = '<runId>' ORDER BY e.sequence ASC;"
```

The protected Worker endpoint returns the same information in a clearer nested JSON response. It exposes `run.startedAtIst`, `run.finishedAtIst`, and each event's `occurredAtIst` as explicitly labeled IST values:

```powershell
$headers = @{ Authorization = "Bearer $env:AUTOMATION_TRIGGER_TOKEN" }
Invoke-RestMethod "https://<content-worker>/internal/generation-runs/<runId>" -Headers $headers
```

Generation-run data is retained for three days. Each new generation attempt purges completed expired child events before their parent run rows. The logs deliberately exclude credentials, request headers, raw article/feed content, complete prompts, and raw model responses.

### Inspect the latest run automatically

Use the repository-local [Generation Run Investigation skill](../.github/skills/generation-run-investigation/SKILL.md) when you want the newest retained beta or production run without first finding its `runId`. It resolves the latest UUID run, executes the exact unified query in [Unified detailed view for one generation run](#unified-detailed-view-for-one-generation-run), prints every returned row as a SQL-result table with all selected columns, and then presents a readable stage grouping of the same rows. Add a new `.md` `OutputPath` to save that exact report for offline viewing; the inspector creates its parent directory when needed and refuses to overwrite an existing file. The underlying read-only command is:

```powershell
.\infra\cloudflare\content-worker\investigate-latest-generation-run.ps1 `
  -Environment Beta `
  -OutputPath "$HOME\Downloads\ai-nuggets-latest-beta-run.md"
```

Replace `Beta` with `Production` only when you intend to inspect production. The command selects the correct database from `infra/cloudflare/config.json`, creates a temporary manifest, uses only remote `SELECT` queries, and deletes the temporary manifest after completion.

The detailed timeline requires migration `0011_add_generation_run_events.sql` in the selected database. If the selected environment has not received that migration, the command reports the missing timeline schema rather than running incomplete legacy queries. Deploy schema changes to beta first and only change production with explicit approval.

### Export all reader feedback

Reader feedback includes contact data and free-text submissions. It has no public API endpoint and must remain within approved operator channels. Use the repository-local [Reader Feedback Table skill](../.github/skills/reader-feedback-table/SKILL.md) to retrieve every submission from one environment as a Markdown table with explicitly labeled IST timestamps:

```powershell
.\infra\cloudflare\content-worker\export-reader-feedback.ps1 `
  -Environment Beta `
  -OutputPath "$HOME\Downloads\ai-nuggets-beta-reader-feedback.md"
```

Replace `Beta` with `Production` only when production inspection is explicitly intended. The exporter resolves the selected database from `infra/cloudflare/config.json`, creates a temporary manifest, executes only this remote `SELECT` query, and removes the manifest even if it fails:

```sql
SELECT
  id,
  email,
  rating_halves / 2.0 AS rating,
  message,
  datetime(created_at, '+5 hours', '+30 minutes') || ' IST' AS submitted_at_ist
FROM reader_feedback
ORDER BY created_at DESC, id DESC;
```

The report preserves every returned row in that order. It creates a missing destination directory but refuses to overwrite an existing file. If the selected database has not received `0009_add_reader_feedback.sql`, it reports the missing schema without applying a migration.

### Report current visitor analytics

Visitor analytics is private pseudonymous data, not reader-profile data. It records an opaque browser identifier only as a one-way hash, an edge-derived country code with a readable English country name, and a timestamp; it does not store IP addresses, precise locations, referrers, user agents, or browser fingerprints. Use the repository-local report to get current IST daily, Monday-based weekly, and monthly totals for unique visitors, unique countries, and page visits:

```powershell
.\infra\cloudflare\content-worker\report-visitor-analytics.ps1 `
  -Environment Beta `
  -OutputPath "$HOME\Downloads\ai-nuggets-beta-visitor-analytics.md"
```

The report executes only aggregate `SELECT` queries, displays period boundaries as explicitly labeled IST, excludes `unknown` country codes only from the unique-country total, and includes a readable country-name/code breakdown with aggregate visits and unique visitors. It never displays hashes or individual visit records. It requires migration `0012_add_visitor_analytics.sql` in the selected environment. Raw events expire after 90 days; replace `Beta` with `Production` only when production inspection is explicitly intended.

Use the repository-local [Visitor Analytics Table skill](../.github/skills/visitor-analytics-table/SKILL.md) when you want this report presented directly as neat Markdown tables for **Beta**, **Production**, or **both**. It runs each requested environment independently and keeps their totals separate.

### Report generation-run analytics (content automation)

The content-generation automation runs twice daily and logs each attempt's status and timing in `generation_runs` plus fine-grained stage events in `generation_run_events`. Use the repository-local report to get aggregate Day / Week / Month IST summaries of runs, succeeded / failed / skipped counts, success rate, and the latest retained run (status + failure reason) for the selected environment:

```powershell
.\infra\cloudflare\content-worker\report-generation-run-analytics.ps1 `
  -Environment Beta `
  -OutputPath "$HOME\Downloads\ai-nuggets-beta-generation-run-analytics.md"
```

Counts include only retained generation runs (retention is three days). The report requires migration `0011_add_generation_run_events.sql` in the selected environment. Replace `Beta` with `Production` only when production inspection is explicitly intended.

### Report published-content summary

Use the repository-local report to see editions totals by status, stories broken down by category, total published stories, and recent editions (last 7 days) for the selected environment:

```powershell
.\infra\cloudflare\content-worker\report-content-summary.ps1 `
  -Environment Beta `
  -OutputPath "$HOME\Downloads\ai-nuggets-beta-content-summary.md"
```

Replace `Beta` with `Production` only when production inspection is explicitly intended.

### Fetch all analytics in one go

Use the repository-local [Fetch Analytics (uber) skill](../.github/skills/fetch-analytics/SKILL.md) when you want visitor analytics, generation-run analytics, reader feedback, and the content summary all in one call for **Beta**, **Production**, or **both**. It runs each requested report per environment independently and keeps their totals separate.

View user login and refresh activity:

```powershell
npx --yes wrangler@latest d1 execute ai-nuggets-content `
  --remote `
  --config $workerConfig `
  --command "SELECT email, display_name, datetime(last_logged_in_at, '+5 hours', '+30 minutes') || ' IST' AS last_logged_in_at_ist, datetime(last_refreshed_at, '+5 hours', '+30 minutes') || ' IST' AS last_refreshed_at_ist, current_streak, longest_streak, streak_last_active_date FROM user_profiles ORDER BY last_refreshed_at DESC, last_logged_in_at DESC;"
```

## Production versus local data

The `--remote` flag queries the live Cloudflare database. Without `--remote`, Wrangler uses a separate local development database. Always include `--remote` when you intend to inspect production content.

These examples use `SELECT` statements and do not modify data. Before running `INSERT`, `UPDATE`, `DELETE`, migrations, or SQL files against `--remote`, review the command carefully and follow the migration process documented in [Cloudflare infrastructure](CLOUDFLARE_INFRASTRUCTURE.md). Remove the generated file when finished with `Remove-Item $workerConfig`.

## Public API view

The published content can also be inspected through the read-only Worker API:

- Latest published edition: `https://ai-nuggets-content.ainuggets123.workers.dev/api/editions/latest`
- Edition on or before a date: `https://ai-nuggets-content.ainuggets123.workers.dev/api/editions/YYYY-MM-DD`

The API only exposes published editions. Use the dashboard or Wrangler when you need to inspect drafts, archived editions, or generation audit records.
