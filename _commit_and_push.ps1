#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

$repoRoot = "C:\work\projects\AINuggets"
Set-Location $repoRoot

Write-Host "=== Staging all changes ==="
git add -A
Write-Host "=== Staged files ==="
git status --short

Write-Host "`n=== Committing ==="
git commit -m "feat: add model/provider analytics to analysis skills

Add comprehensive model/provider analytics as part of the overall
analysis skill ecosystem:

- New report-model-analytics.ps1 script with per-model stats,
  daily usage, run summaries, validation analysis, and
  per-run model progression
- Updated fetch-analytics skill (5 reports, was 4)
- Updated generation-run-investigation skill with model/provider
  drill-down steps
- Updated VIEW_D1_DATABASE.md with model analytics SQL queries
- Updated DAILY_CONTENT_AUTOMATION.md with provider fallback docs
- Updated AI_NUGGETS_FEATURE_SUMMARY.md with model analytics features

Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>"

Write-Host "`n=== Pushing to remote ==="
git push

Write-Host "`n=== Done: committed and pushed ==="
