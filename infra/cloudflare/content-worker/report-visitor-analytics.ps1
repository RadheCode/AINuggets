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

function Write-AnalyticsTable {
  param([object[]]$Rows)
  $columns = @("period", "period_start_ist", "period_end_ist", "unique_visitors", "unique_countries", "page_visits")
  Write-Output ("| " + ($columns -join " | ") + " |")
  Write-Output ("| " + (($columns | ForEach-Object { "---" }) -join " | ") + " |")
  foreach ($row in $Rows) {
    Write-Output ("| " + (($columns | ForEach-Object { [string]$row.$_ }) -join " | ") + " |")
  }
}

function Write-CountryTable {
  param([object[]]$Rows)
  $columns = @("period", "country", "page_visits", "unique_visitors")
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

  $analyticsTable = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'visitor_visits';"
  if ($analyticsTable.Count -eq 0) { throw "The $Environment database does not have the visitor analytics schema. Apply migration 0012_add_visitor_analytics.sql to $Environment before running this report." }

  $analyticsQuery = @'
WITH current_ist AS (
  SELECT datetime('now', '+5 hours', '+30 minutes') AS value
), periods AS (
  SELECT 'Day' AS period, date(value) AS start_date, date(value, '+1 day') AS end_date FROM current_ist
  UNION ALL SELECT 'Week', date(value, '-' || ((CAST(strftime('%w', value) AS INTEGER) + 6) % 7) || ' days'), date(value, '-' || ((CAST(strftime('%w', value) AS INTEGER) + 6) % 7) || ' days', '+7 days') FROM current_ist
  UNION ALL SELECT 'Month', strftime('%Y-%m-01', value), date(strftime('%Y-%m-01', value), '+1 month') FROM current_ist
)
SELECT p.period, p.start_date || ' 12:00 AM IST' AS period_start_ist, p.end_date || ' 12:00 AM IST (exclusive)' AS period_end_ist,
       COUNT(DISTINCT v.visitor_hash) AS unique_visitors,
       COUNT(DISTINCT CASE WHEN v.country_code <> 'unknown' THEN v.country_code END) AS unique_countries,
       COUNT(v.event_id) AS page_visits
FROM periods AS p
LEFT JOIN visitor_visits AS v ON v.occurred_at >= datetime(p.start_date, '-5 hours', '-30 minutes') AND v.occurred_at < datetime(p.end_date, '-5 hours', '-30 minutes')
GROUP BY p.period, p.start_date, p.end_date
ORDER BY CASE p.period WHEN 'Day' THEN 1 WHEN 'Week' THEN 2 ELSE 3 END;
'@
  [object[]]$analytics = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $analyticsQuery)
  $countryQuery = @'
WITH current_ist AS (
  SELECT datetime('now', '+5 hours', '+30 minutes') AS value
), periods AS (
  SELECT 'Day' AS period, date(value) AS start_date, date(value, '+1 day') AS end_date FROM current_ist
  UNION ALL SELECT 'Week', date(value, '-' || ((CAST(strftime('%w', value) AS INTEGER) + 6) % 7) || ' days'), date(value, '-' || ((CAST(strftime('%w', value) AS INTEGER) + 6) % 7) || ' days', '+7 days') FROM current_ist
  UNION ALL SELECT 'Month', strftime('%Y-%m-01', value), date(strftime('%Y-%m-01', value), '+1 month') FROM current_ist
)
SELECT p.period, v.country_name || ' (' || v.country_code || ')' AS country,
       COUNT(v.event_id) AS page_visits, COUNT(DISTINCT v.visitor_hash) AS unique_visitors
FROM periods AS p
JOIN visitor_visits AS v ON v.occurred_at >= datetime(p.start_date, '-5 hours', '-30 minutes') AND v.occurred_at < datetime(p.end_date, '-5 hours', '-30 minutes')
WHERE v.country_code <> 'unknown'
GROUP BY p.period, v.country_code, v.country_name
ORDER BY CASE p.period WHEN 'Day' THEN 1 WHEN 'Week' THEN 2 ELSE 3 END, page_visits DESC, country ASC;
'@
  [object[]]$countries = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $countryQuery)
  Write-Output "# Visitor analytics: $Environment"
  Write-Output ""
  Write-Output "Counts use India Standard Time (IST, UTC+05:30). A week begins Monday; period ends are exclusive. Country totals exclude visits whose edge country was unavailable."
  Write-Output ""
  Write-Output "## Current periods"
  Write-Output ""
  Write-AnalyticsTable -Rows $analytics
  Write-Output ""
  Write-Output "## Country breakdown"
  Write-Output ""
  if ($countries.Count -eq 0) {
    Write-Output "No country-resolved visits were recorded in these periods."
  } else {
    Write-CountryTable -Rows $countries
  }
} finally {
  if (Test-Path -LiteralPath $temporaryConfig) { Remove-Item -LiteralPath $temporaryConfig -Force }
}
