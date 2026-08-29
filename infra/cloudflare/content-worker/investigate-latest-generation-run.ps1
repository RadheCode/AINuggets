[CmdletBinding()]
param(
  [ValidateSet("Beta", "Production")]
  [string]$Environment = "Beta"
)

$ErrorActionPreference = "Stop"

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

  $latestRunQuery = "SELECT run_id, target_date, status, details, started_at, finished_at FROM generation_runs WHERE run_id IS NOT NULL ORDER BY started_at DESC LIMIT 1;"
  $latestRun = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $latestRunQuery

  if ($latestRun.Count -eq 0) {
    throw "No retained generation run with a run ID exists in $Environment. Generation-run investigations are retained for three days after completion."
  }

  $run = $latestRun[0]
  if ($run.run_id -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
    throw "The latest generation run has an invalid run ID and cannot be queried safely."
  }

  $eventsQuery = "SELECT e.sequence, e.stage, e.event_name, e.outcome, e.duration_ms, e.created_at AS event_created_at, e.metadata_json FROM generation_run_events AS e WHERE e.run_id = '$($run.run_id)' ORDER BY e.sequence ASC;"
  $events = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $eventsQuery

  $runIdCode = [string]::Concat('`', $run.run_id, '`')

  Write-Output "# Latest generation run: $Environment"
  Write-Output ""
  Write-Output "| Field | Value |"
  Write-Output "|---|---|"
  Write-Output "| Run ID | $runIdCode |"
  Write-Output "| Target date | $($run.target_date) |"
  Write-Output "| Status | $($run.status) |"
  Write-Output "| Started | $($run.started_at) |"
  Write-Output "| Finished | $($run.finished_at) |"
  Write-Output "| Result | $($run.details) |"
  Write-Output ""
  Write-Output "## Ordered step timeline"

  if ($events.Count -eq 0) {
    Write-Output ""
    Write-Output "No detailed events were recorded for this run."
    return
  }

  $currentStage = $null
  $stageNumber = 0
  foreach ($event in $events) {
    if ($event.stage -ne $currentStage) {
      $currentStage = $event.stage
      $stageNumber++
      Write-Output ""
      Write-Output "### Step ${stageNumber}: $currentStage"
    }

    $duration = if ($null -eq $event.duration_ms) { "not measured" } else { "$($event.duration_ms) ms" }
    Write-Output ""
    Write-Output "$($event.sequence). **$($event.event_name)** - $($event.outcome)"
    Write-Output "    - Time: $($event.event_created_at)"
    Write-Output "    - Duration: $duration"
    Write-Metadata -MetadataJson $event.metadata_json
  }
} finally {
  if (Test-Path -LiteralPath $temporaryConfig) {
    Remove-Item -LiteralPath $temporaryConfig -Force
  }
}
