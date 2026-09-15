# PowerShell script to launch the Oil Spill Detection Backend
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting Oil Spill Detection FastAPI Backend..." -ForegroundColor Green
Write-Host "API URL:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "Swagger:  http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot
& ".\venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
