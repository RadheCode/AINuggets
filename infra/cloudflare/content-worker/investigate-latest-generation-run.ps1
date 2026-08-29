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
  if ([string]::IsNullOrWhiteSpace($outputDirectory)) {
    throw "OutputPath must include a destination directory."
  }
  if (-not (Test-Path -LiteralPath $outputDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
  }
  if (Test-Path -LiteralPath $resolvedOutputPath -PathType Leaf) {
    throw "The Markdown report already exists: $resolvedOutputPath. Choose a new OutputPath to avoid overwriting it."
  }

  $report = @(& $PSCommandPath -Environment $Environment)
  [System.IO.File]::WriteAllLines(
    $resolvedOutputPath,
    [string[]]$report,
    [System.Text.UTF8Encoding]::new($false)
  )
  $report | Write-Output
  Write-Output ""
  Write-Output "Offline Markdown report saved: $resolvedOutputPath"
  return
}

function Invoke-D1ReadQuery {
  param(
    [Parameter(Mandatory)]
    [string]$DatabaseName,
    [Parameter(Mandatory)]
    [string]$WorkerConfig,
    [Parameter(Mandatory)]
    [string]$Query
  )

  $output = & npx --yes wrangler@latest d1 execute $DatabaseName --remote --config $WorkerConfig --json --command $Query 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    throw "The D1 read-only query failed: $output"
  }

  $response = $output | ConvertFrom-Json
  if (-not $response[0].success) {
    throw "D1 did not report a successful query."
  }

  return @($response[0].results)
}

function Write-Metadata {
  param([string]$MetadataJson)

  if ([string]::IsNullOrWhiteSpace($MetadataJson)) {
    Write-Output '    - Details: {}'
    return
  }

  $metadata = $MetadataJson | ConvertFrom-Json
  $formattedMetadata = $metadata | ConvertTo-Json -Depth 20
  Write-Output "    - Details:"
  Write-Output '```json'
  $formattedMetadata | ForEach-Object { Write-Output $_ }
  Write-Output '```'
}

function ConvertTo-MarkdownTableCell {
  param($Value)

  if ($null -eq $Value) {
    return "NULL"
  }

  return ([string]$Value).Replace("|", "\\|").Replace("`r", " ").Replace("`n", "<br>")
}

function Write-SqlResultTable {
  param(
    [Parameter(Mandatory)]
    [object[]]$Rows
  )

  $columns = @(
    "sequence",
    "stage",
    "event_name",
    "metadata_json",
    "run_id",
    "target_date",
    "run_status",
    "run_details",
    "started_at_ist",
    "finished_at_ist",
    "outcome",
    "duration_ms",
    "event_created_at_ist"
  )

  Write-Output ("| " + ($columns -join " | ") + " |")
  Write-Output ("| " + (($columns | ForEach-Object { "---" }) -join " | ") + " |")
  foreach ($row in $Rows) {
    $cells = $columns | ForEach-Object { ConvertTo-MarkdownTableCell -Value $row.$_ }
    Write-Output ("| " + ($cells -join " | ") + " |")
  }
}

$temporaryConfig = [System.IO.Path]::GetTempFileName()

try {
  & (Join-Path $PSScriptRoot "render-worker-config.ps1") -Environment $Environment -OutputPath $temporaryConfig | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Could not render the $Environment Worker configuration."
  }

  $cloudflareConfig = Get-Content (Join-Path $PSScriptRoot "..\config.json") -Raw | ConvertFrom-Json
  $environmentKey = $Environment.ToLowerInvariant()
  $databaseName = $cloudflareConfig.environments.$environmentKey.contentDatabaseName
  if ([string]::IsNullOrWhiteSpace($databaseName)) {
    throw "No D1 database name is configured for $Environment."
  }

  $runColumns = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query "PRAGMA table_info(generation_runs);"
  if (-not ($runColumns.name -contains "run_id")) {
    throw "The $Environment database does not have the generation-run timeline schema. Apply migration 0011_add_generation_run_events.sql to $Environment before using this skill."
  }
  $eventTable = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'generation_run_events';"
  if ($eventTable.Count -eq 0) {
    throw "The $Environment database does not have the generation-run events table. Apply migration 0011_add_generation_run_events.sql to $Environment before using this skill."
  }

  $latestRunQuery = "SELECT run_id, target_date, status, details, datetime(started_at, '+5 hours', '+30 minutes') || ' IST' AS started_at_ist, datetime(finished_at, '+5 hours', '+30 minutes') || ' IST' AS finished_at_ist FROM generation_runs WHERE run_id IS NOT NULL ORDER BY started_at DESC LIMIT 1;"
  $latestRun = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $latestRunQuery

  if ($latestRun.Count -eq 0) {
    throw "No retained generation run with a run ID exists in $Environment. Generation-run investigations are retained for three days after completion."
  }

  $run = $latestRun[0]
  if ($run.run_id -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
    throw "The latest generation run has an invalid run ID and cannot be queried safely."
  }

  # Keep the investigator output identical to the documented unified timeline query.
  $timelineQuery = "SELECT e.sequence, e.stage, e.event_name, e.metadata_json, r.run_id, r.target_date, r.status AS run_status, r.details AS run_details, datetime(r.started_at, '+5 hours', '+30 minutes') || ' IST' AS started_at_ist, datetime(r.finished_at, '+5 hours', '+30 minutes') || ' IST' AS finished_at_ist, e.outcome, e.duration_ms, datetime(e.created_at, '+5 hours', '+30 minutes') || ' IST' AS event_created_at_ist FROM generation_runs AS r LEFT JOIN generation_run_events AS e ON e.run_id = r.run_id WHERE r.run_id = '$($run.run_id)' ORDER BY e.sequence ASC;"
  $timeline = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $timelineQuery

  $runIdCode = [string]::Concat('`', $run.run_id, '`')

  Write-Output "# Latest generation run: $Environment"
  Write-Output ""
  Write-Output "The following is the exact result of the unified SQL query shown below; it is not a separately assembled summary."
  Write-Output ""
  Write-Output '```sql'
  Write-Output $timelineQuery
  Write-Output '```'
  Write-Output ""
  Write-Output "## Exact unified query result (SQL table)"
  Write-Output ""
  Write-SqlResultTable -Rows $timeline
  Write-Output ""
  Write-Output "| Field | Value |"
  Write-Output "|---|---|"
  Write-Output "| Run ID | $runIdCode |"
  Write-Output "| Target date | $($run.target_date) |"
  Write-Output "| Status | $($run.status) |"
  Write-Output "| Started (IST) | $($run.started_at_ist) |"
  Write-Output "| Finished (IST) | $($run.finished_at_ist) |"
  Write-Output "| Result | $($run.details) |"
  Write-Output ""
  Write-Output "## Ordered step timeline"

  if ($timeline.Count -eq 0 -or $null -eq $timeline[0].sequence) {
    Write-Output ""
    Write-Output "No detailed events were recorded for this run."
    return
  }

  $currentStage = $null
  $stageNumber = 0
  foreach ($event in $timeline) {
    if ($event.stage -ne $currentStage) {
      $currentStage = $event.stage
      $stageNumber++
      Write-Output ""
      Write-Output "### Step ${stageNumber}: $currentStage"
    }

    $duration = if ($null -eq $event.duration_ms) { "not measured" } else { "$($event.duration_ms) ms" }
    Write-Output ""
    Write-Output "$($event.sequence). **$($event.event_name)** - $($event.outcome)"
    Write-Output "    - Time (IST): $($event.event_created_at_ist)"
    Write-Output "    - Duration: $duration"
    Write-Metadata -MetadataJson $event.metadata_json
  }
} finally {
  if (Test-Path -LiteralPath $temporaryConfig) {
    Remove-Item -LiteralPath $temporaryConfig -Force
  }
}
