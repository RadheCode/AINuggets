[CmdletBinding()]
param(
  [ValidateSet("Beta", "Production")]
  [string]$Environment = "Beta",
  [ValidatePattern('(?i)\.md$')]
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
  $resolvedOutputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
  $outputDirectory = Split-Path -Parent $resolvedOutputPath
  if ([string]::IsNullOrWhiteSpace($outputDirectory)) { throw "OutputPath must include a destination directory." }
  if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) { New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null }
  if (Test-Path -LiteralPath $resolvedOutputPath -PathType Leaf) { throw "The Markdown report already exists: $resolvedOutputPath. Choose a new OutputPath to avoid overwriting it." }
  $report = @(& $PSCommandPath -Environment $Environment)
  [System.IO.File]::WriteAllLines($resolvedOutputPath, [string[]]$report, [System.Text.UTF8Encoding]::new($false))
  $report | Write-Output
  Write-Output ""
  Write-Output "Offline Markdown report saved: $resolvedOutputPath"
  return
}

function Invoke-D1ReadQuery {
  param([string]$DatabaseName, [string]$WorkerConfig, [string]$Query)
  $singleLineQuery = (($Query -replace "[\r\n]+", " ") -replace "\s{2,}", " ").Trim()
  $output = & npx --yes wrangler@latest d1 execute $DatabaseName --remote --config $WorkerConfig --json --command $singleLineQuery 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw "The D1 read-only query failed: $output" }
  $response = $output | ConvertFrom-Json
  if (-not $response[0].success) { throw "D1 did not report a successful query." }
  return @($response[0].results)
}

function Write-ModelAggregateTable {
  param([object[]]$Rows, [string]$Title)
  if ($Rows.Count -eq 0) { Write-Output "No data available for $Title."; return }
  $columns = @("model", "attempts", "succeeded", "failed", "model_failures", "avg_response_chars", "min_response_chars", "max_response_chars", "unique_errors")
  Write-Output "## $Title"
  Write-Output ""
  Write-Output "| Model | Attempts | Succeeded | Failed | Model Failures | Avg Chars | Min Chars | Max Chars | Distinct Errors |"
  Write-Output "| --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  foreach ($row in $Rows) {
    $errPreview = if ($row.unique_errors) { $row.unique_errors.Substring(0, [Math]::Min(60, $row.unique_errors.Length)) + $(if ($row.unique_errors.Length -gt 60) { "..." } else { "" }) } else { "none" }
    Write-Output ("| {0} | {1} | {2} | {3} | {4} | {5} | {6} | {7} | {8} |" -f $row.model, $row.attempts, $row.succeeded, $row.failed, $row.model_failures, $row.avg_response_chars, $row.min_response_chars, $row.max_response_chars, $errPreview)
  }
}

function Write-RunProgressionTable {
  param([object[]]$Rows, [string]$Title)
  if ($Rows.Count -eq 0) { Write-Output "No data available for $Title."; return }
  Write-Output "## $Title"
  Write-Output ""
  Write-Output "| Date | Run | Seq | Event | Model | Outcome | Duration (ms) | Error |"
  Write-Output "| --- | --- | --- | --- | --- | --- | --- | --- |"
  foreach ($row in $Rows) {
    $errPreview = if ($row.error) { $row.error.Substring(0, [Math]::Min(50, $row.error.Length)) + $(if ($row.error.Length -gt 50) { "..." } else { "" }) } else { "" }
    $modelDisplay = if ($row.model -and $row.model.Length -gt 25) { $row.model.Substring(0, 22) + "..." } elseif ($row.model) { $row.model } else { "-" }
    $outcomeIcon = switch ($row.outcome) { "succeeded" { "ok" } "failed" { "fail" } "info" { "info" } default { $row.outcome } }
    Write-Output ("| {0} | {1} | {2} | {3} | {4} | {5} | {6} | {7} |" -f $row.date, $row.run_short, $row.seq, $row.event, $modelDisplay, $outcomeIcon, $(if ($row.duration_ms) { $row.duration_ms } else { "-" }), $errPreview)
  }
}

function Write-ValidationTable {
  param([object[]]$Rows, [string]$Title)
  if ($Rows.Count -eq 0) { Write-Output "No data available for $Title."; return }
  Write-Output "## $Title"
  Write-Output ""
  Write-Output "| Date | Run | Stories | Attempt | Error |"
  Write-Output "| --- | --- | --- | --- | --- |"
  foreach ($row in $Rows) {
    $errPreview = if ($row.error) { $row.error.Substring(0, [Math]::Min(70, $row.error.Length)) + $(if ($row.error.Length -gt 70) { "..." } else { "" }) } else { "-" }
    Write-Output ("| {0} | {1} | {2} | {3} | {4} |" -f $row.date, $row.run_short, $row.story_count, $row.attempt, $errPreview)
  }
}

function Write-RunSummaryTable {
  param([object[]]$Rows, [string]$Title)
  if ($Rows.Count -eq 0) { Write-Output "No data available for $Title."; return }
  Write-Output "## $Title"
  Write-Output ""
  Write-Output "| Date | Run | Status | Stories | Duration | Details |"
  Write-Output "| --- | --- | --- | --- | --- | --- |"
  foreach ($row in $Rows) {
    $detailsPreview = if ($row.details) { $row.details.Substring(0, [Math]::Min(60, $row.details.Length)) + $(if ($row.details.Length -gt 60) { "..." } else { "" }) } else { "-" }
    Write-Output ("| {0} | {1} | {2} | {3} | {4} | {5} |" -f $row.date, $row.run_short, $row.status, $(if ($row.stories) { $row.stories } else { "-" }), $(if ($row.duration_s) { "$($row.duration_s)s" } else { "-" }), $detailsPreview)
  }
}

$temporaryConfig = [System.IO.Path]::GetTempFileName()
try {
  & (Join-Path $PSScriptRoot "render-worker-config.ps1") -Environment $Environment -OutputPath $temporaryConfig | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not render the $Environment Worker configuration." }
  $cloudflareConfig = Get-Content (Join-Path $PSScriptRoot "..\config.json") -Raw | ConvertFrom-Json
  $databaseName = $cloudflareConfig.environments.$($Environment.ToLowerInvariant()).contentDatabaseName
  if ([string]::IsNullOrWhiteSpace($databaseName)) { throw "No D1 database name is configured for $Environment." }

  # Verify timeline schema exists
  $runColumns = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query "SELECT name FROM pragma_table_info('generation_runs') WHERE name = 'run_id';"
  if ($runColumns.Count -eq 0) { throw "The $Environment database does not have the generation-run timeline schema. Apply migration 0011_add_generation_run_events.sql." }

  # 1. Provider fallback chain configuration (from code constants)
  $fallbackOrderQuery = "SELECT DISTINCT json_extract(e.metadata_json, '$.model') AS model FROM generation_run_events e WHERE e.event_name = 'summary-provider-attempt' AND e.created_at > datetime('now', '-8 days') ORDER BY model;"
  [object[]]$configuredModels = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $fallbackOrderQuery)

  # 2. Per-model aggregate stats (last 8 days)
  $modelStatsQuery = @"
SELECT
  COALESCE(json_extract(e.metadata_json, '$.model'), 'unknown') AS model,
  SUM(CASE WHEN e.event_name = 'summary-provider-attempt' THEN 1 ELSE 0 END) AS attempts,
  SUM(CASE WHEN e.event_name = 'summary-provider-response-received' AND e.outcome = 'succeeded' THEN 1 ELSE 0 END) AS succeeded,
  SUM(CASE WHEN e.event_name = 'summary-provider-attempt-failed' THEN 1 ELSE 0 END) AS failed,
  SUM(CASE WHEN e.event_name = 'summary-provider-model-failed' THEN 1 ELSE 0 END) AS model_failures,
  CAST(AVG(CASE WHEN e.event_name = 'summary-provider-response-received' AND json_extract(e.metadata_json, '$.responseCharacterCount') IS NOT NULL THEN json_extract(e.metadata_json, '$.responseCharacterCount') END) AS INTEGER) AS avg_response_chars,
  MIN(CASE WHEN e.event_name = 'summary-provider-response-received' THEN json_extract(e.metadata_json, '$.responseCharacterCount') END) AS min_response_chars,
  MAX(CASE WHEN e.event_name = 'summary-provider-response-received' THEN json_extract(e.metadata_json, '$.responseCharacterCount') END) AS max_response_chars,
  GROUP_CONCAT(DISTINCT CASE WHEN e.event_name = 'summary-provider-attempt-failed' THEN substr(json_extract(e.metadata_json, '$.error'), 1, 60) END) AS unique_errors
FROM generation_run_events e
WHERE e.created_at > datetime('now', '-8 days')
  AND e.event_name IN ('summary-provider-attempt', 'summary-provider-response-received', 'summary-provider-attempt-failed', 'summary-provider-model-failed')
GROUP BY model
ORDER BY attempts DESC
"@
  [object[]]$modelStats = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $modelStatsQuery)

  # 3. Per-run model progression (last 8 days)
  $progressionQuery = @"
SELECT
  r.target_date AS date,
  substr(r.run_id, 1, 8) AS run_short,
  e.sequence AS seq,
  e.event_name AS event,
  COALESCE(json_extract(e.metadata_json, '$.model'), '-') AS model,
  e.outcome,
  e.duration_ms,
  CASE
    WHEN json_extract(e.metadata_json, '$.error') IS NOT NULL THEN substr(json_extract(e.metadata_json, '$.error'), 1, 80)
    ELSE NULL
  END AS error
FROM generation_run_events e
JOIN generation_runs r ON e.run_id = r.run_id
WHERE r.started_at > datetime('now', '-8 days')
  AND e.event_name IN ('summary-provider-attempt', 'summary-provider-response-received', 'summary-provider-attempt-failed', 'summary-provider-retrying', 'summary-provider-model-failed', 'summary-provider-succeeded', 'summary-provider-failed')
ORDER BY r.target_date DESC, r.run_id, e.sequence ASC
"@
  [object[]]$progression = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $progressionQuery)

  # 4. Validation failure details (last 8 days)
  $validationQuery = @"
SELECT
  r.target_date AS date,
  substr(r.run_id, 1, 8) AS run_short,
  json_extract(e.metadata_json, '$.generatedStoryCount') AS story_count,
  json_extract(e.metadata_json, '$.attempt') AS attempt,
  json_extract(e.metadata_json, '$.error') AS error
FROM generation_run_events e
JOIN generation_runs r ON e.run_id = r.run_id
WHERE r.started_at > datetime('now', '-8 days')
  AND e.event_name = 'edition-validation-failed'
ORDER BY r.target_date DESC, r.run_id, e.sequence ASC
"@
  [object[]]$validationFails = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $validationQuery)

  # 5. Run-level summary with story count and duration (last 8 days)
  $runSummaryQuery = @"
SELECT
  r.target_date AS date,
  substr(r.run_id, 1, 8) AS run_short,
  r.status,
  CAST((julianday(r.finished_at) - julianday(r.started_at)) * 86400 AS INTEGER) AS duration_s,
  json_extract(
    (SELECT e.metadata_json FROM generation_run_events e WHERE e.run_id = r.run_id AND e.event_name = 'summary-provider-succeeded' LIMIT 1),
    '$.generatedStoryCount'
  ) AS stories,
  r.details
FROM generation_runs r
WHERE r.started_at > datetime('now', '-8 days')
  AND r.run_id IS NOT NULL
ORDER BY r.target_date DESC, r.run_id
"@
  [object[]]$runSummary = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $runSummaryQuery)

  # 6. Aggregate model success rate by date (last 8 days)
  $dailyModelQuery = @"
SELECT
  r.target_date AS date,
  COALESCE(json_extract(e.metadata_json, '$.model'), 'unknown') AS model,
  SUM(CASE WHEN e.event_name = 'summary-provider-response-received' AND e.outcome = 'succeeded' THEN 1 ELSE 0 END) AS successes,
  SUM(CASE WHEN e.event_name = 'summary-provider-attempt-failed' THEN 1 ELSE 0 END) AS failures
FROM generation_run_events e
JOIN generation_runs r ON e.run_id = r.run_id
WHERE r.started_at > datetime('now', '-8 days')
  AND e.event_name IN ('summary-provider-response-received', 'summary-provider-attempt-failed')
GROUP BY r.target_date, model
ORDER BY r.target_date DESC, successes DESC
"@
  [object[]]$dailyModel = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $dailyModelQuery)

  # 7. Validation retry counts per run
  $retryQuery = @"
SELECT
  r.target_date AS date,
  substr(r.run_id, 1, 8) AS run_short,
  SUM(CASE WHEN e.event_name = 'summary-provider-retrying' THEN 1 ELSE 0 END) AS retry_count,
  SUM(CASE WHEN e.event_name = 'edition-validation-failed' THEN 1 ELSE 0 END) AS validation_failures,
  SUM(CASE WHEN e.event_name = 'edition-validation-succeeded' THEN 1 ELSE 0 END) AS validation_successes
FROM generation_run_events e
JOIN generation_runs r ON e.run_id = r.run_id
WHERE r.started_at > datetime('now', '-8 days')
GROUP BY r.run_id
HAVING retry_count > 0 OR validation_failures > 0
ORDER BY r.target_date DESC, r.run_id
"@
  [object[]]$retryStats = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $retryQuery)

  # === OUTPUT ===
  Write-Output "# Model analytics: $Environment"
  Write-Output ""
  Write-Output "Periods use India Standard Time (IST, UTC+05:30). Model data covers the last 8 days of retained generation runs."
  Write-Output ""
  Write-Output "---"
  Write-Output ""

  # Provider fallback chain
  Write-Output "## Provider fallback chain"
  Write-Output ""
  Write-Output "The generation pipeline uses a composite provider pattern with automatic fallback:"
  Write-Output ""
  Write-Output '```'
  Write-Output 'fallbackOrder: ["openai", "gemini", "openrouter", "workers-ai"]'
  Write-Output '```'
  Write-Output ""
  Write-Output "| Priority | Provider Kind | Retryable on | Timeout |"
  Write-Output "| --- | --- | --- | --- |"
  Write-Output "| 1 | OpenAI-compatible | 404, 500, 502, 503, 504 | 300s |"
  Write-Output "| 2 | Gemini (OpenAI-compat) | 404, 500, 502, 503, 504 | 300s |"
  Write-Output "| 3 | OpenRouter free-tier | 404, 500, 502, 503, 504 | 300s |"
  Write-Output "| 4 | Workers AI (CF binding) | 429, 5xx, rate/capacity terms | 300s |"
  Write-Output ""
  Write-Output "Models found in the last 8 days:"
  if ($configuredModels.Count -gt 0) {
    foreach ($m in $configuredModels) {
      if ($m.model -and $m.model -ne "unknown") { Write-Output "- ``$($m.model)``" }
    }
  } else {
    Write-Output "- No model attempts recorded in the last 8 days."
  }
  Write-Output ""
  Write-Output "---"
  Write-Output ""

  # Per-model aggregate stats
  Write-ModelAggregateTable -Rows $modelStats -Title "Per-model aggregate statistics"
  Write-Output ""
  Write-Output "---"
  Write-Output ""

  # Daily model usage
  Write-Output "## Model usage by date"
  Write-Output ""
  if ($dailyModel.Count -eq 0) {
    Write-Output "No model usage data available."
  } else {
    Write-Output "| Date | Model | Successes | Failures |"
    Write-Output "| --- | --- | --- | --- |"
    foreach ($row in $dailyModel) {
      Write-Output ("| {0} | {1} | {2} | {3} |" -f $row.date, $row.model, $row.successes, $row.failures)
    }
  }
  Write-Output ""
  Write-Output "---"
  Write-Output ""

  # Run-level summary
  Write-RunSummaryTable -Rows $runSummary -Title "Run-level summary (last 8 days)"
  Write-Output ""
  Write-Output "---"
  Write-Output ""

  # Validation retry analysis
  Write-Output "## Validation retry analysis"
  Write-Output ""
  if ($retryStats.Count -eq 0) {
    Write-Output "No validation retries recorded in the last 8 days."
  } else {
    Write-Output "| Date | Run | Retries | Validation Fails | Validation Passes |"
    Write-Output "| --- | --- | --- | --- | --- |"
    foreach ($row in $retryStats) {
      Write-Output ("| {0} | {1} | {2} | {3} | {4} |" -f $row.date, $row.run_short, $row.retry_count, $row.validation_failures, $row.validation_successes)
    }
  }
  Write-Output ""
  Write-Output "---"
  Write-Output ""

  # Validation failure details
  Write-ValidationTable -Rows $validationFails -Title "Validation failure details"
  Write-Output ""
  Write-Output "---"
  Write-Output ""

  # Full per-run model progression
  Write-RunProgressionTable -Rows $progression -Title "Per-run model progression (last 8 days)"
  Write-Output ""
  Write-Output "---"
  Write-Output ""

  # Summary statistics
  $totalAttempts = ($modelStats | Measure-Object -Property attempts -Sum).Sum
  $totalSucceeded = ($modelStats | Measure-Object -Property succeeded -Sum).Sum
  $totalFailed = ($modelStats | Measure-Object -Property failed -Sum).Sum
  $totalModelFailures = ($modelStats | Measure-Object -Property model_failures -Sum).Sum
  $totalRetries = ($retryStats | Measure-Object -Property retry_count -Sum).Sum
  $totalValidationFails = ($retryStats | Measure-Object -Property validation_failures -Sum).Sum
  $totalRuns = $runSummary.Count
  $successfulRuns = ($runSummary | Where-Object { $_.status -eq "succeeded" -or $_.status -eq "published" }).Count
  $failedRuns = ($runSummary | Where-Object { $_.status -eq "failed" }).Count

  Write-Output "## Overall summary"
  Write-Output ""
  Write-Output "| Metric | Value |"
  Write-Output "| --- | --- |"
  Write-Output "| Total runs (8 days) | $totalRuns |"
  Write-Output "| Successful runs | $successfulRuns |"
  Write-Output "| Failed runs | $failedRuns |"
  Write-Output "| Run success rate | $(if ($totalRuns -gt 0) { "$([math]::Round(100 * $successfulRuns / $totalRuns))%" } else { 'n/a' }) |"
  Write-Output "| Total model attempts | $totalAttempts |"
  Write-Output "| Total model successes | $totalSucceeded |"
  Write-Output "| Total model failures (attempt-level) | $totalFailed |"
  Write-Output "| Total model failures (provider-level) | $totalModelFailures |"
  Write-Output "| Total validation retries | $totalRetries |"
  Write-Output "| Total validation failures | $totalValidationFails |"
  Write-Output "| Avg attempts per run | $(if ($totalRuns -gt 0) { [math]::Round($totalAttempts / $totalRuns, 1) } else { 'n/a' }) |"
  Write-Output "| Models tried | $(($configuredModels | Where-Object { $_.model -and $_.model -ne 'unknown' }).Count) |"
} finally {
  if (Test-Path -LiteralPath $temporaryConfig) { Remove-Item -LiteralPath $temporaryConfig -Force }
}
