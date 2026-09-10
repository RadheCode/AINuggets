---
name: fetch-analytics
description: Fetch AI Nuggets analytics from beta or production covering visitors, content-generation automation runs, model/provider analytics, reader feedback, and published-content summary, and present them as neat Markdown tables with IST timestamps. This is the single comprehensive analytics skill for the product.
---

# Fetch Analytics (uber skill)

Use this skill when the user asks for analytics, metrics, stats, reports, or health checks on the AI Nuggets product — covering site visitors, the twice-daily content-generation automation, model/provider performance, reader feedback, and published content. This is the umbrella entry point that combines all previously separate analytics skills into one.

## Required input

Ask the user whether to inspect **Beta** or **Production** (or **Both**) when they have not specified an environment. Do not infer production from context. All reports are read-only in every environment.

If the user wants only one report (e.g., "just generation runs" or "just model analytics"), run only that report. By default the skill runs all five reports for the requested environment(s).

## Execution procedure

Run the five reporter/exporter scripts from the repository root. All scripts print their report in the response; supply a new `.md` `OutputPath` when the user needs offline copies. Each script creates a missing destination folder but refuses to overwrite an existing report.

### 1. Visitor analytics
```powershell
.\infra\cloudflare\content-worker\report-visitor-analytics.ps1 -Environment Beta
```
Presents unique visitors, unique countries, page visits, and country breakdowns for Day / Week / Month IST periods.

### 2. Generation-run analytics (content automation)
```powershell
.\infra\cloudflare\content-worker\report-generation-run-analytics.ps1 -Environment Beta
```
Presents runs count, succeeded / failed / skipped counts, success rate, and the latest retained run (status + failure reason) for Day / Week / Month IST periods. Counts include only retained generation runs (retention is three days).

### 3. Model and provider analytics
```powershell
.\infra\cloudflare\content-worker\report-model-analytics.ps1 -Environment Beta
```
Presents the provider fallback chain configuration, per-model aggregate statistics (attempts, successes, failures, response sizes), model usage by date, run-level summary with durations, validation retry analysis, validation failure details, and per-run model progression showing which model was tried and the fallback chain followed. Covers the last 8 days of retained runs.

### 4. Reader feedback
```powershell
.\infra\cloudflare\content-worker\export-reader-feedback.ps1 -Environment Beta
```
Presents every reader feedback submission with `id`, `email`, `rating`, `message`, and `submitted_at_ist`. **This output is private operator data** — treat emails and free-text as sensitive, never share outside approved channels.

### 5. Content summary
```powershell
.\infra\cloudflare\content-worker\report-content-summary.ps1 -Environment Beta
```
Presents an editions overview, stories by category, total published stories, and recent editions (last 7 days).

### When the user selects "Both" or "Production"

- For **Both**: run all five reports for `Beta`, then all five again for `Production`, each under its own `## Beta` / `## Production` heading in the response.
- For **Production**: replace every `Beta` with `Production` above. Only do this when the user explicitly requested production.

## Presentation

- Preserve each report's SQL result tables unchanged and in the exact column order the scripts emit.
- Render database `NULL` values as `NULL`.
- All displayed timestamps must be converted from stored UTC to explicitly labeled Indian Standard Time (`IST`, UTC+05:30). Keep UTC columns for filtering/ordering only; never present unlabeled UTC as reader-facing output.
- State clearly when a report finds no data (e.g., no feedback, no retained runs, no recent editions).
- For generation-run analytics, call out clearly if the latest retained run `failed` or `skipped`, giving the safe error/reason. If a successful beta run was a dry run and so did not save editorial content, state that too.
- For model analytics, highlight which model is currently primary, which providers have been used, and any models with high failure rates or quota issues.

## Safety and privacy

- This skill uses only `SELECT` queries through Wrangler with `--remote`; it must not invoke generation, insert/update/delete data, apply migrations, configure secrets, or deploy either environment.
- It reads provider resource details only from `infra/cloudflare/config.json` and a rendered temporary Worker manifest. Do not hard-code database IDs, Worker hosts, credentials, or tokens.
- Reader feedback includes reader email addresses and free text — treat output as private operator data; do not expose it through public APIs, generation logs, issue comments, or unapproved external systems.
- The scripts create a missing output directory but refuse to overwrite an existing report. Store offline reports only in an approved private location.
- Do not use the protected internal Worker endpoint for any of these read-only reports.
- If the selected database is missing a required schema (e.g., `reader_feedback` migration `0009`, `generation_run_events` migration `0011`, `visitor_visits` migration `0012`), report that the relevant section is unavailable and identify the required migration. Do not apply it; beta-first schema deployment requires explicit approval, and production must never be changed implicitly.
- Completed generation-run timelines are eligible for lazy cleanup after three days; the run analytics count only retained runs.

## Maintenance

Update this skill, plus `docs/VIEW_D1_DATABASE.md` and `docs/AI_NUGGETS_FEATURE_SUMMARY.md`, whenever any of the visitor, generation-run, model-analytics, reader-feedback, or content-summary queries, table columns, environment handoff, retention behavior, or privacy boundary changes.
