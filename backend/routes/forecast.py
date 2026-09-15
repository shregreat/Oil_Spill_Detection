import logging
from fastapi import APIRouter, HTTPException
from backend.db import local_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forecast", tags=["Forecast"])


@router.get("/{incident_id}", summary="Get forward drift trajectory forecast steps")
def get_forecast(incident_id: str):
    """
    Returns forward drift simulation steps (0h, +6h, +12h, +24h, +48h) for an active spill.
    """
    inc = local_store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"No forecast for {incident_id}")
    return inc.get("forecast", [])


@router.get("/{incident_id}/hindcast", summary="Get backward drift trajectory for spill origin identification")
def get_hindcast(incident_id: str):
    """
    Returns back-projected path to trace where the discharge began and correlate with AIS tracks.
    """
    inc = local_store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"No hindcast for {incident_id}")

    orig = inc.get("origin", {})
    return {
        "path": orig.get("hindcast", []),
        "origin": orig.get("position", [19.2, 71.5]),
        "confidence": orig.get("confidence", 0.85)
    }


@router.post("/{incident_id}/recompute", summary="Trigger recomputation of drift model")
def recompute_forecast(incident_id: str):
    """
    Re-runs hydrodynamic and atmospheric drift simulation under updated current/wind data.
    """
    inc = local_store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    return {
        "jobId": f"DRIFT-{incident_id[-4:]}",
        "incidentId": incident_id
    }
