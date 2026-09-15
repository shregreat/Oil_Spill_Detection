import os
import sys
from pathlib import Path

from dotenv import load_dotenv


# ============================================================
# ENVIRONMENT SANITIZATION
# ============================================================

# Point PROJ and GDAL to rasterio bundled data to prevent conflicts with external PostgreSQL / PostGIS
try:
    import rasterio
    rasterio_dir = Path(rasterio.__file__).resolve().parent
    proj_dir = rasterio_dir / "proj_data"
    gdal_dir = rasterio_dir / "gdal_data"
    if proj_dir.exists():
        os.environ["PROJ_DATA"] = str(proj_dir)
        os.environ["PROJ_LIB"] = str(proj_dir)
    if gdal_dir.exists():
        os.environ["GDAL_DATA"] = str(gdal_dir)
except Exception:
    pass

for env_var in ("PROJ_LIB", "GDAL_DATA", "PROJ_DATA"):
    val = os.environ.get(env_var, "")
    if "PostgreSQL" in val or (val and not os.path.exists(val)):
        os.environ.pop(env_var, None)

# ============================================================
# LOAD .env FILE
# ============================================================

# Backend directory (where this file lives)
BACKEND_DIR = Path(__file__).resolve().parent

# Project root (parent of backend/)
PROJECT_ROOT = BACKEND_DIR.parent

# Load .env from backend directory
load_dotenv(BACKEND_DIR / ".env")

# Add project root to sys.path so we can import unet.py
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


# ============================================================
# SUPABASE CONFIGURATION
# ============================================================

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "sar-uploads")


# ============================================================
# MODEL CONFIGURATION
# ============================================================

MODEL_PATH: str = str(
    PROJECT_ROOT / os.getenv("MODEL_PATH", "best_oil_spill_unet.pth")
)

PATCH_SIZE: int = 256
STRIDE: int = int(os.getenv("STRIDE", "128"))

# Final tuned threshold (from clean_threshold_analysis.py)
THRESHOLD: float = float(os.getenv("THRESHOLD", "0.4"))

# Minimum connected-component area to keep (pixels)
MIN_AREA_PIXELS: int = int(os.getenv("MIN_AREA_PIXELS", "100"))


# ============================================================
# API CONFIGURATION
# ============================================================

API_VERSION: str = "v1"
API_PREFIX: str = f"/api/{API_VERSION}"

# Maximum upload file size (50 MB)
MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024

# Directory containing sample SAR radar test images
SAMPLES_DIR: Path = PROJECT_ROOT / "Radar_data" / "test" / "images"

# CORS origins (comma-separated in .env)
CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080"
    ).split(",")
]


# ============================================================
# SERVER CONFIGURATION
# ============================================================

HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
