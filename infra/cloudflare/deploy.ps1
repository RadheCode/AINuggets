[CmdletBinding()]
param(
  [ValidateSet("Beta", "Production")]
  [string]$Environment = "Beta",
  [switch]$ConfirmProduction
)

$ErrorActionPreference = "Stop"

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$configPath = Join-Path $PSScriptRoot "config.json"
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$environmentKey = $Environment.ToLowerInvariant()

if ($environmentKey -eq "production" -and -not $ConfirmProduction) {
  throw "Production is protected. To deploy https://ai-nuggets.pages.dev, pass -Environment Production -ConfirmProduction explicitly."
}

$deployment = $config.environments.$environmentKey
if ($null -eq $deployment) {
  throw "No Cloudflare configuration exists for '$Environment'."
}

$outputDirectory = Resolve-Path (Join-Path $repositoryRoot $config.outputDirectory)

& (Join-Path $PSScriptRoot "verify-account.ps1")
$env:CLOUDFLARE_ACCOUNT_ID = $config.accountId

Push-Location $repositoryRoot
try {
  Write-Host "Deploying Pages to $($deployment.pagesUrl)."
  & npx --yes wrangler@latest pages deploy $outputDirectory --project-name $deployment.pagesProjectName
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare Pages deployment failed."
  }
} finally {
  Pop-Location
}
