## 🚀 How to Run

Follow the steps below to run the **FastAPI backend** and **Next.js frontend** locally.

### 📋 Prerequisites

Make sure you have the following installed:

* Python 3.10+
* Node.js 18+
* npm
* Git

The project should be located at:

```text
D:\Downloads\oil_spill_project\oil_spill_project
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/Ayush341-24/Oil_spill_Detection.git
cd Oil_spill_Detection
```

---

## 2. Set Up the Python Virtual Environment

If the virtual environment does not already exist:

### Windows PowerShell

```powershell
python -m venv venv
```

Activate it:

```powershell
.\venv\Scripts\activate
```

Install the required Python dependencies:

```powershell
pip install -r requirements.txt
```

---

# ▶️ Running the Application

The application consists of two main components:

* **Backend** — FastAPI + U-Net oil spill detection model
* **Frontend** — Next.js + OceanX dashboard

You need to run them in **two separate terminals**.

---

## 🖥️ Option 1: Run Using Scripts

### Terminal 1 — Backend

From the project root:

```powershell
.\run_backend.ps1
```

Alternatively, you can double-click:

```text
run_backend.bat
```

The backend will start at:

**Backend API:**
http://127.0.0.1:8000

**Interactive API Documentation:**
http://127.0.0.1:8000/docs

---

### Terminal 2 — Frontend

From the project root:

```powershell
.\run_frontend.ps1
```

Alternatively, you can double-click:

```text
run_frontend.bat
```

The frontend will start at:

**Web Application:**
http://localhost:3000

---

# 🛠️ Option 2: Run Manually

If the provided scripts don't work, you can start each service manually.

## 1. Start the Backend

Open a terminal in the project root:

```text
D:\Downloads\oil_spill_project\oil_spill_project
```

### Activate the virtual environment

```powershell
.\venv\Scripts\activate
```

### Start the FastAPI server

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Or run it directly using the virtual environment's Python executable:

```powershell
.\venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Backend URLs

| Service               | URL                         |
| --------------------- | --------------------------- |
| FastAPI API           | http://127.0.0.1:8000       |
| Swagger Documentation | http://127.0.0.1:8000/docs  |
| ReDoc                 | http://127.0.0.1:8000/redoc |

---

## 2. Start the Frontend

Open a **second terminal** in the project root.

Navigate to the Next.js application:

```powershell
cd oceanx-main\oceanx-main
```

Install frontend dependencies if required:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

The frontend will be available at:

```text
http://localhost:3000
```

---

# 🔐 Demo Login

The application includes a demo account for testing the dashboard.

**Email:**

```text
a.nair@oceanx.gov.in
```

**Password:**

```text
oceanx-demo
```

> ⚠️ This account is intended only for local/demo purposes.

---

# 🧪 Additional Scripts

The repository also contains optional standalone scripts for model testing and evaluation.

## Standalone Detection API

If you want to run the standalone `app.py` API instead of the modular FastAPI backend:

```powershell
.\venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

---

## Evaluate the Model

To evaluate the trained model on the test dataset:

```powershell
.\venv\Scripts\python.exe evaluate.py
```

---

## Run Full Image Comparison

To generate full-image comparisons and visualizations:

```powershell
.\venv\Scripts\python.exe compare_full_image.py
```

---

# 📁 Project Structure

The main project structure is:

```text
Oil_spill_Detection/
│
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── db/
│
├── oceanx-main/
│   └── oceanx-main/
│       ├── app/
│       ├── components/
│       ├── public/
│       ├── package.json
│       └── ...
│
├── run_backend.ps1
├── run_backend.bat
├── run_frontend.ps1
├── run_frontend.bat
├── app.py
├── evaluate.py
├── compare_full_image.py
├── requirements.txt
└── README.md
```

---

# 🔄 Quick Start

Once the project has been configured, you only need **two terminals**.

### Terminal 1 — Backend

```powershell
.\venv\Scripts\activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2 — Frontend

```powershell
cd oceanx-main\oceanx-main
npm run dev
```

Then open:

```text
http://localhost:3000
```

The frontend communicates with the FastAPI backend running on:

```text
http://127.0.0.1:8000
```

---

# ⚠️ Troubleshooting

### `python` is not recognized

Install Python and make sure **Add Python to PATH** is enabled during installation.

Check:

```powershell
python --version
```

---

### `npm` is not recognized

Install Node.js and verify:

```powershell
node --version
npm --version
```

---

### PowerShell blocks `.ps1` scripts

If Windows prevents the script from running, you can use the `.bat` files instead:

```text
run_backend.bat
run_frontend.bat
```

Or run the commands manually using the instructions above.

---

### Port 8000 is already in use

Stop the process using port 8000 or start the backend on another port:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload
```

If you change the backend port, make sure the frontend API configuration is updated accordingly.

---

### Frontend dependencies are missing

Navigate to the frontend directory:

```powershell
cd oceanx-main\oceanx-main
```

Then run:

```powershell
npm install
```

After installation:

```powershell
npm run dev
```

---

## 🌊 Application URLs

| Component           | URL                         |
| ------------------- | --------------------------- |
| 🌊 OceanX Dashboard | http://localhost:3000       |
| ⚡ FastAPI Backend   | http://127.0.0.1:8000       |
| 📚 Swagger API Docs | http://127.0.0.1:8000/docs  |
| 📖 ReDoc            | http://127.0.0.1:8000/redoc |

---

## ✅ Recommended Startup Order

For the smoothest experience:

1. Activate the Python virtual environment.
2. Start the **FastAPI backend**.
3. Wait until the backend is running on port `8000`.
4. Open a second terminal.
5. Start the **Next.js frontend**.
6. Open `http://localhost:3000`.
7. Use the demo credentials to access the dashboard.
