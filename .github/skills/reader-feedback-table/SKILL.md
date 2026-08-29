---
name: reader-feedback-table
description: Fetch every private AI Nuggets reader-feedback submission from beta or production and present it as a neat Markdown table with IST timestamps.
---

# Reader Feedback Table

Use this skill when the user asks to fetch, list, view, export, or summarize all reader feedback submissions.

## Required input

Ask the user whether to inspect **Beta** or **Production** when they have not specified an environment. Do not infer production from context. The inspection is read-only in both environments.

## Execution procedure

1. Run the feedback exporter from the repository root for the requested environment. Supply a new `.md` `OutputPath` when the user needs an offline copy; the command prints the same report:

   ```powershell
   .\infra\cloudflare\content-worker\export-reader-feedback.ps1 `
     -Environment Beta `
     -OutputPath "$HOME\Downloads\ai-nuggets-beta-reader-feedback.md"
   ```

   Replace `Beta` with `Production` only when the user explicitly requested production.

2. Present the report's **All feedback** table unchanged. It is the complete ordered result and contains every returned submission with `id`, `email`, `rating`, `message`, and `submitted_at_ist`. Render database `NULL` values as `NULL`.

3. State the number of returned submissions. If none exist, state that no feedback was found in the selected environment.

## Safety and privacy

- This skill uses only `SELECT` queries through Wrangler with `--remote`; it must not insert, update, delete, apply migrations, configure secrets, or deploy either environment.
- It reads provider resource details only from `infra/cloudflare/config.json` and a rendered temporary Worker manifest. Do not hard-code database IDs, Worker hosts, credentials, or tokens.
- Feedback includes reader email addresses and free text. Treat the output as private operator data: do not expose it through public APIs, generation logs, issue comments, or unapproved external systems.
- The exporter creates a missing output directory but refuses to overwrite an existing report. Store offline reports only in an approved private location.
- All displayed timestamps must be converted from stored UTC to explicitly labeled Indian Standard Time (`IST`, UTC+05:30).
- If the selected database has not received migration `0009_add_reader_feedback.sql`, report that the feedback schema is unavailable. Do not apply it; beta-first schema deployment requires explicit approval, and production must never be changed implicitly.

## Maintenance

Update this skill and `docs/VIEW_D1_DATABASE.md` whenever the feedback query, table columns, environment configuration handoff, or privacy boundary changes.
