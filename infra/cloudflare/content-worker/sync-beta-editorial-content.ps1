[CmdletBinding()]
param(
  [ValidateSet("Production")]
  [string]$SourceEnvironment = "Production",
  [switch]$ConfirmProductionSource,
  [switch]$ConfirmBetaContentReplace
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmProductionSource) {
  throw "Production is protected. To read public editorial content from production, pass -SourceEnvironment Production -ConfirmProductionSource explicitly."
}

if (-not $ConfirmBetaContentReplace) {
  throw "This operation replaces beta editions and stories. Pass -ConfirmBetaContentReplace explicitly."
}

$config = Get-Content (Join-Path $PSScriptRoot "..\config.json") -Raw | ConvertFrom-Json
$production = $config.environments.production
$beta = $config.environments.beta

if (-not $production.contentDatabaseName -or -not $beta.contentDatabaseName) {
  throw "Both production and beta content database names must be configured."
}

& (Join-Path $PSScriptRoot "..\verify-account.ps1")
$env:CLOUDFLARE_ACCOUNT_ID = $config.accountId

$temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("ai-nuggets-editorial-sync-" + [guid]::NewGuid().ToString("N"))
$exportPath = Join-Path $temporaryDirectory "production-editorial-data.sql"
$importPath = Join-Path $temporaryDirectory "replace-beta-editorial-data.sql"

try {
  New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null

  $productionVisibility = & npx --yes wrangler@latest d1 execute $production.contentDatabaseName --remote --json --command "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published FROM editions;" | ConvertFrom-Json
  $betaVisibility = & npx --yes wrangler@latest d1 execute $beta.contentDatabaseName --remote --json --command "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published FROM editions;" | ConvertFrom-Json
  $productionEditionCounts = $productionVisibility[0].results[0]
  $betaEditionCounts = $betaVisibility[0].results[0]
  if ($productionEditionCounts.total -ne $productionEditionCounts.published) {
    throw "Production contains non-published editions. This public-content sync refuses to export them."
  }
  if ($betaEditionCounts.total -ne $betaEditionCounts.published) {
    throw "Beta contains non-published editions. This public-content sync refuses to replace them."
  }

  Write-Host "Exporting public editorial content from production."
  & npx --yes wrangler@latest d1 export $production.contentDatabaseName --remote --table editions --table stories --no-schema --output $exportPath --skip-confirmation
  if ($LASTEXITCODE -ne 0) {
    throw "Could not export production editorial content."
  }

  Write-Host "Replacing beta public editorial content."
  "DELETE FROM stories;`nDELETE FROM editions;" | Set-Content -LiteralPath $importPath -NoNewline
  Add-Content -LiteralPath $importPath -Value (Get-Content -LiteralPath $exportPath -Raw)
  & npx --yes wrangler@latest d1 execute $beta.contentDatabaseName --remote --file $importPath
  if ($LASTEXITCODE -ne 0) {
    throw "Could not replace beta editorial content with the production public export."
  }

  Write-Host "Verifying beta public editorial table counts."
  $productionCounts = & npx --yes wrangler@latest d1 execute $production.contentDatabaseName --remote --json --command "SELECT (SELECT COUNT(*) FROM editions WHERE status = 'published') AS editions, (SELECT COUNT(*) FROM stories JOIN editions ON editions.id = stories.edition_id WHERE editions.status = 'published') AS stories;" | ConvertFrom-Json
  $betaCounts = & npx --yes wrangler@latest d1 execute $beta.contentDatabaseName --remote --json --command "SELECT (SELECT COUNT(*) FROM editions WHERE status = 'published') AS editions, (SELECT COUNT(*) FROM stories JOIN editions ON editions.id = stories.edition_id WHERE editions.status = 'published') AS stories;" | ConvertFrom-Json
  $productionResult = $productionCounts[0].results[0]
  $betaResult = $betaCounts[0].results[0]
  if ($productionResult.editions -ne $betaResult.editions -or $productionResult.stories -ne $betaResult.stories) {
    throw "Beta public editorial counts do not match production."
  }

  Write-Host "Beta now matches production public editorial table counts: $($betaResult.editions) editions and $($betaResult.stories) stories."
} finally {
  Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
