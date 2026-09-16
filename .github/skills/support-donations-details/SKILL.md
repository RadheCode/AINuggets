---
name: support-donations-details
description: Fetch every recorded AI Nuggets support-donation record and support-engagement event from beta or production and present them as neat Markdown tables with IST timestamps.
---

# Support Donations Details

Use this skill when the user asks for support donations details, donation records, support engagement, who donated, donation amounts, or a support-donation report for Beta, Production, or both environments.

## Required input

Ask the user whether to inspect **Beta** or **Production** (or **Both**) when they have not specified an environment. Do not infer production from context. All inspection is read-only.

## Execution procedure

1. Run the repository report from the repository root for each requested environment. For **both**, run Beta first and Production second. Supply a distinct new `.md` `OutputPath` only when the user asks for an offline copy; the command prints the same report.

   ```powershell
   .\infra\cloudflare\content-worker\report-support-donations.ps1 `
     -Environment Beta
   ```

   ```powershell
   .\infra\cloudflare\content-worker\report-support-donations.ps1 `
     -Environment Production
   ```

2. For every requested environment, present the report's **Support engagement** table unchanged. It lists each `event_type` (`support_open` for dialog opens, `support_option_click` for provider checkout clicks) with its `provider_id`, `event_count`, and `unique_visitors`.

3. For every requested environment, present the report's **All donations** table unchanged. It lists every recorded donation with `id`, `email`, `amount`, `provider_id`, `donation_type` (`one_time` or `subscription`), `country`, and `recorded_at_ist`. Render database `NULL` values as `NULL`.

4. State the number of recorded donations. If none exist, state that no donations were recorded in the selected environment.

5. For a **both** request, use separate `## Beta` and `## Production` sections. Do not merge their totals: the environments have independent databases and traffic.

## Safety and privacy

- This skill uses only the report's remote `SELECT` queries through Wrangler. It must not insert, update, delete, apply migrations, configure secrets, or deploy either environment.
- It reads provider resource details only from `infra/cloudflare/config.json` and a rendered temporary Worker manifest. Do not hard-code database IDs, Worker hosts, credentials, or tokens.
- Donations include reader email addresses and amounts. Treat the output as private operator data: do not expose it through public APIs, generation logs, issue comments, or unapproved external systems.
- Support events are privacy-minimal (one-way visitor hash, provider, edge country) and raw events expire after 90 days. Do not query, display, or reconstruct visitor hashes or individual support-event rows.
- All displayed timestamps must be converted from stored UTC to explicitly labeled Indian Standard Time (`IST`, UTC+05:30).
- If the selected database has not received migration `0017_add_support_donations.sql`, report that the support donation schema is unavailable. Do not apply it; beta-first schema deployment requires explicit approval, and production must never be changed implicitly.

## Maintenance

Update this skill and `docs/VIEW_D1_DATABASE.md` whenever the support-donation report query, table columns, environment handling, retention behavior, or privacy boundary changes.