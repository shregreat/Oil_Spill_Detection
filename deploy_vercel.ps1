# PowerShell script to deploy OceanX Frontend to Vercel
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Deploying OceanX Frontend to Vercel..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

Set-Location "$PSScriptRoot\oceanx-main\oceanx-main"
npx vercel --prod

