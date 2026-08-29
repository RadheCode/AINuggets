---
name: generation-run-investigation
description: Inspect the newest retained AI Nuggets content-generation run in beta or production, resolve its run ID automatically, and present or download the complete ordered decision timeline with safe inner event details.
---

# Generation Run Investigation

Use this skill when the user asks to inspect, investigate, debug, explain, show logs for, or summarize the latest content-generation/summarization run in beta or production.

## Required input

Ask the user whether to inspect **Beta** or **Production** when they have not specified an environment. Do not infer production from context. The inspection is read-only in both environments.

## Execution procedure

1. Run the inspector from the repository root, selecting the requested environment. Supply a new `.md` `OutputPath` to save the exact report for offline viewing; the command still prints that same report in the response:

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

2. The inspector renders a temporary environment-specific Worker manifest, queries the selected remote D1 database for the newest `generation_runs` row with a non-null UUID `run_id`, then executes this exact unified query for that ID. When `OutputPath` is supplied, it writes the exact terminal report, including this query, its exact result table, and the readable timeline, to that Markdown file. It removes the temporary manifest even if the query fails:

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

3. Present the inspector output directly in the response. Preserve the **Exact unified query result (SQL table)** unchanged; it is the authoritative complete output. It must have one row per returned SQL row and these columns in query order: `sequence`, `stage`, `event_name`, `metadata_json`, `run_id`, `target_date`, `run_status`, `run_details`, `started_at_ist`, `finished_at_ist`, `outcome`, `duration_ms`, and `event_created_at_ist`. Render database `NULL` values as `NULL`. The grouped stage timeline is only a readable view of those same rows, not a replacement for them.
4. State clearly if the latest run is `failed` or `skipped`, identifying the first failed/skipped event and its safe error or reason metadata. State clearly when a successful beta run was a dry run and therefore did not save editorial content.

## Safety and retention

- This skill uses only `SELECT` queries through Wrangler with `--remote`; it must not invoke generation, apply migrations, modify data, configure secrets, or deploy either environment.
- It reads provider resource details only from `infra/cloudflare/config.json` and the rendered temporary manifest. Do not hard-code database IDs, Worker hosts, credentials, or tokens.
- Do not use the protected internal Worker endpoint: it requires an automation secret and is unnecessary for this read-only D1 investigation.
- Event metadata is intentionally safe: it excludes credentials, authorization headers, raw source feeds/articles, complete model prompts, and raw model responses. Do not seek or reconstruct excluded data.
- Completed run timelines are eligible for lazy cleanup after three days. If no retained UUID run exists, report that plainly rather than trying another environment or invoking a new run.
- If the selected database has not yet received migration `0011_add_generation_run_events.sql`, report that the timeline schema is unavailable and identify the migration required. Do not apply it: beta-first schema deployment requires explicit user approval, and production must never be changed implicitly.
- All displayed query timestamps must be converted from stored UTC to explicitly labeled Indian Standard Time (`IST`, UTC+05:30). Keep UTC columns for filtering and ordering; do not silently treat stored UTC values as IST.

## Maintenance

Update this skill and `docs/VIEW_D1_DATABASE.md` whenever the generation-run lookup query, unified timeline shape, environment configuration handoff, retention behavior, or investigation privacy boundary changes.
