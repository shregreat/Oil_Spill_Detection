import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.db import local_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", summary="List alerts with optional severity and status filters")
def list_alerts(
    severity: str = Query("all", description="Filter by severity ('all', 'critical', 'high', etc.)"),
    type: str = Query("all", description="Filter by alert type ('all', 'new_spill', 'rapid_spread', etc.)"),
    onlyUnacknowledged: bool = Query(False, description="Filter for unread/unacknowledged alerts only"),
    search: str = Query("", description="Search alert title or message")
):
    """
    Returns maritime alerts and anomaly notifications.
    """
    return local_store.list_alerts(
        severity=severity,
        alert_type=type,
        only_unacknowledged=onlyUnacknowledged,
        search=search
    )


@router.post("/{alert_id}/acknowledge", summary="Acknowledge single alert")
def acknowledge_alert(alert_id: str):
    """
    Mark an individual alert as acknowledged.
    """
    alert = local_store.acknowledge_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return alert


@router.post("/acknowledge-all", summary="Bulk acknowledge all unacknowledged alerts")
def acknowledge_all():
    """
    Mark all unacknowledged alerts as acknowledged.
    """
    return local_store.acknowledge_all_alerts()
