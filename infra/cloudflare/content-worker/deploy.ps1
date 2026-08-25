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
$workerConfigName = if ($environmentKey -eq "production") { "wrangler.production.jsonc" } else { "wrangler.jsonc" }
$workerConfig = Join-Path $PSScriptRoot $workerConfigName
$contentEngineConfig = Join-Path $PSScriptRoot "..\..\..\content-engine\content-engine.config.mjs"
$contentEngineValidator = Join-Path $PSScriptRoot "..\..\..\content-engine\validate-content-engine-config.mjs"
$contentEngineConfigUri = ([uri]$contentEngineConfig).AbsoluteUri
$contentEngineValidatorUri = ([uri]$contentEngineValidator).AbsoluteUri
$schedule = & node --input-type=module --eval "import { CONTENT_ENGINE_CONFIG } from '$contentEngineConfigUri'; import { validateContentEngineConfig } from '$contentEngineValidatorUri'; validateContentEngineConfig(CONTENT_ENGINE_CONFIG); console.log(JSON.stringify(CONTENT_ENGINE_CONFIG.schedule));"
if ($LASTEXITCODE -ne 0) {
  throw "Could not read content-engine/content-engine.config.mjs."
}
$schedule = $schedule | ConvertFrom-Json

# Wrangler Cron schedules are UTC. Generate the deployment configuration from the
# human-readable content-engine source of truth without storing a second schedule.
$workerConfigContent = Get-Content $workerConfig -Raw
$workerConfigContent = $workerConfigContent.Replace("__CONTENT_ENGINE_CRON__", $schedule.cron)
$workerConfigContent = $workerConfigContent.Replace("__CONTENT_DATABASE_ID__", $deployment.contentDatabaseId)
if ($workerConfigContent -match "__(CONTENT_ENGINE_CRON|CONTENT_DATABASE_ID)__") {
  throw "Could not render the $Environment content Worker configuration."
}
$generatedWorkerConfig = Join-Path $PSScriptRoot "wrangler.generated.jsonc"
$workerConfigContent | Set-Content -LiteralPath $generatedWorkerConfig -NoNewline

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
