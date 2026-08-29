---
name: visitor-analytics-table
description: Fetch privacy-minimal AI Nuggets visitor analytics for beta, production, or both, and present unique visitors, unique countries, page visits, and country breakdowns as neat Markdown tables with IST periods.
---

# Visitor Analytics Table

Use this skill when the user asks for visitor analytics, traffic counts, page visits, unique visitors, countries, or an analytics report for Beta, Production, or both environments.

## Required input

Ask whether to inspect **Beta**, **Production**, or **both** only when the user has not specified an environment. Never infer Production from context. All inspection is read-only.

## Execution procedure

1. Run the repository report from the repository root for each requested environment. For **both**, run Beta first and Production second. Supply a distinct new `.md` `OutputPath` only when the user asks for an offline copy; the command prints the same report.

   ```powershell
   .\infra\cloudflare\content-worker\report-visitor-analytics.ps1 `
     -Environment Beta
   ```

   ```powershell
   .\infra\cloudflare\content-worker\report-visitor-analytics.ps1 `
     -Environment Production
   ```

2. For every requested environment, present the report's **Current periods** table unchanged. It contains the complete requested metrics for the current IST calendar day, Monday-based week, and calendar month:

   | Metric | Report column |
   | --- | --- |
   | Unique visitors | `unique_visitors` |
   | Unique countries | `unique_countries` |
   | Page visits | `page_visits` |

   Preserve `period_start_ist` and `period_end_ist` so each total has an explicit IST boundary. Period ends are exclusive.

3. For every requested environment, present the **Country breakdown** table unchanged when returned. It lists each readable English country name and code, its page visits, and its unique visitors for each current period. State plainly when it has no country-resolved visits. `unknown` edge-country values remain included in visitor and page-visit totals but are excluded from the unique-country metric and country breakdown.

4. For a **both** request, use separate `## Beta` and `## Production` sections. Do not merge their totals: the environments have independent databases and traffic.

5. State plainly if the selected environment has no analytics schema or no recorded visits. Do not query another environment unless the user asked for both.

## Safety and privacy

- This skill uses only the report's remote `SELECT` queries through Wrangler. It must not insert, update, delete, apply migrations, configure secrets, or deploy either environment.
- It reads provider resource details only from `infra/cloudflare/config.json` and a rendered temporary Worker manifest. Do not hard-code database IDs, Worker hosts, credentials, or tokens.
- The report exposes aggregate counts only. Do not query, display, or reconstruct anonymous visitor hashes or individual visit events.
- Analytics records country code and readable English country name from Cloudflare edge metadata. It does not retain IP addresses, precise locations, referrers, user agents, browser fingerprints, or authenticated-profile links.
- All displayed period boundaries must be explicitly labeled Indian Standard Time (`IST`, UTC+05:30). The report uses the current IST day, Monday-based week, and calendar month.
- If the selected database has not received `0012_add_visitor_analytics.sql`, report that analytics is unavailable. Do not apply it; beta-first schema deployment requires explicit approval, and production must never be changed implicitly.
- Raw events expire after 90 days. An offline report is private operational data; create it only in an approved private location and never overwrite an existing report.

## Maintenance

Update this skill and `docs/VIEW_D1_DATABASE.md` whenever the analytics report query, table columns, environment handling, retention behavior, or privacy boundary changes.
