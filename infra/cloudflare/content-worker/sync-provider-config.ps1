[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "..\..\..\content-engine\automation\config\providers.local.env")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  throw "Provider configuration was not found at '$ConfigPath'. Copy content-engine\automation\config\providers.example.env to providers.local.env and fill in the values."
}

Push-Location (Join-Path $PSScriptRoot "..\..\..")
try {
  npx wrangler secret bulk $ConfigPath --config infra\cloudflare\content-worker\wrangler.jsonc
  if ($LASTEXITCODE -ne 0) {
    throw "Cloudflare rejected the provider configuration."
  }
} finally {
  Pop-Location
}
