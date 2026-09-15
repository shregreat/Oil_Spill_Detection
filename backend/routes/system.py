import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Body
from backend.db import local_store
from backend.services.model_service import is_model_loaded, get_device

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/data-sources", summary="Get status of external data ingestion feeds")
def get_data_sources():
    """
    Returns operational health and latency for satellite, AIS, and weather data feeds.
    """
    sources = local_store.get_meta("dataSources")
    if sources:
        return sources
    return []


@router.get("/pipeline", summary="Get automated ingestion and processing pipeline queue")
def get_pipeline_queue():
    """
    Returns active worker jobs processing SAR granules and AIS correlation.
    """
    queue = local_store.get_meta("pipelineQueue")
    if queue:
        return queue
    return []


@router.get("/models", summary="Get status and performance metrics of AI/ML models")
def get_models():
    """
    Returns model registry with PyTorch U-Net, Vessel Correlator, and Drift Predictor status.
    Dynamically reflects actual live PyTorch load status and device.
    """
    models = local_store.get_meta("models", [])
    device_str = str(get_device()).upper()
    loaded = is_model_loaded()

    # Update PyTorch U-Net model entry with actual live runtime status
    for m in models:
        if "U-Net" in m.get("name", ""):
            m["status"] = "operational" if loaded else "offline"
            m["device"] = device_str

    return models


@router.get("/users", summary="List system operators and analysts")
def list_users():
    """
    Returns authorized users and RBAC roles.
    """
    return local_store.list_users()


@router.patch("/users/{user_id}", summary="Update user role")
def update_user_role(user_id: str, payload: dict = Body(...)):
    """
    Modify user permission level (e.g. 'analyst', 'operator', 'admin').
    """
    role = payload.get("role")
    if not role:
        raise HTTPException(status_code=400, detail="Missing 'role' in payload")

    user = local_store.update_user_role(user_id, role)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
    return user


@router.get("/analytics", summary="Get 30-day analytics time-series")
def get_analytics():
    """
    Returns detection count trends, vessel correlations, and MTTR metrics.
    """
    analytics = local_store.get_meta("analytics")
    if analytics:
        return analytics
    return {}


@router.get("/analytics/kpis", summary="Get high-level analytics KPIs")
def get_analytics_kpis():
    """
    Returns overall platform performance KPIs (detection rate, mean false alarm rate, etc.).
    """
    kpis = local_store.get_meta("analyticsKpis")
    if kpis:
        return kpis
    return {}
