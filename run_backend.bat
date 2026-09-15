@echo off
echo ============================================================
echo Starting Oil Spill Detection FastAPI Backend...
echo ============================================================
cd /d "%~dp0"
call "venv\Scripts\activate.bat"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
