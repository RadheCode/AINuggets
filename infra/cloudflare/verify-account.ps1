$ErrorActionPreference = "Stop"

$configPath = Join-Path $PSScriptRoot "config.json"
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$identity = & npx --yes wrangler@latest whoami 2>&1 | Out-String
$exitCode = $LASTEXITCODE
Write-Host $identity.TrimEnd()

if ($exitCode -ne 0 -or $identity -match "not authenticated") {
  throw "Cloudflare OAuth is not active. Run infra\cloudflare\login.ps1 first."
}

if ($identity -notmatch [regex]::Escape($config.accountEmail) -or $identity -notmatch [regex]::Escape($config.accountId)) {
  throw "Wrong Cloudflare account. Sign in as $($config.accountEmail) for account $($config.accountId)."
}

Write-Host "Verified configured Cloudflare account: $($config.accountEmail)"
