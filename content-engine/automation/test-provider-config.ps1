[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "config\providers.local.env")
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Join-Path $PSScriptRoot "..\.."

Push-Location $repositoryRoot
try {
  & node content-engine\automation\cli\test-provider-config.mjs "--config=$ConfigPath"
  if ($LASTEXITCODE -ne 0) {
    throw "Provider configuration check failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}
