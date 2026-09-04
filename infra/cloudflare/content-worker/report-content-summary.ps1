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
  param([string]$DatabaseName, [string]$WorkerConfig, [string]$Query)
  $singleLineQuery = (($Query -replace "[\r\n]+", " ") -replace "\s{2,}", " ").Trim()
  $output = & npx --yes wrangler@latest d1 execute $DatabaseName --remote --config $WorkerConfig --json --command $singleLineQuery 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) { throw "The D1 read-only query failed: $output" }
  $response = $output | ConvertFrom-Json
  if (-not $response[0].success) { throw "D1 did not report a successful query." }
  return @($response[0].results)
}

function ConvertTo-MarkdownTableCell {
  param($Value)
  if ($null -eq $Value) { return "NULL" }
  return ([string]$Value).Replace("|", "\\|").Replace("`r", " ").Replace("`n", "<br>")
}

function Write-SqlResultTable {
  param([Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Rows, [string[]]$Columns)
  if (-not $Columns -and $Rows.Count -gt 0) { $Columns = $Rows[0].PSObject.Properties.Name }
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
  if ($LASTEXITCODE -ne 0) { throw "Could not render the $Environment Worker configuration." }

  $cloudflareConfig = Get-Content (Join-Path $PSScriptRoot "..\config.json") -Raw | ConvertFrom-Json
  $databaseName = $cloudflareConfig.environments.$($Environment.ToLowerInvariant()).contentDatabaseName
  if ([string]::IsNullOrWhiteSpace($databaseName)) { throw "No D1 database name is configured for $Environment." }

  # --- Published editions ---
  $editionsQuery = "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published, SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts, MIN(edition_date) AS earliest, MAX(edition_date) AS latest FROM editions;"
  [object[]]$editions = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $editionsQuery)
  $e = $editions[0]

  Write-Output "# Content summary: $Environment"
  Write-Output ""
  Write-Output "Periods use India Standard Time (IST, UTC+05:30)."
  Write-Output ""

  Write-Output "## Editions overview"
  Write-Output ""
  Write-SqlResultTable -Rows $editions -Columns @("total", "published", "drafts", "earliest", "latest")
  Write-Output ""

  # --- Stories by category ---
  $storiesByCategoryQuery = "SELECT s.category, COUNT(*) AS stories, COUNT(DISTINCT e.edition_date) AS editions_covered FROM stories s JOIN editions e ON s.edition_id = e.id WHERE e.status = 'published' GROUP BY s.category ORDER BY stories DESC;"
  [object[]]$storiesByCategory = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $storiesByCategoryQuery)

  Write-Output "## Stories by category (published editions)"
  Write-Output ""
  Write-SqlResultTable -Rows $storiesByCategory -Columns @("category", "stories", "editions_covered")
  Write-Output ""

  # --- Total published stories ---
  $totalStoriesQuery = "SELECT COUNT(*) AS total_published_stories FROM stories s JOIN editions e ON s.edition_id = e.id WHERE e.status = 'published';"
  [object[]]$totalStories = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $totalStoriesQuery)

  Write-Output "## Total published stories: $($totalStories[0].total_published_stories)"
  Write-Output ""

  # --- Recent editions (last 7 days) ---
  $recentEditionsQuery = "SELECT e.edition_date, e.status, (SELECT COUNT(*) FROM stories s WHERE s.edition_id = e.id) AS story_count FROM editions e WHERE e.edition_date >= date('now', '-7 days') ORDER BY e.edition_date DESC;"
  [object[]]$recentEditions = @(Invoke-D1ReadQuery -DatabaseName $databaseName -WorkerConfig $temporaryConfig -Query $recentEditionsQuery)

  Write-Output "## Recent editions (last 7 days)"
  Write-Output ""
  if ($recentEditions.Count -eq 0) {
    Write-Output "No editions found in the last 7 days."
  } else {
    Write-SqlResultTable -Rows $recentEditions -Columns @("edition_date", "status", "story_count")
  }
  Write-Output ""

} finally {
  if (Test-Path -LiteralPath $temporaryConfig) { Remove-Item -LiteralPath $temporaryConfig -Force }
}
