[CmdletBinding()]
param(
  [ValidateSet("Beta", "Production")]
  [string]$Environment = "Beta",
  [switch]$ConfirmProduction
)

$ErrorActionPreference = "Stop"

$config = Get-Content (Join-Path $PSScriptRoot "..\config.json") -Raw | ConvertFrom-Json
$environmentKey = $Environment.ToLowerInvariant()

if ($environmentKey -eq "production" -and -not $ConfirmProduction) {
  throw "Production is protected. To deploy the production content Worker, pass -Environment Production -ConfirmProduction explicitly."
}

$deployment = $config.environments.$environmentKey
if ($null -eq $deployment) {
  throw "No Cloudflare configuration exists for '$Environment'."
}

if (-not $deployment.contentDatabaseId) {
  throw "The $Environment D1 database has not been provisioned. Create '$($deployment.contentDatabaseName)' and set environments.$environmentKey.contentDatabaseId in infra/cloudflare/config.json before deployment."
}

& (Join-Path $PSScriptRoot "..\verify-account.ps1")
$env:CLOUDFLARE_ACCOUNT_ID = $config.accountId
$generatedWorkerConfig = Join-Path $PSScriptRoot "wrangler.deploy.generated.jsonc"
& (Join-Path $PSScriptRoot "render-worker-config.ps1") -Environment $Environment -OutputPath $generatedWorkerConfig | Out-Null

try {
  Write-Host "Deploying content Worker and D1 migrations to $Environment."
  & npx --yes wrangler@latest d1 migrations apply $deployment.contentDatabaseName --remote --config $generatedWorkerConfig
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare D1 migration failed."
  }

  & npx --yes wrangler@latest deploy --config $generatedWorkerConfig
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare content Worker deployment failed."
  }
} finally {
  Remove-Item -LiteralPath $generatedWorkerConfig -ErrorAction SilentlyContinue
}
