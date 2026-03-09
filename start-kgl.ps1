$ErrorActionPreference = "Stop"

$backendDir = "C:\Users\USER\Desktop\kgl-backend"
$frontendDir = "C:\Users\USER\Desktop\kgl-frontend"
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
