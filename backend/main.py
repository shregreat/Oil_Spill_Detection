import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import (
    API_PREFIX,
    CORS_ORIGINS,
    HOST,
    PORT,
    DEBUG
)
from backend.services.model_service import load_model
from backend.routes import (
    health,
    detection,
    history,
    incidents,
    ais,
    alerts,
    satellite,
    weather,
    forecast,
    system,
    auth,
    websocket
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

logger = logging.getLogger(__name__)


# ============================================================
# LIFESPAN (STARTUP / SHUTDOWN)
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML model on startup, cleanup on shutdown."""

    logger.info("Starting Oil Spill Detection Backend...")

    # Load model at startup
    load_model()

    logger.info("Backend ready!")

    yield

    logger.info("Shutting down backend...")


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Oil Spill Detection API",
    description=(
        "Satellite SAR-based oil spill detection backend. "
        "Upload GeoTIFF images to detect oil spills using "
        "a U-Net deep learning model."
    ),
    version="1.0.0",
    lifespan=lifespan
)


# ============================================================
# CORS MIDDLEWARE
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS allowed origins: %s", CORS_ORIGINS)


# ============================================================
# MOUNT ROUTERS
# ============================================================

app.include_router(
    health.router,
    prefix=API_PREFIX
)

app.include_router(
    detection.router,
    prefix=API_PREFIX
)

app.include_router(
    history.router,
    prefix=API_PREFIX
)

app.include_router(
    incidents.router,
    prefix=API_PREFIX
)

app.include_router(
    ais.router,
    prefix=API_PREFIX
)

app.include_router(
    alerts.router,
    prefix=API_PREFIX
)

app.include_router(
    satellite.router,
    prefix=API_PREFIX
)

app.include_router(
    weather.weather_router,
    prefix=API_PREFIX
)

app.include_router(
    weather.ocean_router,
    prefix=API_PREFIX
)

app.include_router(
    forecast.router,
    prefix=API_PREFIX
)

app.include_router(
    system.router,
    prefix=API_PREFIX
)

app.include_router(
    auth.router,
    prefix=API_PREFIX
)

# Mount WebSocket endpoint both at root /ws/stream and /api/v1/ws/stream
app.include_router(
    websocket.router
)
app.include_router(
    websocket.router,
    prefix=API_PREFIX
)


# ============================================================
# ROOT ENDPOINT
# ============================================================

@app.get("/", tags=["Root"])
def root():
    """API root — basic info."""

    return {
        "name": "Oil Spill Detection API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": f"{API_PREFIX}/health"
    }


# ============================================================
# RUN WITH UVICORN
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=HOST,
        port=PORT,
        reload=DEBUG
    )
