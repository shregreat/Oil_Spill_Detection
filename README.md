How To Run -----
Terminal 1 — Backend (FastAPI)
PowerShell:
powershell
.\run_backend.ps1
(Or double-click 

run_backend.bat
 in File Explorer)
Terminal 2 — Frontend (Next.js)
PowerShell:
powershell
.\run_frontend.ps1
(Or double-click 

run_frontend.bat
 in File Explorer)
Option 2: Manual Terminal Commands
Open two terminal windows in the project root (d:\Downloads\oil_spill_project\oil_spill_project):

1. Backend Server (FastAPI / U-Net Model)
Runs the modular API at 

backend/main.py
:

PowerShell / Command Prompt:

powershell
# Activate Python virtual environment
.\venv\Scripts\activate
# Start the FastAPI server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
Or as a single command using the virtual environment directly:

powershell
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
Backend API URL: http://127.0.0.1:8000
Interactive Swagger Docs: http://127.0.0.1:8000/docs
2. Frontend Web App (OceanX Next.js)
Runs the dashboard at 

oceanx-main/oceanx-main
:

PowerShell / Command Prompt:

powershell
cd oceanx-main\oceanx-main
npm run dev
Frontend App URL: http://localhost:3000
Demo Login: Prefilled with a.nair@oceanx.gov.in / oceanx-demo
Additional / Standalone Scripts (Optional)
Standalone single-file detection API (

app.py
):
powershell
.\venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
Evaluate model on test dataset:
powershell
.\venv\Scripts\python.exe evaluate.py
Run full image comparison & visualization:
powershell
.\venv\Scripts\python.exe compare_full_image.py
