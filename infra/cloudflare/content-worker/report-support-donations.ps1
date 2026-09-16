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
    [AllowEmptyCollection()]
    [object[]]$Rows,
    [Parameter(Mandatory)]
    [string[]]$Columns
  )

  Write-Output ("| " + ($Columns -join " | ") + " |")
  Write-Output ("| " + (($Columns | ForEach-Object { "---" }) -join " | ") + " |")
  foreach ($row in $Rows) {
    $cells = $Columns | ForEach-Object { ConvertTo-MarkdownTableCell -Value $row.$_ }
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
  $databaseName = $cloudflareConfig.environments.$($Environment.ToLowerInvariant()).contentDatabaseName
  if ([string]::IsNullOrWhiteSpace($databaseName)) {
    throw "No D1 database name is configured for $Environment."
  }

  $supportEventsTable = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'support_events';"
  $donationsTable = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'donations';"
  if ($supportEventsTable.Count -eq 0 -or $donationsTable.Count -eq 0) {
    throw "The $Environment database does not have the support donation schema. Apply migration 0017_add_support_donations.sql to $Environment before using this report."
  }

  $eventsQuery = "SELECT event_type, provider_id, COUNT(*) AS event_count, COUNT(DISTINCT visitor_hash) AS unique_visitors FROM support_events GROUP BY event_type, provider_id ORDER BY event_type ASC, provider_id ASC;"
  [object[]]$events = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $eventsQuery)

  $donationsQuery = "SELECT id, email, amount, provider_id, donation_type, country_name || ' (' || country_code || ')' AS country, datetime(created_at, '+5 hours', '+30 minutes') || ' IST' AS recorded_at_ist FROM donations ORDER BY created_at DESC, id DESC;"
  [object[]]$donations = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $donationsQuery)

  Write-Output "# Support donations: $Environment"
  Write-Output ""
  Write-Output "This private operator report contains reader contact data (donation emails). Handle it only through approved channels. Timestamps are India Standard Time (IST, UTC+05:30)."
  Write-Output ""
  Write-Output "## Support engagement"
  Write-Output ""
  Write-Output "Support events record when a reader opened the support dialog (support_open) or clicked a provider checkout option (support_option_click). They are privacy-minimal: only a one-way visitor hash, provider, and edge country are stored; raw events expire after 90 days."
  Write-Output ""
  Write-SqlResultTable -Rows $events -Columns @("event_type", "provider_id", "event_count", "unique_visitors")
  Write-Output ""
  Write-Output "## All donations ($($donations.Count))"
  Write-Output ""
  if ($donations.Count -eq 0) {
    Write-Output "No donations have been recorded in this environment."
  } else {
    Write-SqlResultTable -Rows $donations -Columns @("id", "email", "amount", "provider_id", "donation_type", "country", "recorded_at_ist")
  }
} finally {
  if (Test-Path -LiteralPath $temporaryConfig) {
    Remove-Item -LiteralPath $temporaryConfig -Force
  }
}