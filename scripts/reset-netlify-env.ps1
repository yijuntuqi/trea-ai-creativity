$ErrorActionPreference = 'Stop'

$envFile = '.env'
$lines = Get-Content $envFile
function Get-Env([string]$key) {
  ($lines | Where-Object { $_ -match "^$key=" } | Select-Object -First 1) -replace "^$key=", ''
}

$url = Get-Env 'MAAS_BASE_URL'
$key = Get-Env 'MAAS_API_KEY'

Write-Output "Setting MAAS_BASE_URL = $url"
npx netlify env:set MAAS_BASE_URL $url --force

Write-Output "Setting MAAS_API_KEY (len=$($key.Length))"
$key | npx netlify env:set MAAS_API_KEY --secret --force

Write-Output '--- verifying ---'
npx netlify env:list --json 2>$null | Out-Null
Write-Output 'done, triggering deploy...'

npx netlify deploy --prod
