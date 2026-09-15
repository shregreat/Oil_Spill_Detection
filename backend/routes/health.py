from fastapi import APIRouter

from backend.models.schemas import HealthResponse
from backend.services.model_service import is_model_loaded, get_device
from backend.db.supabase_client import is_supabase_configured


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(tags=["Health"])


# ============================================================
# HEALTH CHECK
# ============================================================

from backend.config import THRESHOLD, MIN_AREA_PIXELS


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check"
)
def health_check():
    """
    Returns the health status of the backend,
    including model and database connectivity.
    """

    device = str(get_device()) if is_model_loaded() else "not loaded"

    return HealthResponse(
        status="healthy",
        model_loaded=is_model_loaded(),
        supabase_connected=is_supabase_configured(),
        device=device,
        version="1.0.0",
        model_name="PyTorch U-Net (Oil Spill Detector)",
        threshold=THRESHOLD,
        min_area_pixels=MIN_AREA_PIXELS
    )
