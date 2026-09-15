import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.models.schemas import (
    ScanResponse,
    ScanListResponse,
    StatsResponse,
    DeleteResponse,
    DetectionResult,
)
from backend.db import supabase_client, local_store


logger = logging.getLogger(__name__)

router = APIRouter(tags=["History"])


def _get_store():
    """Return supabase_client if configured, otherwise local_store fallback."""
    if supabase_client.is_supabase_configured():
        return supabase_client
    return local_store


# ============================================================
# GET /scans
# ============================================================

@router.get(
    "/scans",
    response_model=ScanListResponse,
    summary="List all scans"
)
def list_all_scans(
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
        description="Number of scans to return"
    ),
    offset: int = Query(
        default=0,
        ge=0,
        description="Offset for pagination"
    )
):
    """
    Returns a paginated list of all scans,
    ordered by scan date (newest first).
    """

    store = _get_store()

    scans_data = store.list_scans(
        limit=limit,
        offset=offset
    )

    total = store.count_scans()

    scans = [
        ScanResponse(**scan)
        for scan in scans_data
    ]

    return ScanListResponse(
        scans=scans,
        total=total,
        limit=limit,
        offset=offset
    )


# ============================================================
# GET /scans/{scan_id}
# ============================================================

@router.get(
    "/scans/{scan_id}",
    response_model=ScanResponse,
    summary="Get scan details"
)
def get_scan_details(scan_id: str):
    """
    Returns full details for a scan, including
    all associated detection results.
    """

    store = _get_store()
    scan_data = store.get_scan(scan_id)

    if scan_data is None:
        raise HTTPException(
            status_code=404,
            detail=f"Scan {scan_id} not found"
        )

    # Get detections
    detections_data = store.get_detections_for_scan(
        scan_id
    )

    detections = [
        DetectionResult(**d)
        for d in detections_data
    ]

    return ScanResponse(
        **scan_data,
        detections=detections
    )


# ============================================================
# DELETE /scans/{scan_id}
# ============================================================

@router.delete(
    "/scans/{scan_id}",
    response_model=DeleteResponse,
    summary="Delete a scan"
)
def delete_scan_endpoint(scan_id: str):
    """
    Delete a scan and all its associated detections.
    """

    store = _get_store()
    scan_data = store.get_scan(scan_id)

    if scan_data is None:
        raise HTTPException(
            status_code=404,
            detail=f"Scan {scan_id} not found"
        )

    deleted = store.delete_scan(scan_id)

    if not deleted:
        raise HTTPException(
            status_code=500,
            detail="Failed to delete scan"
        )

    return DeleteResponse(
        success=True,
        message=f"Scan {scan_id} deleted successfully"
    )


# ============================================================
# GET /stats
# ============================================================

@router.get(
    "/stats",
    response_model=StatsResponse,
    summary="Dashboard statistics"
)
def get_dashboard_stats():
    """
    Returns aggregate statistics for the dashboard:
    total scans, detection rate, total spill area, etc.
    """

    store = _get_store()
    stats = store.get_stats()

    return StatsResponse(**stats)
