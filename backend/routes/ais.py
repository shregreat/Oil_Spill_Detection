import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from backend.db import local_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ais", tags=["AIS"])


@router.get("/vessels", summary="List marine vessels in coverage area")
def list_vessels(
    search: str = Query("", description="Search by vessel name, MMSI, IMO, callsign, or operator"),
    types: Optional[List[str]] = Query(None, description="Filter by vessel types (e.g. Tanker, Cargo)"),
    minSpeedKn: float = Query(0.0, description="Minimum speed in knots"),
    maxSpeedKn: float = Query(40.0, description="Maximum speed in knots"),
    flag: str = Query("all", description="Flag state or 'all'"),
    onlyMoving: bool = Query(False, description="Exclude stationary vessels (speed < 0.5 kn)")
):
    """
    Returns live positions and metadata for vessels tracked in the surveillance corridor.
    """
    return local_store.list_vessels(
        types=types,
        min_speed=minSpeedKn,
        max_speed=maxSpeedKn,
        flag=flag,
        only_moving=onlyMoving,
        search=search
    )


@router.get("/vessels/{mmsi}", summary="Get vessel details by MMSI")
def get_vessel(mmsi: str):
    """
    Returns single vessel profile and technical specifications.
    """
    vessel = local_store.get_vessel(mmsi)
    if not vessel:
        raise HTTPException(status_code=404, detail=f"Vessel {mmsi} not found")
    return vessel


@router.get("/vessels/{mmsi}/track", summary="Get historical GPS track for vessel")
def get_vessel_track(mmsi: str):
    """
    Returns historical GPS breadcrumbs track used to correlate with slick locations.
    """
    track = local_store.get_vessel_track(mmsi)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track for vessel {mmsi} not found")
    return track
