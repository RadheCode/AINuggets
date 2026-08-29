---
name: generation-run-investigation
description: Inspect the newest retained AI Nuggets content-generation run in beta or production, resolve its run ID automatically, and present the complete ordered decision timeline with safe inner event details.
---

# Generation Run Investigation

Use this skill when the user asks to inspect, investigate, debug, explain, show logs for, or summarize the latest content-generation/summarization run in beta or production.

## Required input

Ask the user whether to inspect **Beta** or **Production** when they have not specified an environment. Do not infer production from context. The inspection is read-only in both environments.

## Execution procedure

1. Run the inspector from the repository root, selecting the requested environment:

   ```powershell
   .\infra\cloudflare\content-worker\investigate-latest-generation-run.ps1 -Environment Beta
   ```

   or:

   ```powershell
   .\infra\cloudflare\content-worker\investigate-latest-generation-run.ps1 -Environment Production
   ```

2. The inspector renders a temporary environment-specific Worker manifest, queries the selected remote D1 database for the newest `generation_runs` row with a non-null UUID `run_id`, then queries every `generation_run_events` row for that ID in sequence order. It removes the temporary manifest even if the query fails.
3. Present the inspector output directly in the response. Keep its run summary table, then group every event under the numbered pipeline stage emitted by the inspector. Preserve all safe metadata JSON so the reader can see the decision and inner log details for each event.
4. State clearly if the latest run is `failed` or `skipped`, identifying the first failed/skipped event and its safe error or reason metadata. State clearly when a successful beta run was a dry run and therefore did not save editorial content.

## Safety and retention

- This skill uses only `SELECT` queries through Wrangler with `--remote`; it must not invoke generation, apply migrations, modify data, configure secrets, or deploy either environment.
- It reads provider resource details only from `infra/cloudflare/config.json` and the rendered temporary manifest. Do not hard-code database IDs, Worker hosts, credentials, or tokens.
- Do not use the protected internal Worker endpoint: it requires an automation secret and is unnecessary for this read-only D1 investigation.
- Event metadata is intentionally safe: it excludes credentials, authorization headers, raw source feeds/articles, complete model prompts, and raw model responses. Do not seek or reconstruct excluded data.
- Completed run timelines are eligible for lazy cleanup after three days. If no retained UUID run exists, report that plainly rather than trying another environment or invoking a new run.
- If the selected database has not yet received migration `0011_add_generation_run_events.sql`, report that the timeline schema is unavailable and identify the migration required. Do not apply it: beta-first schema deployment requires explicit user approval, and production must never be changed implicitly.

## Maintenance

Update this skill and `docs/VIEW_D1_DATABASE.md` whenever the generation-run lookup query, unified timeline shape, environment configuration handoff, retention behavior, or investigation privacy boundary changes.
