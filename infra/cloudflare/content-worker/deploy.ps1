$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "..\verify-account.ps1")
$config = Get-Content (Join-Path $PSScriptRoot "..\config.json") -Raw | ConvertFrom-Json
$env:CLOUDFLARE_ACCOUNT_ID = $config.accountId
$workerConfig = Join-Path $PSScriptRoot "wrangler.jsonc"

& npx --yes wrangler@latest d1 migrations apply ai-nuggets-content --remote --config $workerConfig
if ($LASTEXITCODE -ne 0) {
  throw "Cloudflare D1 migration failed."
}

& npx --yes wrangler@latest deploy --config $workerConfig
if ($LASTEXITCODE -ne 0) {
  throw "Cloudflare content Worker deployment failed."
}
