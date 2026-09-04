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

function Write-PeriodTable {
  param([object[]]$Rows)
  $columns = @("period", "period_start_ist", "period_end_ist", "runs", "succeeded", "failed", "skipped", "success_rate")
  Write-Output ("| " + ($columns -join " | ") + " |")
  Write-Output ("| " + (($columns | ForEach-Object { "---" }) -join " | ") + " |")
  foreach ($row in $Rows) {
    Write-Output ("| " + (($columns | ForEach-Object { [string]$row.$_ }) -join " | ") + " |")
  }
}

function Write-LatestTable {
  param([object[]]$Rows)
  $columns = @("period", "latest_run_target_date", "latest_run_status", "latest_run_details", "latest_run_started_ist", "latest_run_finished_ist")
  Write-Output ("| " + ($columns -join " | ") + " |")
  Write-Output ("| " + (($columns | ForEach-Object { "---" }) -join " | ") + " |")
  foreach ($row in $Rows) {
    Write-Output ("| " + (($columns | ForEach-Object { [string]$row.$_ }) -join " | ") + " |")
  }
}

$temporaryConfig = [System.IO.Path]::GetTempFileName()
try {
  & (Join-Path $PSScriptRoot "render-worker-config.ps1") -Environment $Environment -OutputPath $temporaryConfig | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not render the $Environment Worker configuration." }
  $cloudflareConfig = Get-Content (Join-Path $PSScriptRoot "..\config.json") -Raw | ConvertFrom-Json
  $databaseName = $cloudflareConfig.environments.$($Environment.ToLowerInvariant()).contentDatabaseName
  if ([string]::IsNullOrWhiteSpace($databaseName)) { throw "No D1 database name is configured for $Environment." }

  $runColumns = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query "SELECT name FROM pragma_table_info('generation_runs') WHERE name = 'run_id';"
  if ($runColumns.Count -eq 0) { throw "The $Environment database does not have the generation-run timeline schema. Apply migration 0011_add_generation_run_events.sql to $Environment before running this report." }

  # Per IST period (Day/Week/Month): run counts by outcome for retained runs with a UUID.
  $periodQuery = @'
WITH current_ist AS (
  SELECT datetime('now', '+5 hours', '+30 minutes') AS value
), periods AS (
  SELECT 'Day' AS period, date(value) AS start_date, date(value, '+1 day') AS end_date FROM current_ist
  UNION ALL SELECT 'Week', date(value, '-' || ((CAST(strftime('%w', value) AS INTEGER) + 6) % 7) || ' days'), date(value, '-' || ((CAST(strftime('%w', value) AS INTEGER) + 6) % 7) || ' days', '+7 days') FROM current_ist
  UNION ALL SELECT 'Month', strftime('%Y-%m-01', value), date(strftime('%Y-%m-01', value), '+1 month') FROM current_ist
)
SELECT p.period, p.start_date || ' 12:00 AM IST' AS period_start_ist, p.end_date || ' 12:00 AM IST (exclusive)' AS period_end_ist,
       COUNT(r.run_id) AS runs,
       COALESCE(SUM(CASE WHEN r.status = 'succeeded' THEN 1 ELSE 0 END), 0) AS succeeded,
       COALESCE(SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
       COALESCE(SUM(CASE WHEN r.status = 'skipped' THEN 1 ELSE 0 END), 0) AS skipped,
       CASE WHEN COUNT(r.run_id) = 0 THEN 'n/a'
            ELSE CAST(ROUND(100.0 * COALESCE(SUM(CASE WHEN r.status = 'succeeded' THEN 1 ELSE 0 END), 0) / COUNT(r.run_id), 0) AS INTEGER) || '%'
       END AS success_rate
FROM periods AS p
LEFT JOIN generation_runs AS r
  ON r.started_at >= datetime(p.start_date, '-5 hours', '-30 minutes')
 AND r.started_at < datetime(p.end_date, '-5 hours', '-30 minutes')
 AND r.run_id IS NOT NULL
GROUP BY p.period, p.start_date, p.end_date
ORDER BY CASE p.period WHEN 'Day' THEN 1 WHEN 'Week' THEN 2 ELSE 3 END;
'@
  [object[]]$periods = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $periodQuery)

  # Latest retained run per IST period (status + failure reason from details).
  $latestQuery = @'
WITH current_ist AS (
  SELECT datetime('now', '+5 hours', '+30 minutes') AS value
), periods AS (
  SELECT 'Day' AS period, date(value) AS start_date, date(value, '+1 day') AS end_date FROM current_ist
  UNION ALL SELECT 'Week', date(value, '-' || ((CAST(strftime('%w', value) AS INTEGER) + 6) % 7) || ' days'), date(value, '-' || ((CAST(strftime('%w', value) AS INTEGER) + 6) % 7) || ' days', '+7 days') FROM current_ist
  UNION ALL SELECT 'Month', strftime('%Y-%m-01', value), date(strftime('%Y-%m-01', value), '+1 month') FROM current_ist
), latest AS (
  SELECT p.period, r.target_date AS latest_run_target_date, r.status AS latest_run_status,
         r.details AS latest_run_details,
         datetime(r.started_at, '+5 hours', '+30 minutes') || ' IST' AS latest_run_started_ist,
         datetime(r.finished_at, '+5 hours', '+30 minutes') || ' IST' AS latest_run_finished_ist,
         ROW_NUMBER() OVER (PARTITION BY p.period ORDER BY r.started_at DESC) AS rn
  FROM periods AS p
  JOIN generation_runs AS r
    ON r.started_at >= datetime(p.start_date, '-5 hours', '-30 minutes')
   AND r.started_at < datetime(p.end_date, '-5 hours', '-30 minutes')
   AND r.run_id IS NOT NULL
)
SELECT period, latest_run_target_date, latest_run_status, latest_run_details, latest_run_started_ist, latest_run_finished_ist
FROM latest WHERE rn = 1
ORDER BY CASE period WHEN 'Day' THEN 1 WHEN 'Week' THEN 2 ELSE 3 END;
'@
  [object[]]$latest = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $latestQuery)

  Write-Output "# Generation-run analytics: $Environment"
  Write-Output ""
  Write-Output "Periods use India Standard Time (IST, UTC+05:30). A week begins Monday; period ends are exclusive. Counts include only retained generation runs (retention is three days)."
  Write-Output ""
  Write-Output "## Runs by period"
  Write-Output ""
  Write-PeriodTable -Rows $periods
  Write-Output ""
  Write-Output "## Latest retained run by period"
  Write-Output ""
  if ($latest.Count -eq 0) {
    Write-Output "No retained generation runs were recorded in these periods (the generation-run timeline retains only runs with a run ID, for three days)."
  } else {
    Write-LatestTable -Rows $latest
  }
} finally {
  if (Test-Path -LiteralPath $temporaryConfig) { Remove-Item -LiteralPath $temporaryConfig -Force }
}
