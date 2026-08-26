[CmdletBinding()]
param(
  [ValidateSet("Beta", "Production")]
  [string]$Environment = "Beta",
  [Parameter(Mandatory)]
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

$environmentKey = $Environment.ToLowerInvariant()
$cloudflareRoot = Join-Path $PSScriptRoot ".."
$repositoryRoot = Join-Path $PSScriptRoot "..\..\.."
$config = Get-Content (Join-Path $cloudflareRoot "config.json") -Raw | ConvertFrom-Json
$deployment = $config.environments.$environmentKey

if ($null -eq $deployment) {
  throw "No Cloudflare configuration exists for '$Environment'."
}

if (-not $deployment.contentDatabaseId) {
  throw "The $Environment D1 database has not been provisioned. Create '$($deployment.contentDatabaseName)' and set environments.$environmentKey.contentDatabaseId in infra/cloudflare/config.json before rendering the Worker configuration."
}

$workerConfigName = if ($environmentKey -eq "production") { "wrangler.production.jsonc" } else { "wrangler.jsonc" }
$workerConfig = Join-Path $PSScriptRoot $workerConfigName
$contentEngineConfig = Join-Path $repositoryRoot "content-engine\content-engine.config.mjs"
$contentEngineValidator = Join-Path $repositoryRoot "content-engine\validate-content-engine-config.mjs"
$productConfig = Join-Path $repositoryRoot "product\config.js"
$contentEngineConfigUri = ([uri]$contentEngineConfig).AbsoluteUri
$contentEngineValidatorUri = ([uri]$contentEngineValidator).AbsoluteUri
$productConfigUri = ([uri]$productConfig).AbsoluteUri

$schedule = & node --input-type=module --eval "import { CONTENT_ENGINE_CONFIG } from '$contentEngineConfigUri'; import { validateContentEngineConfig } from '$contentEngineValidatorUri'; validateContentEngineConfig(CONTENT_ENGINE_CONFIG); console.log(JSON.stringify(CONTENT_ENGINE_CONFIG.schedule));"
if ($LASTEXITCODE -ne 0) {
  throw "Could not read content-engine/content-engine.config.mjs."
}
$schedule = $schedule | ConvertFrom-Json

$googleClientId = & node --input-type=module --eval "globalThis.window = globalThis; await import('$productConfigUri'); const clientId = window.ProductConfig?.authentication?.googleClientId; if (typeof clientId !== 'string' || !clientId.trim()) throw new Error('product/config.js must define authentication.googleClientId.'); console.log(clientId);"
if ($LASTEXITCODE -ne 0) {
  throw "Could not read product/config.js authentication.googleClientId."
}

$allowedOrigins = "$($deployment.pagesUrl),http://localhost:8080,http://127.0.0.1:8080"
$replacements = @{
  "__CONTENT_WORKER_NAME__" = $deployment.contentWorkerName
  "__CONTENT_DATABASE_NAME__" = $deployment.contentDatabaseName
  "__CONTENT_DATABASE_ID__" = $deployment.contentDatabaseId
  "__CONTENT_ENGINE_CRON__" = $schedule.cron
  "__ALLOWED_ORIGINS__" = $allowedOrigins
  "__GOOGLE_CLIENT_ID__" = $googleClientId.Trim()
}

$workerConfigContent = Get-Content $workerConfig -Raw
foreach ($placeholder in $replacements.Keys) {
  $workerConfigContent = $workerConfigContent.Replace($placeholder, $replacements[$placeholder])
}

if ($workerConfigContent -match "__[A-Z0-9_]+__") {
  throw "Could not render the $Environment content Worker configuration because a placeholder remains."
}

$resolvedOutputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputPath)
$workerConfigContent | Set-Content -LiteralPath $resolvedOutputPath -NoNewline
Write-Output $resolvedOutputPath
