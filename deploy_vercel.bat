@echo off
echo ============================================================
echo Deploying OceanX Frontend to Vercel...
echo ============================================================
cd /d "%~dp0oceanx-main\oceanx-main"
npx vercel --prod
pause
