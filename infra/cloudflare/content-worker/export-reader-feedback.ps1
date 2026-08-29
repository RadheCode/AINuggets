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
    [object[]]$Rows
  )

  $columns = @("id", "email", "rating", "message", "submitted_at_ist")
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
  $databaseName = $cloudflareConfig.environments.$($Environment.ToLowerInvariant()).contentDatabaseName
  if ([string]::IsNullOrWhiteSpace($databaseName)) {
    throw "No D1 database name is configured for $Environment."
  }

  $feedbackTable = Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'reader_feedback';"
  if ($feedbackTable.Count -eq 0) {
    throw "The $Environment database does not have the reader feedback schema. Apply migration 0009_add_reader_feedback.sql to $Environment before using this skill."
  }

  $feedbackQuery = "SELECT id, email, rating_halves / 2.0 AS rating, message, datetime(created_at, '+5 hours', '+30 minutes') || ' IST' AS submitted_at_ist FROM reader_feedback ORDER BY created_at DESC, id DESC;"
  [object[]]$feedback = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $feedbackQuery)

  Write-Output "# Reader feedback: $Environment"
  Write-Output ""
  Write-Output "This private operator report contains reader contact data and free-text feedback. Handle it only through approved channels."
  Write-Output ""
  Write-Output '```sql'
  Write-Output $feedbackQuery
  Write-Output '```'
  Write-Output ""
  Write-Output "## All feedback ($($feedback.Count))"
  Write-Output ""
  Write-SqlResultTable -Rows $feedback
} finally {
  if (Test-Path -LiteralPath $temporaryConfig) {
    Remove-Item -LiteralPath $temporaryConfig -Force
  }
}
