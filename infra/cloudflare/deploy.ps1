$ErrorActionPreference = "Stop"

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$configPath = Join-Path $PSScriptRoot "config.json"
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$outputDirectory = Resolve-Path (Join-Path $repositoryRoot $config.outputDirectory)

& (Join-Path $PSScriptRoot "verify-account.ps1")
$env:CLOUDFLARE_ACCOUNT_ID = $config.accountId

Push-Location $repositoryRoot
try {
  & npx --yes wrangler@latest pages deploy $outputDirectory --project-name $config.projectName
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare Pages deployment failed."
  }
} finally {
  Pop-Location
}
