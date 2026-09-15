import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Body
from backend.db import local_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", summary="List all incidents with optional filters")
def list_incidents(
    status: str = Query("all", description="Filter by status ('all', 'active', 'investigating', etc.)"),
    severity: str = Query("all", description="Filter by severity ('all', 'critical', 'high', etc.)"),
    minConfidence: float = Query(0.0, description="Minimum detection confidence (0.0 to 1.0)"),
    search: str = Query("", description="Text search on title, ID, region, suspect vessel name or MMSI")
):
    """
    Returns filtered list of oil spill incidents.
    """
    return local_store.list_incidents(
        status=status,
        severity=severity,
        min_confidence=minConfidence,
        search=search
    )


@router.get("/stats", summary="Get aggregated dashboard incident metrics")
def get_incident_stats():
    """
    Returns high-level statistics for dashboard KPI cards:
    active incidents, critical incidents, vessels under investigation, clean ocean index, etc.
    """
    return local_store.get_incident_stats()


@router.get("/{incident_id}", summary="Get detailed incident by ID")
def get_incident(incident_id: str):
    """
    Returns full details for a single incident, including slick polygon, suspects, and forecast.
    """
    incident = local_store.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return incident


@router.patch("/{incident_id}", summary="Update incident status")
def update_incident(
    incident_id: str,
    payload: dict = Body(...)
):
    """
    Update incident fields (e.g. status: 'contained', 'investigating', 'closed').
    """
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=400, detail="Missing 'status' in request body")

    updated = local_store.update_incident_status(incident_id, new_status)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return updated
