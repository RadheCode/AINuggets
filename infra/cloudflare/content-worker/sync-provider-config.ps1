[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "..\..\..\content-engine\automation\config\providers.local.env"),
  [ValidateSet("Beta", "Production")]
  [string]$Environment = "Beta",
  [switch]$ConfirmProduction
)

$ErrorActionPreference = "Stop"

if ($Environment -eq "Production" -and -not $ConfirmProduction) {
  throw "Production is protected. To sync production Worker secrets, pass -Environment Production -ConfirmProduction explicitly."
}

$workerConfigName = if ($Environment -eq "Production") { "wrangler.production.jsonc" } else { "wrangler.jsonc" }
$workerConfig = Join-Path $PSScriptRoot $workerConfigName

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  throw "Provider configuration was not found at '$ConfigPath'. Copy content-engine\automation\config\providers.example.env to providers.local.env and fill in the values."
}

Push-Location (Join-Path $PSScriptRoot "..\..\..")
try {
  npx wrangler secret bulk $ConfigPath --config $workerConfig
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare rejected the provider configuration."
  }
} finally {
  Pop-Location
}
