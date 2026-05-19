Write-Host "=== CLE Discipleship Pathway ===" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start server
$serverJob = Start-Job -ScriptBlock {
  Set-Location $using:root\server
  node src/seed.js
  Write-Host "Server starting on http://localhost:4000" -ForegroundColor Green
  node src/index.js
}

Start-Sleep -Seconds 2

# Start client dev server
$clientJob = Start-Job -ScriptBlock {
  Set-Location $using:root\client
  npx vite --host
}

Write-Host "Server: http://localhost:4000" -ForegroundColor Green
Write-Host "Client: http://localhost:3000" -ForegroundColor Green
Write-Host "Admin login: admin@clechurch.org / admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray

try {
  while ($true) {
    Start-Sleep -Seconds 1
    Receive-Job $serverJob -ErrorAction SilentlyContinue
    Receive-Job $clientJob -ErrorAction SilentlyContinue
  }
} finally {
  Stop-Job $serverJob -ErrorAction SilentlyContinue
  Stop-Job $clientJob -ErrorAction SilentlyContinue
  Remove-Job $serverJob -ErrorAction SilentlyContinue
  Remove-Job $clientJob -ErrorAction SilentlyContinue
}
