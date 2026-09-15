@echo off
echo ============================================================
echo Starting OceanX Oil Spill Frontend (Next.js)...
echo Frontend: http://localhost:3000
echo Backend:  http://127.0.0.1:8000
echo ============================================================
cd /d "%~dp0oceanx-main\oceanx-main"
npm run dev
pause
