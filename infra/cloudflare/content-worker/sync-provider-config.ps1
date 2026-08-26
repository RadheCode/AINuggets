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

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  throw "Provider configuration was not found at '$ConfigPath'. Copy content-engine\automation\config\providers.example.env to providers.local.env and fill in the values."
}

Push-Location (Join-Path $PSScriptRoot "..\..\..")
$generatedWorkerConfig = Join-Path $PSScriptRoot "wrangler.secret-sync.generated.jsonc"
try {
  & (Join-Path $PSScriptRoot "render-worker-config.ps1") -Environment $Environment -OutputPath $generatedWorkerConfig | Out-Null
  npx wrangler secret bulk $ConfigPath --config $generatedWorkerConfig
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare rejected the provider configuration."
  }
} finally {
  Remove-Item -LiteralPath $generatedWorkerConfig -ErrorAction SilentlyContinue
  Pop-Location
}
