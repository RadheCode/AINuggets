---
name: generation-run-investigation
description: Inspect the newest retained AI Nuggets content-generation run in beta or production, resolve its run ID automatically, and present or download the complete ordered decision timeline with safe inner event details and model/provider drill-down.
---

# Generation Run Investigation

Use this skill when the user asks to inspect, investigate, debug, explain, show logs for, or summarize the latest content-generation/summarization run in beta or production. Also use it when the user asks to see model/provider details for a specific run.

## Required input

Ask the user whether to inspect **Beta** or **Production** when they have not specified an environment. Do not infer production from context. The inspection is read-only in both environments.

## Execution procedure

### Step 1: Run the timeline inspector

Run the inspector from the repository root, selecting the requested environment. Supply a new `.md` `OutputPath` to save the exact report for offline viewing; the command still prints that same report in the response:

```powershell
.\infra\cloudflare\content-worker\investigate-latest-generation-run.ps1 `
  -Environment Beta `
  -OutputPath "$HOME\Downloads\ai-nuggets-latest-beta-run.md"
```

or:

```powershell
.\infra\cloudflare\content-worker\investigate-latest-generation-run.ps1 `
  -Environment Production `
  -OutputPath "$HOME\Downloads\ai-nuggets-latest-production-run.md"
```

The `.md` report is UTF-8, self-contained, and readable in any Markdown viewer while offline. The inspector creates a missing destination folder but refuses to overwrite an existing report; choose a different file name for another export.

### Step 2: Present the unified timeline

The inspector renders a temporary environment-specific Worker manifest, queries the selected remote D1 database for the newest `generation_runs` row with a non-null UUID `run_id`, then executes this exact unified query for that ID. When `OutputPath` is supplied, it writes the exact terminal report, including this query, its exact result table, and the readable timeline, to that Markdown file. It removes the temporary manifest even if the query fails:

```sql
SELECT
  e.sequence,
  e.stage,
  e.event_name,
  e.metadata_json,
  r.run_id,
  r.target_date,
  r.status AS run_status,
  r.details AS run_details,
  datetime(r.started_at, '+5 hours', '+30 minutes') || ' IST' AS started_at_ist,
  datetime(r.finished_at, '+5 hours', '+30 minutes') || ' IST' AS finished_at_ist,
  e.outcome,
  e.duration_ms,
  datetime(e.created_at, '+5 hours', '+30 minutes') || ' IST' AS event_created_at_ist
FROM generation_runs AS r
LEFT JOIN generation_run_events AS e
  ON e.run_id = r.run_id
WHERE r.run_id = '<resolved-runId>'
ORDER BY e.sequence ASC;
```

Present the inspector output directly in the response. Preserve the **Exact unified query result (SQL table)** unchanged; it is the authoritative complete output. It must have one row per returned SQL row and these columns in query order: `sequence`, `stage`, `event_name`, `metadata_json`, `run_id`, `target_date`, `run_status`, `run_details`, `started_at_ist`, `finished_at_ist`, `outcome`, `duration_ms`, and `event_created_at_ist`. Render database `NULL` values as `NULL`. The grouped stage timeline is only a readable view of those same rows, not a replacement for them.

### Step 3: Model/provider drill-down for the run

After presenting the timeline, always include a model/provider drill-down section for the investigated run. Extract and present the following from the `summary-provider-*` events in the timeline:

**Provider fallback chain context:**
- The configured fallback order is: `["openai", "gemini", "openrouter", "workers-ai"]`
- Each provider kind has retryable HTTP status codes (openai/gemini/openrouter: 404, 500, 502, 503, 504; workers-ai: 429, 5xx, rate/capacity terms)
- Request timeout is 300 seconds per model call
- Within each provider, models can be configured as an array for internal fallback

**For the investigated run, present:**

1. **Model attempt sequence** — which model was tried first, second, etc., with outcome (succeeded/failed/timeout)
2. **Fallback triggers** — what caused fallback to the next model (timeout, HTTP error code, invalid JSON, validation failure, quota exhaustion)
3. **Response characteristics** — response character count for successful responses
4. **Validation retry loop** — if `summary-provider-retrying` events exist, show how many times the model was retried after validation failures and which validation rule failed
5. **Total run latency** — from first model attempt to final success or failure

Present this as a structured table:

| # | Model | Provider Kind | Outcome | Trigger | Duration | Response Chars |
|---|---|---|---|---|---|---|
| 1 | model-name | openai | failed | 400 Bad Request | - | - |
| 2 | model-name | gemini | succeeded | - | 45s | 11,200 |

### Step 4: Interpret and summarize

State clearly if the run is `failed` or `skipped`, identifying the first failed/skipped event and its safe error or reason metadata. State clearly when a successful beta run was a dry run and therefore did not save editorial content.

For model/provider analysis, call out:
- Whether the primary model succeeded on first attempt or required fallback
- Any patterns (e.g., "this model consistently fails on validation for standard summaries")
- Whether the failure was a provider-level issue (quota, auth) or a model quality issue (invalid JSON, format validation)

## Safety and retention

- This skill uses only `SELECT` queries through Wrangler with `--remote`; it must not invoke generation, apply migrations, modify data, configure secrets, or deploy either environment.
- It reads provider resource details only from `infra/cloudflare/config.json` and the rendered temporary manifest. Do not hard-code database IDs, Worker hosts, credentials, or tokens.
- Do not use the protected internal Worker endpoint: it requires an automation secret and is unnecessary for this read-only D1 investigation.
- Event metadata is intentionally safe: it excludes credentials, authorization headers, raw source feeds/articles, complete model prompts, and raw model responses. Do not seek or reconstruct excluded data.
- Completed run timelines are eligible for lazy cleanup after three days. If no retained UUID run exists, report that plainly rather than trying another environment or invoking a new run.
- If the selected database has not yet received migration `0011_add_generation_run_events.sql`, report that the timeline schema is unavailable and identify the migration required. Do not apply it: beta-first schema deployment requires explicit user approval, and production must never be changed implicitly.
- All displayed query timestamps must be converted from stored UTC to explicitly labeled Indian Standard Time (`IST`, UTC+05:30). Keep UTC columns for filtering and ordering; do not silently treat stored UTC values as IST.

## Maintenance

Update this skill and `docs/VIEW_D1_DATABASE.md` whenever the generation-run lookup query, unified timeline shape, environment configuration handoff, retention behavior, model/provider fallback behavior, or investigation privacy boundary changes.
