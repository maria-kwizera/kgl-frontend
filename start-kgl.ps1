$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "kgl-backend"
$frontendDir = Join-Path $repoRoot "kgl-frontend"

if (-not (Test-Path $backendDir)) {
  Write-Host "Backend folder not found: $backendDir"
  Write-Host "Ensure you are running this script from the repo's kgl-frontend folder."
  exit 1
}

if (-not (Test-Path $frontendDir)) {
  Write-Host "Frontend folder not found: $frontendDir"
  Write-Host "Ensure you are running this script from the repo's kgl-frontend folder."
  exit 1
}
$backendPort = 4000
$frontendPort = 5500

function Get-PortProcessId([int]$port) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) { return $conn.OwningProcess }
  return $null
}

Write-Host "Starting KGL backend..."
if (-not (Get-PortProcessId $backendPort)) {
  Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command cd '$backendDir'; npm run dev"
} else {
  Write-Host "Backend already running on port $backendPort."
}

Write-Host "Starting KGL frontend..."
if (-not (Get-PortProcessId $frontendPort)) {
  Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command cd '$frontendDir'; npx serve . -l $frontendPort"
} else {
  Write-Host "Frontend already running on port $frontendPort."
}

Start-Sleep -Seconds 3

try {
  $health = Invoke-RestMethod -Uri "http://localhost:$backendPort/health" -Method Get
  if ($health.ok -eq $true) {
    Write-Host "Backend OK: http://localhost:$backendPort/health"
  } else {
    Write-Host "Backend started but health check response was unexpected."
  }
} catch {
  Write-Host "Backend health check failed. Ensure MongoDB is running."
}

Write-Host "Frontend URL: http://localhost:$frontendPort/pages/login.html"
Write-Host "Done."
