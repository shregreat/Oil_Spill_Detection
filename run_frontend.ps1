# PowerShell script to launch the OceanX Frontend
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting OceanX Oil Spill Frontend (Next.js)..." -ForegroundColor Green
Write-Host "Frontend URL: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Backend API:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\oceanx-main\oceanx-main"
npm run dev
