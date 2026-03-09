$ErrorActionPreference = "SilentlyContinue"

$ports = @(4000, 5500)

function Stop-PortProcess([int]$port) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $conn) {
    Write-Host "No process listening on port $port."
    return
  }

  $processId = $conn.OwningProcess
  if ($processId) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped process $processId on port $port."
  }
}

foreach ($port in $ports) {
  Stop-PortProcess $port
}

Write-Host "KGL services stopped."
