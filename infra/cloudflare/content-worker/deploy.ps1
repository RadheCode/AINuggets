$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "..\verify-account.ps1")
$config = Get-Content (Join-Path $PSScriptRoot "..\config.json") -Raw | ConvertFrom-Json
$env:CLOUDFLARE_ACCOUNT_ID = $config.accountId
$workerConfig = Join-Path $PSScriptRoot "wrangler.jsonc"
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
if ($workerConfigContent -match "__CONTENT_ENGINE_CRON__") {
  throw "Could not render the content-engine Cron trigger."
}
$generatedWorkerConfig = Join-Path $PSScriptRoot "wrangler.generated.jsonc"
$workerConfigContent | Set-Content -LiteralPath $generatedWorkerConfig -NoNewline

try {
  & npx --yes wrangler@latest d1 migrations apply ai-nuggets-content --remote --config $generatedWorkerConfig
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
