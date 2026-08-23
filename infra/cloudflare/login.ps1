$ErrorActionPreference = "Stop"

Write-Host "Opening Cloudflare OAuth authorization..."
& npx --yes wrangler@latest login
if ($LASTEXITCODE -ne 0) {
  throw "Cloudflare OAuth login failed."
}

& (Join-Path $PSScriptRoot "verify-account.ps1")
